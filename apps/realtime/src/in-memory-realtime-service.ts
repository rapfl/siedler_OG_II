import {
  buildRoad,
  buildSettlement,
  buyDevelopmentCard,
  cancelTrade,
  confirmTrade,
  createRoom,
  disconnectPlayer,
  discardResources,
  endTurn,
  finishMatch,
  initializeMatchSetup,
  joinRoom,
  leaveRoom,
  markMatchInProgress,
  moveRobber,
  offerTrade,
  placeInitialRoad,
  placeInitialSettlement,
  pickMonopolyResourceType,
  pickYearOfPlentyResource,
  playKnight,
  playMonopoly,
  playRoadBuilding,
  playYearOfPlenty,
  projectMatchView,
  projectRoomView,
  reassignColor,
  reassignSeat,
  reattachPlayer,
  respondTrade,
  rollDice,
  startMatch,
  stealResource,
  tradeWithBank,
  toggleReady,
  upgradeCity,
} from "@siedler/game-engine";
import type {
  ClientSubmitCommandMessage,
  CommandAcceptedMessage,
  CommandRejectedMessage,
  LifecycleTransitionMessage,
  MatchSnapshotMessage,
  MatchState,
  MatchCommandType,
  PlayerColor,
  PlayerCount,
  PresenceUpdatedMessage,
  RoomSnapshotMessage,
  RoomState,
  RoomUpdatedMessage,
  ServerMessage,
  SessionAttachedMessage,
} from "@siedler/shared-types";

interface SessionBinding {
  sessionId: string;
  playerId: string;
  roomId: string;
}

interface RecordedMatchCommand {
  room: RoomState;
  match?: MatchState | undefined;
  dispatches: RealtimeDispatch[];
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
  private readonly processedMatchCommands = new Map<string, RecordedMatchCommand>();
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
    const setupMatch = initializeMatchSetup(match);

    this.storeRoom(nextRoom);
    this.matches.set(setupMatch.matchId, setupMatch);

    const dispatches = [
      {
        sessionId: input.sessionId,
        message: this.commandAccepted(input.commandId, input.sessionId, nextRoom.version, "match_start_requested"),
      },
      ...this.broadcastLifecycleTransition(nextRoom, room.status, nextRoom.status, setupMatch.matchId),
      ...this.broadcastMatchLifecycleTransition(nextRoom, match.status, setupMatch.status, setupMatch.matchId),
      ...this.broadcastRoomUpdated(nextRoom),
      ...this.broadcastMatchSnapshot(nextRoom, setupMatch),
    ];

    return {
      room: nextRoom,
      match: setupMatch,
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

  getMatch(matchId: string): MatchState | undefined {
    return this.matches.get(matchId);
  }

  submitMatchCommand(input: {
    commandId: string;
    sessionId: string;
    matchId: string;
    commandType: MatchCommandType;
    payload?: ClientSubmitCommandMessage["payload"];
    clientStateVersion?: number;
  }): RealtimeCommandResult {
    try {
      const duplicate = this.processedMatchCommands.get(this.matchCommandHistoryKey(input.sessionId, input.commandId));
      if (duplicate) {
        return duplicate;
      }

      const binding = this.requireSession(input.sessionId);
      const room = this.requireRoom(binding.roomId);
      const match = this.requireMatchInRoom(input.matchId, room.roomId);
      this.ensurePlayerBelongsToMatch(binding.playerId, match);
      this.ensureFreshClientState(input.clientStateVersion, match.version);

      const context = {
        now: this.now(),
      };

      const nextMatch = this.executeMatchCommand(match, binding.playerId, input.commandType, input.payload ?? {}, context);
      const result = this.applyMatchUpdate(nextMatch);
      const acceptedResult = {
        ...result,
        dispatches: [
          {
            sessionId: input.sessionId,
            message: this.commandAccepted(input.commandId, input.sessionId, nextMatch.version, input.commandType.toLowerCase()),
          },
          ...result.dispatches,
        ],
      } satisfies RealtimeCommandResult;

      this.processedMatchCommands.set(this.matchCommandHistoryKey(input.sessionId, input.commandId), acceptedResult);

      return acceptedResult;
    } catch (error) {
      const fallbackSession = this.sessions.get(input.sessionId);
      const fallbackMatch = this.matches.get(input.matchId);
      const fallbackRoom =
        (fallbackSession ? this.rooms.get(fallbackSession.roomId) : undefined) ??
        (fallbackMatch ? this.rooms.get(fallbackMatch.roomId) : undefined);

      if (!fallbackRoom) {
        throw error;
      }

      const reasonCode =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof (error as { code?: unknown }).code === "string"
          ? ((error as { code: string }).code)
          : error instanceof Error
            ? error.name
            : "command_rejected";
      return {
        room: fallbackRoom,
        match: fallbackMatch,
        dispatches: [
          {
            sessionId: input.sessionId,
            message: this.commandRejected(
              input.commandId,
              input.sessionId,
              reasonCode,
              error instanceof Error ? error.message : "Command failed.",
              fallbackMatch?.version,
            ),
          },
        ],
      };
    }
  }

  applyMatchUpdate(match: MatchState): RealtimeCommandResult {
    const previousMatch = this.matches.get(match.matchId);
    const room = this.requireRoom(match.roomId);

    this.matches.set(match.matchId, match);

    let nextRoom = room;
    const dispatches: RealtimeDispatch[] = [];

    if (room.currentMatchId === match.matchId && room.status === "room_match_starting" && match.status === "match_in_progress") {
      nextRoom = markMatchInProgress(room, this.lifecycleContext(), match.matchId);
      this.storeRoom(nextRoom);
      dispatches.push(...this.broadcastLifecycleTransition(nextRoom, room.status, nextRoom.status, match.matchId));
      dispatches.push(...this.broadcastRoomUpdated(nextRoom));
    }

    if (match.status === "match_finished" && room.currentMatchId === match.matchId) {
      nextRoom = finishMatch(nextRoom, this.lifecycleContext(), {
        summary: {
          matchId: match.matchId,
          finishedAt: match.finishedAt ?? this.now(),
          winnerPlayerId: match.winnerPlayerId!,
          winningTotalPoints: projectMatchView(match, match.winnerPlayerId!).totalPointsForPlayer ?? 10,
          victoryCause: match.victoryCause ?? "score_threshold",
        },
      });
      this.storeRoom(nextRoom);
      dispatches.push(...this.broadcastLifecycleTransition(nextRoom, room.status === "room_match_starting" ? "room_match_in_progress" : room.status, nextRoom.status, match.matchId));
      dispatches.push(...this.broadcastRoomUpdated(nextRoom));
    }

    if (previousMatch && previousMatch.status !== match.status) {
      dispatches.push(...this.broadcastMatchLifecycleTransition(nextRoom, previousMatch.status, match.status, match.matchId));
    }

    dispatches.push(...this.broadcastMatchSnapshot(nextRoom, match));

    return {
      room: nextRoom,
      match,
      dispatches,
    };
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
      playerView: projectMatchView(match, playerId),
    };
  }

  private broadcastMatchLifecycleTransition(
    room: RoomState,
    fromState: MatchState["status"],
    toState: MatchState["status"],
    matchId: string,
  ): RealtimeDispatch[] {
    return room.players
      .filter((player) => player.presence === "connected")
      .map((player) => ({
        sessionId: player.sessionId,
        message: {
          type: "server.lifecycle_transition",
          roomId: room.roomId,
          context: "match",
          fromState,
          toState,
          matchId,
        } satisfies LifecycleTransitionMessage,
      }));
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

  private commandRejected(
    commandId: string,
    sessionId: string,
    reasonCode: string,
    message: string,
    currentRelevantVersion?: number,
  ): CommandRejectedMessage {
    return {
      type: "server.command_rejected",
      sessionId,
      commandId,
      reasonCode,
      message,
      currentRelevantVersion,
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

  private requireMatch(matchId: string): MatchState {
    const match = this.matches.get(matchId);
    if (!match) {
      throw new RealtimeServiceError("match_not_found", `Unknown match: ${matchId}`);
    }
    return match;
  }

  private requireMatchInRoom(matchId: string, roomId: string): MatchState {
    const match = this.requireMatch(matchId);
    if (match.roomId !== roomId) {
      throw new RealtimeServiceError("match_not_in_room", `Match ${matchId} does not belong to room ${roomId}.`);
    }
    return match;
  }

  private executeMatchCommand(
    match: MatchState,
    playerId: string,
    commandType: MatchCommandType,
    payload: Record<string, unknown>,
    context: { now: string },
  ): MatchState {
    switch (commandType) {
      case "PLACE_INITIAL_SETTLEMENT":
        return placeInitialSettlement(match, playerId, payload.intersectionId as string);
      case "PLACE_INITIAL_ROAD":
        return placeInitialRoad(match, playerId, payload.edgeId as string);
      case "ROLL_DICE":
        return rollDice(match, playerId, context);
      case "END_TURN":
        return endTurn(match, playerId, context);
      case "BUILD_ROAD":
        return buildRoad(match, playerId, payload.edgeId as string, context);
      case "BUILD_SETTLEMENT":
        return buildSettlement(match, playerId, payload.intersectionId as string, context);
      case "UPGRADE_CITY":
        return upgradeCity(match, playerId, payload.intersectionId as string, context);
      case "DISCARD_RESOURCES":
        return discardResources(match, playerId, {
          resources: (payload.resources ?? {}) as Record<string, number>,
        });
      case "MOVE_ROBBER":
        return moveRobber(match, playerId, payload.targetHexId as string);
      case "STEAL_RESOURCE":
        return stealResource(match, playerId, payload.victimPlayerId as string, context);
      case "BUY_DEV_CARD":
        return buyDevelopmentCard(match, playerId);
      case "PLAY_DEV_CARD_KNIGHT":
        return playKnight(match, playerId, context);
      case "PLAY_DEV_CARD_YEAR_OF_PLENTY":
        return playYearOfPlenty(match, playerId);
      case "PICK_YEAR_OF_PLENTY_RESOURCE":
        return pickYearOfPlentyResource(match, playerId, payload.resourceType as "wood" | "brick" | "sheep" | "wheat" | "ore");
      case "PLAY_DEV_CARD_MONOPOLY":
        return playMonopoly(match, playerId);
      case "PICK_MONOPOLY_RESOURCE_TYPE":
        return pickMonopolyResourceType(match, playerId, payload.resourceType as "wood" | "brick" | "sheep" | "wheat" | "ore");
      case "PLAY_DEV_CARD_ROAD_BUILDING":
        return playRoadBuilding(match, playerId);
      case "OFFER_TRADE":
        return offerTrade(match, playerId, {
          offeredResources: (payload.offeredResources ?? {}) as Record<string, number>,
          requestedResources: (payload.requestedResources ?? {}) as Record<string, number>,
        });
      case "RESPOND_TRADE":
        return respondTrade(match, playerId, payload.tradeId as string, payload.response as "accept" | "reject");
      case "CONFIRM_TRADE":
        return confirmTrade(match, playerId, payload.tradeId as string, payload.counterpartyPlayerId as string);
      case "CANCEL_TRADE":
        return cancelTrade(match, playerId, payload.tradeId as string);
      case "TRADE_WITH_BANK":
        return tradeWithBank(match, playerId, {
          giveResources: (payload.giveResources ?? {}) as Record<string, number>,
          receiveResources: (payload.receiveResources ?? {}) as Record<string, number>,
        });
      default:
        throw new Error(`Unsupported command type: ${commandType}`);
    }
  }

  private requireSession(sessionId: string): SessionBinding {
    const binding = this.sessions.get(sessionId);
    if (!binding) {
      throw new RealtimeServiceError("session_not_found", `Unknown session: ${sessionId}`);
    }

    return binding;
  }

  private requireRoom(roomId: string): RoomState {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new RealtimeServiceError("room_not_found", `Unknown room: ${roomId}`);
    }

    return room;
  }

  private requireRoomByCode(roomCode: string): RoomState {
    const roomId = this.roomCodes.get(roomCode);
    if (!roomId) {
      throw new RealtimeServiceError("room_not_found", `Unknown room code: ${roomCode}`);
    }

    return this.requireRoom(roomId);
  }

  private ensurePlayerBelongsToMatch(playerId: string, match: MatchState): void {
    if (!match.playerOrder.includes(playerId)) {
      throw new RealtimeServiceError("player_not_in_match", `Player ${playerId} does not belong to match ${match.matchId}.`);
    }
  }

  private ensureFreshClientState(clientStateVersion: number | undefined, currentMatchVersion: number): void {
    if (clientStateVersion === undefined) {
      return;
    }

    if (clientStateVersion !== currentMatchVersion) {
      throw new RealtimeServiceError(
        "stale_state",
        `Client state version ${clientStateVersion} does not match current match version ${currentMatchVersion}.`,
      );
    }
  }

  private matchCommandHistoryKey(sessionId: string, commandId: string): string {
    return `${sessionId}:${commandId}`;
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

class RealtimeServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "RealtimeServiceError";
  }
}
