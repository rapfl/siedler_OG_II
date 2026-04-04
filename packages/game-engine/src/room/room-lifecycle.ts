import type {
  MatchPostgameSummary,
  MatchState,
  PlayerColor,
  PlayerCount,
  RoomPlayer,
  RoomStartBlocker,
  RoomState,
} from "../../../shared-types/src/index.js";

const MIN_PLAYERS: PlayerCount = 3;
const DEFAULT_MAX_PLAYERS: PlayerCount = 4;
const DEFAULT_DISCONNECT_GRACE_MS = 2 * 60 * 1000;

export const PLAYER_COLORS = ["red", "blue", "white", "orange"] as const satisfies readonly PlayerColor[];

export type RoomLifecycleErrorCode =
  | "PLAYER_ALREADY_JOINED"
  | "PLAYER_NOT_FOUND"
  | "ROOM_CLOSED"
  | "ROOM_FULL"
  | "ROOM_NOT_JOINABLE"
  | "ROOM_NOT_STARTABLE"
  | "NOT_HOST"
  | "INVALID_READY_STATE"
  | "SEAT_TAKEN"
  | "COLOR_TAKEN"
  | "CANNOT_REATTACH";

export class RoomLifecycleError extends Error {
  constructor(
    public readonly code: RoomLifecycleErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "RoomLifecycleError";
  }
}

export interface LifecycleContext {
  now: string;
  roomIdFactory: () => string;
  roomCodeFactory: () => string;
  matchIdFactory: () => string;
  matchSeedFactory: () => string;
  disconnectGraceMs?: number;
}

export interface CreateRoomInput {
  host: {
    playerId: string;
    displayName: string;
    sessionId: string;
  };
  maxPlayers?: PlayerCount;
}

export interface JoinRoomInput {
  player: {
    playerId: string;
    displayName: string;
    sessionId: string;
  };
}

export interface ReassignSeatInput {
  hostPlayerId: string;
  targetPlayerId: string;
  seatIndex: number;
}

export interface ReassignColorInput {
  hostPlayerId: string;
  targetPlayerId: string;
  color: PlayerColor;
}

export interface StartMatchResult {
  room: RoomState;
  match: MatchState;
}

export interface FinishMatchInput {
  summary: MatchPostgameSummary;
}

export function createRoom(context: LifecycleContext, input: CreateRoomInput): RoomState {
  const createdAt = context.now;
  const hostPlayer = buildRoomPlayer(input.host, 0, "red", context.now);

  return {
    roomId: context.roomIdFactory(),
    roomCode: context.roomCodeFactory(),
    hostPlayerId: input.host.playerId,
    maxPlayers: input.maxPlayers ?? DEFAULT_MAX_PLAYERS,
    status: "room_open_prematch",
    players: [hostPlayer],
    createdAt,
    updatedAt: createdAt,
    version: 1,
  };
}

export function joinRoom(room: RoomState, context: LifecycleContext, input: JoinRoomInput): RoomState {
  ensureRoomJoinable(room);

  if (room.players.some((player) => player.playerId === input.player.playerId)) {
    throw new RoomLifecycleError("PLAYER_ALREADY_JOINED", "Player has already joined this room.");
  }

  if (room.players.length >= room.maxPlayers) {
    throw new RoomLifecycleError("ROOM_FULL", "Room has reached maximum capacity.");
  }

  const occupiedSeats = new Set(room.players.map((player) => player.seatIndex));
  const occupiedColors = new Set(room.players.map((player) => player.color));

  const seatIndex = findFirstAvailableSeat(occupiedSeats, room.maxPlayers);
  const color = PLAYER_COLORS.find((candidate) => !occupiedColors.has(candidate));

  if (color === undefined) {
    throw new RoomLifecycleError("ROOM_FULL", "No color slots available.");
  }

  return updateRoom(room, context.now, {
    players: [...room.players, buildRoomPlayer(input.player, seatIndex, color, context.now)],
  });
}

export function toggleReady(
  room: RoomState,
  context: LifecycleContext,
  playerId: string,
  ready: boolean,
): RoomState {
  ensureReadyMutable(room);
  assertPlayer(room, playerId);

  return updateRoom(room, context.now, {
    players: room.players.map((player) =>
      player.playerId === playerId
        ? {
            ...player,
            ready,
          }
        : player,
    ),
  });
}

export function reassignSeat(room: RoomState, context: LifecycleContext, input: ReassignSeatInput): RoomState {
  ensureHostEditable(room, input.hostPlayerId);
  assertPlayer(room, input.targetPlayerId);

  const seatTakenByOther = room.players.some(
    (player) => player.playerId !== input.targetPlayerId && player.seatIndex === input.seatIndex,
  );
  if (seatTakenByOther) {
    throw new RoomLifecycleError("SEAT_TAKEN", "Selected seat is already occupied.");
  }

  return updateRoom(room, context.now, {
    players: room.players.map((player) =>
      player.playerId === input.targetPlayerId
        ? {
            ...player,
            seatIndex: input.seatIndex,
          }
        : player,
    ),
  });
}

export function reassignColor(room: RoomState, context: LifecycleContext, input: ReassignColorInput): RoomState {
  ensureHostEditable(room, input.hostPlayerId);
  assertPlayer(room, input.targetPlayerId);

  const colorTakenByOther = room.players.some(
    (player) => player.playerId !== input.targetPlayerId && player.color === input.color,
  );
  if (colorTakenByOther) {
    throw new RoomLifecycleError("COLOR_TAKEN", "Selected color is already occupied.");
  }

  return updateRoom(room, context.now, {
    players: room.players.map((player) =>
      player.playerId === input.targetPlayerId
        ? {
            ...player,
            color: input.color,
          }
        : player,
    ),
  });
}

export function disconnectPlayer(room: RoomState, context: LifecycleContext, playerId: string): RoomState {
  assertPlayer(room, playerId);
  const graceUntil = new Date(Date.parse(context.now) + resolveDisconnectGraceMs(context)).toISOString();

  return updateRoom(room, context.now, {
    players: room.players.map((player) =>
      player.playerId === playerId
        ? {
            ...player,
            presence: "disconnected_grace",
            disconnectedAt: context.now,
            graceUntil,
          }
        : player,
    ),
  });
}

export function reattachPlayer(
  room: RoomState,
  context: LifecycleContext,
  playerId: string,
  sessionId: string,
): RoomState {
  const player = assertPlayer(room, playerId);

  if (player.presence === "explicitly_left") {
    throw new RoomLifecycleError(
      "CANNOT_REATTACH",
      "Player explicitly left and cannot be reattached automatically.",
    );
  }

  if (
    player.presence === "expired" &&
    (room.status === "room_open_prematch" || room.status === "room_postgame")
  ) {
    throw new RoomLifecycleError("CANNOT_REATTACH", "Seat reservation has expired and requires a fresh join.");
  }

  return updateRoom(room, context.now, {
    players: room.players.map((entry) =>
      entry.playerId === playerId
        ? {
            ...entry,
            sessionId,
            presence: "connected",
            disconnectedAt: undefined,
            graceUntil: undefined,
          }
        : entry,
    ),
  });
}

export function expireDisconnectedPlayer(room: RoomState, context: LifecycleContext, playerId: string): RoomState {
  const player = assertPlayer(room, playerId);

  if (player.presence !== "disconnected_grace") {
    return room;
  }

  if (player.graceUntil !== undefined && Date.parse(player.graceUntil) > Date.parse(context.now)) {
    return room;
  }

  if (room.status === "room_match_starting" || room.status === "room_match_in_progress") {
    return room;
  }

  return removePlayer(room, context, playerId);
}

export function leaveRoom(room: RoomState, context: LifecycleContext, playerId: string): RoomState {
  assertPlayer(room, playerId);

  if (room.status === "room_open_prematch" || room.status === "room_postgame") {
    return removePlayer(room, context, playerId);
  }

  return updateRoom(room, context.now, {
    hostPlayerId: reassignHostId(room, playerId),
    players: room.players.map((player) =>
      player.playerId === playerId
        ? {
            ...player,
            ready: false,
            presence: "explicitly_left",
            explicitlyLeftAt: context.now,
            disconnectedAt: context.now,
          }
        : player,
    ),
  });
}

export function startMatch(room: RoomState, context: LifecycleContext, requestingPlayerId: string): StartMatchResult {
  if (room.hostPlayerId !== requestingPlayerId) {
    throw new RoomLifecycleError("NOT_HOST", "Only the host can start the match.");
  }

  const blockers = getStartMatchBlockers(room);
  if (blockers.length > 0) {
    throw new RoomLifecycleError(
      "ROOM_NOT_STARTABLE",
      "Match requires a startable room with 3-4 players and every occupied seat ready.",
    );
  }

  const playerOrder = [...room.players].sort((left, right) => left.seatIndex - right.seatIndex).map((player) => player.playerId);

  const match: MatchState = {
    matchId: context.matchIdFactory(),
    roomId: room.roomId,
    status: "match_initializing",
    createdAt: context.now,
    seed: context.matchSeedFactory(),
    playerOrder,
    version: 1,
  };

  return {
    room: updateRoom(room, context.now, {
      status: "room_match_starting",
      currentMatchId: match.matchId,
      postgameSummary: undefined,
    }),
    match,
  };
}

export function markMatchInProgress(room: RoomState, context: LifecycleContext, matchId: string): RoomState {
  if (room.currentMatchId !== matchId) {
    throw new RoomLifecycleError("ROOM_NOT_STARTABLE", "Cannot activate a match that is not attached to the room.");
  }

  return updateRoom(room, context.now, {
    status: "room_match_in_progress",
  });
}

export function finishMatch(room: RoomState, context: LifecycleContext, input: FinishMatchInput): RoomState {
  return updateRoom(room, context.now, {
    status: "room_postgame",
    currentMatchId: undefined,
    lastCompletedMatchId: input.summary.matchId,
    postgameSummary: input.summary,
    players: room.players.map((player) => ({
      ...player,
      ready: false,
    })),
  });
}

export function closeRoom(room: RoomState, context: LifecycleContext): RoomState {
  return updateRoom(room, context.now, {
    status: "room_closed",
  });
}

export function canStartMatch(room: RoomState): boolean {
  return getStartMatchBlockers(room).length === 0;
}

export function getStartMatchBlockers(room: RoomState): RoomStartBlocker[] {
  const blockers: RoomStartBlocker[] = [];

  if (room.status !== "room_open_prematch" && room.status !== "room_postgame") {
    blockers.push("ROOM_NOT_OPEN");
  }

  if (room.players.length < MIN_PLAYERS) {
    blockers.push("MIN_PLAYERS");
  }

  if (room.players.some((player) => !player.ready)) {
    blockers.push("UNREADY_PLAYERS");
  }

  return blockers;
}

function buildRoomPlayer(
  player: CreateRoomInput["host"] | JoinRoomInput["player"],
  seatIndex: number,
  color: PlayerColor,
  now: string,
): RoomPlayer {
  return {
    playerId: player.playerId,
    displayName: player.displayName,
    sessionId: player.sessionId,
    seatIndex,
    color,
    ready: false,
    presence: "connected",
    joinedAt: now,
  };
}

function assertPlayer(room: RoomState, playerId: string): RoomPlayer {
  const player = room.players.find((candidate) => candidate.playerId === playerId);
  if (!player) {
    throw new RoomLifecycleError("PLAYER_NOT_FOUND", "Cannot update an unknown player.");
  }

  return player;
}

function ensureReadyMutable(room: RoomState): void {
  if (room.status !== "room_open_prematch" && room.status !== "room_postgame") {
    throw new RoomLifecycleError("INVALID_READY_STATE", "Ready state can only change in prematch or postgame.");
  }
}

function ensureHostEditable(room: RoomState, hostPlayerId: string): void {
  if (room.hostPlayerId !== hostPlayerId) {
    throw new RoomLifecycleError("NOT_HOST", "Only the host can edit seats or colors before match start.");
  }

  ensureReadyMutable(room);
}

function ensureRoomJoinable(room: RoomState): void {
  if (room.status === "room_closed") {
    throw new RoomLifecycleError("ROOM_CLOSED", "Room is closed.");
  }

  if (room.status !== "room_open_prematch" && room.status !== "room_postgame") {
    throw new RoomLifecycleError("ROOM_NOT_JOINABLE", "Room is not joinable while a match is starting or in progress.");
  }
}

function findFirstAvailableSeat(occupiedSeats: Set<number>, maxPlayers: PlayerCount): number {
  for (let seatIndex = 0; seatIndex < maxPlayers; seatIndex += 1) {
    if (!occupiedSeats.has(seatIndex)) {
      return seatIndex;
    }
  }

  throw new RoomLifecycleError("ROOM_FULL", "No seat slots available.");
}

function reassignHostId(room: RoomState, removedPlayerId: string): string {
  if (room.hostPlayerId !== removedPlayerId) {
    return room.hostPlayerId;
  }

  const nextHost = room.players
    .filter((player) => player.playerId !== removedPlayerId && player.presence !== "explicitly_left")
    .sort((left, right) => left.joinedAt.localeCompare(right.joinedAt))[0];

  return nextHost?.playerId ?? room.hostPlayerId;
}

function removePlayer(room: RoomState, context: LifecycleContext, playerId: string): RoomState {
  const nextPlayers = room.players.filter((player) => player.playerId !== playerId);

  if (nextPlayers.length === 0) {
    return updateRoom(room, context.now, {
      status: "room_closed",
      hostPlayerId: room.hostPlayerId,
      players: [],
    });
  }

  return updateRoom(room, context.now, {
    hostPlayerId: reassignHostId(room, playerId),
    players: nextPlayers,
  });
}

function resolveDisconnectGraceMs(context: LifecycleContext): number {
  return context.disconnectGraceMs ?? DEFAULT_DISCONNECT_GRACE_MS;
}

function updateRoom(room: RoomState, now: string, patch: Partial<RoomState>): RoomState {
  return {
    ...room,
    ...patch,
    updatedAt: now,
    version: room.version + 1,
  };
}
