import {
  createRoom,
  disconnectPlayer,
  joinRoom,
  leaveRoom,
  projectRoomView,
  reassignColor,
  reassignSeat,
  reattachPlayer,
  startMatch,
  toggleReady,
} from "../../../packages/game-engine/src/index.js";
import type {
  CommandAcceptedMessage,
  LifecycleTransitionMessage,
  MatchSnapshotMessage,
  MatchState,
  PlayerColor,
  PlayerCount,
  PresenceUpdatedMessage,
  RoomSnapshotMessage,
  RoomState,
  RoomUpdatedMessage,
  ServerMessage,
  SessionAttachedMessage,
} from "../../../packages/shared-types/src/index.js";

interface SessionBinding {
  sessionId: string;
  playerId: string;
  roomId: string;
}

export interface RealtimeDispatch {
  sessionId: string;
  message: ServerMessage;
}

export interface RealtimeCommandResult {
  room: RoomState;
  match?: MatchState | undefined;
  dispatches: RealtimeDispatch[];
}

export interface InMemoryRealtimeServiceOptions {
  nowFactory?: () => string;
  roomIdFactory?: () => string;
  roomCodeFactory?: () => string;
  matchIdFactory?: () => string;
  matchSeedFactory?: () => string;
  disconnectGraceMs?: number;
}

export class InMemoryRealtimeService {
  private readonly rooms = new Map<string, RoomState>();
  private readonly roomCodes = new Map<string, string>();
  private readonly matches = new Map<string, MatchState>();
  private readonly sessions = new Map<string, SessionBinding>();
  private roomCounter = 0;
  private roomCodeCounter = 1000;
  private matchCounter = 0;
  private seedCounter = 0;

  constructor(private readonly options: InMemoryRealtimeServiceOptions = {}) {}

  createRoom(input: {
    commandId: string;
    sessionId: string;
    playerId: string;
    displayName: string;
    maxPlayers?: PlayerCount;
  }): RealtimeCommandResult {
    const room = createRoom(this.lifecycleContext(), {
      host: {
        playerId: input.playerId,
        displayName: input.displayName,
        sessionId: input.sessionId,
      },
      ...(input.maxPlayers === undefined
        ? {}
        : {
            maxPlayers: input.maxPlayers,
          }),
    });

    this.storeRoom(room);
    this.sessions.set(input.sessionId, {
      sessionId: input.sessionId,
      playerId: input.playerId,
      roomId: room.roomId,
    });

    return {
      room,
      dispatches: [
        {
          sessionId: input.sessionId,
          message: this.sessionAttached(input.sessionId, input.playerId, "resume_room_only"),
        },
        {
          sessionId: input.sessionId,
          message: this.commandAccepted(input.commandId, input.sessionId, room.version, "room_created"),
        },
        {
          sessionId: input.sessionId,
          message: this.roomSnapshot(room, input.sessionId, input.playerId),
        },
      ],
    };
  }

  joinRoom(input: {
    commandId: string;
    sessionId: string;
    playerId: string;
    displayName: string;
    roomCode: string;
  }): RealtimeCommandResult {
    const room = this.requireRoomByCode(input.roomCode);
    const nextRoom = joinRoom(room, this.lifecycleContext(), {
      player: {
        playerId: input.playerId,
        displayName: input.displayName,
        sessionId: input.sessionId,
      },
    });

    this.storeRoom(nextRoom);
    this.sessions.set(input.sessionId, {
      sessionId: input.sessionId,
      playerId: input.playerId,
      roomId: nextRoom.roomId,
    });

    const dispatches = [
      {
        sessionId: input.sessionId,
        message: this.sessionAttached(input.sessionId, input.playerId, "resume_room_only"),
      },
      {
        sessionId: input.sessionId,
        message: this.commandAccepted(input.commandId, input.sessionId, nextRoom.version, "room_joined"),
      },
      {
        sessionId: input.sessionId,
        message: this.roomSnapshot(nextRoom, input.sessionId, input.playerId),
      },
      ...this.broadcastRoomUpdated(nextRoom),
    ];

    return {
      room: nextRoom,
      dispatches,
    };
  }

  toggleReady(input: { commandId: string; sessionId: string; ready: boolean }): RealtimeCommandResult {
    const binding = this.requireSession(input.sessionId);
    const room = this.requireRoom(binding.roomId);
    const nextRoom = toggleReady(room, this.lifecycleContext(), binding.playerId, input.ready);

    this.storeRoom(nextRoom);

    return {
      room: nextRoom,
      dispatches: [
        {
          sessionId: input.sessionId,
          message: this.commandAccepted(input.commandId, input.sessionId, nextRoom.version, "ready_toggled"),
        },
        ...this.broadcastRoomUpdated(nextRoom),
      ],
    };
  }

  reassignSeat(input: { commandId: string; sessionId: string; targetPlayerId: string; seatIndex: number }): RealtimeCommandResult {
    const binding = this.requireSession(input.sessionId);
    const room = this.requireRoom(binding.roomId);
    const nextRoom = reassignSeat(room, this.lifecycleContext(), {
      hostPlayerId: binding.playerId,
      targetPlayerId: input.targetPlayerId,
      seatIndex: input.seatIndex,
    });

    this.storeRoom(nextRoom);

    return {
      room: nextRoom,
      dispatches: [
        {
          sessionId: input.sessionId,
          message: this.commandAccepted(input.commandId, input.sessionId, nextRoom.version, "seat_reassigned"),
        },
        ...this.broadcastRoomUpdated(nextRoom),
      ],
    };
  }

  reassignColor(input: { commandId: string; sessionId: string; targetPlayerId: string; color: PlayerColor }): RealtimeCommandResult {
    const binding = this.requireSession(input.sessionId);
    const room = this.requireRoom(binding.roomId);
    const nextRoom = reassignColor(room, this.lifecycleContext(), {
      hostPlayerId: binding.playerId,
      targetPlayerId: input.targetPlayerId,
      color: input.color,
    });

    this.storeRoom(nextRoom);

    return {
      room: nextRoom,
      dispatches: [
        {
          sessionId: input.sessionId,
          message: this.commandAccepted(input.commandId, input.sessionId, nextRoom.version, "color_reassigned"),
        },
        ...this.broadcastRoomUpdated(nextRoom),
      ],
    };
  }

  startMatch(input: { commandId: string; sessionId: string }): RealtimeCommandResult {
    const binding = this.requireSession(input.sessionId);
    const room = this.requireRoom(binding.roomId);
    const { room: nextRoom, match } = startMatch(room, this.lifecycleContext(), binding.playerId);

    this.storeRoom(nextRoom);
    this.matches.set(match.matchId, match);

    const dispatches = [
      {
        sessionId: input.sessionId,
        message: this.commandAccepted(input.commandId, input.sessionId, nextRoom.version, "match_start_requested"),
      },
      ...this.broadcastLifecycleTransition(nextRoom, room.status, nextRoom.status, match.matchId),
      ...this.broadcastRoomUpdated(nextRoom),
      ...this.broadcastMatchSnapshot(nextRoom, match),
    ];

    return {
      room: nextRoom,
      match,
      dispatches,
    };
  }

  disconnectSession(sessionId: string): RealtimeCommandResult {
    const binding = this.requireSession(sessionId);
    const room = this.requireRoom(binding.roomId);
    const nextRoom = disconnectPlayer(room, this.lifecycleContext(), binding.playerId);

    this.storeRoom(nextRoom);

    return {
      room: nextRoom,
      dispatches: [
        ...this.broadcastPresence(nextRoom, binding.playerId),
        ...this.broadcastRoomUpdated(nextRoom, sessionId),
      ],
    };
  }

  leaveRoom(input: { commandId: string; sessionId: string }): RealtimeCommandResult {
    const binding = this.requireSession(input.sessionId);
    const room = this.requireRoom(binding.roomId);
    const nextRoom = leaveRoom(room, this.lifecycleContext(), binding.playerId);

    this.storeRoom(nextRoom);

    if (!nextRoom.players.some((player) => player.playerId === binding.playerId)) {
      this.sessions.delete(input.sessionId);
    }

    return {
      room: nextRoom,
      dispatches: [
        {
          sessionId: input.sessionId,
          message: this.commandAccepted(input.commandId, input.sessionId, nextRoom.version, "room_left"),
        },
        ...this.broadcastRoomUpdated(nextRoom, input.sessionId),
      ],
    };
  }

  reattachSession(input: { sessionId: string }): RealtimeCommandResult {
    const binding = this.requireSession(input.sessionId);
    const room = this.requireRoom(binding.roomId);
    const nextRoom = reattachPlayer(room, this.lifecycleContext(), binding.playerId, input.sessionId);

    this.storeRoom(nextRoom);

    const match = nextRoom.currentMatchId ? this.matches.get(nextRoom.currentMatchId) : undefined;
    const resumeContext =
      nextRoom.status === "room_postgame"
        ? "resume_postgame"
        : match === undefined
          ? "resume_room_only"
          : "resume_room_and_match";

    const dispatches: RealtimeDispatch[] = [
      {
        sessionId: input.sessionId,
        message: this.sessionAttached(input.sessionId, binding.playerId, resumeContext),
      },
      {
        sessionId: input.sessionId,
        message: this.roomSnapshot(nextRoom, input.sessionId, binding.playerId),
      },
      ...this.broadcastPresence(nextRoom, binding.playerId),
      ...this.broadcastRoomUpdated(nextRoom),
    ];

    if (match !== undefined) {
      dispatches.push({
        sessionId: input.sessionId,
        message: this.matchSnapshot(nextRoom, match, input.sessionId, binding.playerId),
      });
    }

    return {
      room: nextRoom,
      match,
      dispatches,
    };
  }

  getRoom(roomId: string): RoomState | undefined {
    return this.rooms.get(roomId);
  }

  private broadcastRoomUpdated(room: RoomState, excludeSessionId?: string): RealtimeDispatch[] {
    return room.players
      .filter((player) => player.presence === "connected" && player.sessionId !== excludeSessionId)
      .map((player) => ({
        sessionId: player.sessionId,
        message: this.roomUpdated(room, player.sessionId, player.playerId),
      }));
  }

  private broadcastMatchSnapshot(room: RoomState, match: MatchState): RealtimeDispatch[] {
    return room.players
      .filter((player) => player.presence === "connected")
      .map((player) => ({
        sessionId: player.sessionId,
        message: this.matchSnapshot(room, match, player.sessionId, player.playerId),
      }));
  }

  private broadcastPresence(room: RoomState, playerId: string): RealtimeDispatch[] {
    const subject = room.players.find((player) => player.playerId === playerId);
    if (!subject) {
      return [];
    }

    return room.players
      .filter((player) => player.presence === "connected")
      .map((player) => ({
        sessionId: player.sessionId,
        message: {
          type: "server.presence_updated",
          roomId: room.roomId,
          playerId,
          presence: subject.presence,
          graceUntil: subject.graceUntil,
        } satisfies PresenceUpdatedMessage,
      }));
  }

  private broadcastLifecycleTransition(
    room: RoomState,
    fromState: RoomState["status"],
    toState: RoomState["status"],
    matchId?: string,
  ): RealtimeDispatch[] {
    return room.players
      .filter((player) => player.presence === "connected")
      .map((player) => ({
        sessionId: player.sessionId,
        message: {
          type: "server.lifecycle_transition",
          roomId: room.roomId,
          context: "room",
          fromState,
          toState,
          matchId,
        } satisfies LifecycleTransitionMessage,
      }));
  }

  private roomSnapshot(room: RoomState, sessionId: string, playerId: string): RoomSnapshotMessage {
    return {
      type: "server.room_snapshot",
      sessionId,
      room: projectRoomView(room, playerId),
    };
  }

  private roomUpdated(room: RoomState, sessionId: string, playerId: string): RoomUpdatedMessage {
    return {
      type: "server.room_updated",
      sessionId,
      room: projectRoomView(room, playerId),
    };
  }

  private matchSnapshot(room: RoomState, match: MatchState, sessionId: string, playerId: string): MatchSnapshotMessage {
    return {
      type: "server.match_snapshot",
      sessionId,
      roomId: room.roomId,
      matchId: match.matchId,
      matchVersion: match.version,
      playerView: {
        matchId: match.matchId,
        matchStatus: match.status,
        matchVersion: match.version,
        playerId,
        playerOrder: match.playerOrder,
      },
    };
  }

  private sessionAttached(
    sessionId: string,
    playerId: string | null,
    resumeContext: SessionAttachedMessage["resumeContext"],
  ): SessionAttachedMessage {
    return {
      type: "server.session_attached",
      sessionId,
      playerId,
      resumeContext,
    };
  }

  private commandAccepted(
    commandId: string,
    sessionId: string,
    acceptedAtVersion: number,
    effectsSummary: string,
  ): CommandAcceptedMessage {
    return {
      type: "server.command_accepted",
      sessionId,
      commandId,
      acceptedAtVersion,
      effectsSummary,
    };
  }

  private lifecycleContext() {
    return {
      now: this.now(),
      roomIdFactory: () => this.nextRoomId(),
      roomCodeFactory: () => this.nextRoomCode(),
      matchIdFactory: () => this.nextMatchId(),
      matchSeedFactory: () => this.nextMatchSeed(),
      ...(this.options.disconnectGraceMs === undefined
        ? {}
        : {
            disconnectGraceMs: this.options.disconnectGraceMs,
          }),
    };
  }

  private storeRoom(room: RoomState): void {
    this.rooms.set(room.roomId, room);
    this.roomCodes.set(room.roomCode, room.roomId);
  }

  private requireSession(sessionId: string): SessionBinding {
    const binding = this.sessions.get(sessionId);
    if (!binding) {
      throw new Error(`Unknown session: ${sessionId}`);
    }

    return binding;
  }

  private requireRoom(roomId: string): RoomState {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Unknown room: ${roomId}`);
    }

    return room;
  }

  private requireRoomByCode(roomCode: string): RoomState {
    const roomId = this.roomCodes.get(roomCode);
    if (!roomId) {
      throw new Error(`Unknown room code: ${roomCode}`);
    }

    return this.requireRoom(roomId);
  }

  private now(): string {
    return this.options.nowFactory?.() ?? new Date().toISOString();
  }

  private nextRoomId(): string {
    this.roomCounter += 1;
    return this.options.roomIdFactory?.() ?? `room-${this.roomCounter}`;
  }

  private nextRoomCode(): string {
    this.roomCodeCounter += 1;
    return this.options.roomCodeFactory?.() ?? `ROOM${this.roomCodeCounter}`;
  }

  private nextMatchId(): string {
    this.matchCounter += 1;
    return this.options.matchIdFactory?.() ?? `match-${this.matchCounter}`;
  }

  private nextMatchSeed(): string {
    this.seedCounter += 1;
    return this.options.matchSeedFactory?.() ?? `seed-${this.seedCounter}`;
  }
}
