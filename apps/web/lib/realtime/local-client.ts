"use client";

import { InMemoryRealtimeService } from "../../../realtime/src/in-memory-realtime-service";
import { getLegalInitialRoadPlacements, getLegalInitialSettlementPlacements, projectMatchView } from "@siedler/game-engine";
import type {
  ClientSubmitCommandMessage,
  CommandRejectedMessage,
  GeneratedBoard,
  MatchPlayerState,
  MatchState,
  MatchView,
  ResourceCounts,
  ResourceType,
  RoomView,
  ServerMessage,
} from "@siedler/shared-types";
import { createBrowserSession, readBrowserSession, type BrowserSessionState, writeBrowserSession } from "../session/storage";

type Listener = () => void;

export interface MatchSnapshotState {
  room?: RoomView;
  match?: MatchView;
  board?: GeneratedBoard;
  roomCode?: string;
  lastMessage?: ServerMessage;
  lastRejected?: CommandRejectedMessage;
  eventLog: ServerMessage[];
}

export interface RealtimeClient {
  createRoom(input: { displayName: string; maxPlayers?: 3 | 4 }): Promise<MatchSnapshotState>;
  joinRoom(input: { displayName: string; roomCode: string }): Promise<MatchSnapshotState>;
  toggleReady(ready: boolean): Promise<MatchSnapshotState>;
  reassignSeat(targetPlayerId: string, seatIndex: number): Promise<MatchSnapshotState>;
  reassignColor(targetPlayerId: string, color: RoomView["seatStates"][number]["color"] extends infer T ? T : never): Promise<MatchSnapshotState>;
  startMatch(): Promise<MatchSnapshotState>;
  submitCommand(input: Omit<ClientSubmitCommandMessage, "type" | "roomId">): Promise<MatchSnapshotState>;
  reattachSession(): Promise<MatchSnapshotState>;
  subscribeRoom(listener: Listener): () => void;
  subscribeMatch(listener: Listener): () => void;
  getSnapshot(): MatchSnapshotState;
  getSession(): BrowserSessionState | undefined;
  setSessionDisplayName(displayName: string): BrowserSessionState;
  fillRoomWithMockPlayers(targetPlayers: 3 | 4): Promise<MatchSnapshotState>;
  advanceSandbox(): Promise<MatchSnapshotState>;
}

interface SessionState {
  browserSession: BrowserSessionState;
  room?: RoomView;
  match?: MatchView;
  roomCode?: string;
  roomId?: string;
  matchId?: string;
  board?: GeneratedBoard;
  eventLog: ServerMessage[];
  lastMessage?: ServerMessage;
  lastRejected?: CommandRejectedMessage;
}

interface MockSeatIdentity {
  sessionId: string;
  playerId: string;
  displayName: string;
}

const service = new InMemoryRealtimeService();
const roomListeners = new Set<Listener>();
const matchListeners = new Set<Listener>();
const sessionStates = new Map<string, SessionState>();
const mockSeatsByRoomId = new Map<string, MockSeatIdentity[]>();

function emitRoom() {
  for (const listener of roomListeners) {
    listener();
  }
}

function emitMatch() {
  for (const listener of matchListeners) {
    listener();
  }
}

function randomId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeSession(displayName: string): BrowserSessionState {
  const current = readBrowserSession();
  if (current) {
    const next = {
      ...current,
      displayName: displayName.trim() || current.displayName,
    };
    writeBrowserSession(next);
    return next;
  }

  const created = createBrowserSession(displayName);
  writeBrowserSession(created);
  return created;
}

function ensureSessionState(session: BrowserSessionState): SessionState {
  let existing = sessionStates.get(session.sessionId);
  if (!existing) {
    existing = {
      browserSession: session,
      eventLog: [],
    };
    sessionStates.set(session.sessionId, existing);
  } else {
    existing.browserSession = session;
  }
  return existing;
}

function applyDispatchesForSession(sessionId: string, dispatches: { sessionId: string; message: ServerMessage }[], canonicalMatch?: MatchState) {
  const browserSession = readBrowserSession();
  if (!browserSession || browserSession.sessionId !== sessionId) {
    return;
  }

  const state = ensureSessionState(browserSession);
  for (const dispatch of dispatches.filter((entry) => entry.sessionId === sessionId)) {
    state.lastMessage = dispatch.message;
    state.eventLog = [...state.eventLog.slice(-23), dispatch.message];

    switch (dispatch.message.type) {
      case "server.room_snapshot":
      case "server.room_updated":
        state.room = dispatch.message.room;
        state.roomCode = dispatch.message.room.roomCode;
        state.roomId = dispatch.message.room.roomId;
        break;
      case "server.match_snapshot":
        state.match = dispatch.message.playerView;
        state.matchId = dispatch.message.matchId;
        break;
      case "server.command_rejected":
        state.lastRejected = dispatch.message;
        break;
      default:
        break;
    }
  }

  if (canonicalMatch && state.match?.matchId === canonicalMatch.matchId) {
    if (canonicalMatch.board) {
      state.board = canonicalMatch.board;
    }
    state.match = projectMatchView(canonicalMatch, state.browserSession.playerId);
  }

  const patchedSession = {
    ...state.browserSession,
    ...(state.roomCode ? { roomCode: state.roomCode } : {}),
    ...(state.roomId ? { roomId: state.roomId } : {}),
    ...(state.matchId ? { matchId: state.matchId } : {}),
  };
  state.browserSession = patchedSession;
  writeBrowserSession(patchedSession);
}

function applyResult(result: { match: MatchState | undefined; dispatches: { sessionId: string; message: ServerMessage }[] }) {
  const current = readBrowserSession();
  if (!current) {
    return getEmptySnapshot();
  }

  applyDispatchesForSession(current.sessionId, result.dispatches, result.match);
  emitRoom();
  emitMatch();
  return getSnapshotForSession(current.sessionId);
}

function getEmptySnapshot(): MatchSnapshotState {
  return {
    eventLog: [],
  };
}

function getSnapshotForSession(sessionId: string): MatchSnapshotState {
  const state = sessionStates.get(sessionId);
  if (!state) {
    return getEmptySnapshot();
  }

  return {
    ...(state.room ? { room: state.room } : {}),
    ...(state.match ? { match: state.match } : {}),
    ...(state.board ? { board: state.board } : {}),
    ...(state.roomCode ? { roomCode: state.roomCode } : {}),
    ...(state.lastMessage ? { lastMessage: state.lastMessage } : {}),
    ...(state.lastRejected ? { lastRejected: state.lastRejected } : {}),
    eventLog: state.eventLog,
  };
}

function getMockSeats(roomId: string): MockSeatIdentity[] {
  return mockSeatsByRoomId.get(roomId) ?? [];
}

function rememberMockSeat(roomId: string, identity: MockSeatIdentity) {
  const current = getMockSeats(roomId);
  if (!current.some((entry) => entry.sessionId === identity.sessionId)) {
    mockSeatsByRoomId.set(roomId, [...current, identity]);
  }
}

function getCurrentMatchState(snapshot: MatchSnapshotState): MatchState | undefined {
  if (!snapshot.match?.matchId) {
    return undefined;
  }

  return service.getMatch(snapshot.match.matchId);
}

function firstDifferentHex(board: GeneratedBoard): string | undefined {
  return Object.keys(board.hexes).find((hexId) => hexId !== board.robberHexId);
}

function firstResourceSelection(): ResourceType {
  return "wood";
}

function discardHalf(resources: ResourceCounts, requiredCount: number): ResourceCounts {
  const next: ResourceCounts = {
    wood: 0,
    brick: 0,
    sheep: 0,
    wheat: 0,
    ore: 0,
  };
  let remaining = requiredCount;
  for (const type of ["wood", "brick", "sheep", "wheat", "ore"] as const) {
    while (resources[type] > next[type] && remaining > 0) {
      next[type] += 1;
      remaining -= 1;
    }
  }
  return next;
}

async function advanceMockPlayersInternal(client: LocalRealtimeClient): Promise<MatchSnapshotState> {
  let snapshot = client.getSnapshot();
  let currentMatch = getCurrentMatchState(snapshot);

  while (snapshot.match && currentMatch && snapshot.match.playerId !== currentMatch.turn?.activePlayerId && currentMatch.status !== "match_finished") {
    const activePlayerId = currentMatch.status === "match_setup" ? currentMatch.setup?.currentPlayerId : currentMatch.turn?.activePlayerId;
    if (!activePlayerId) {
      break;
    }

    const mockIdentity = getMockSeats(currentMatch.roomId).find((entry) => entry.playerId === activePlayerId);
    if (!mockIdentity) {
      break;
    }

    const activeView = projectMatchView(currentMatch, activePlayerId);
    const command = chooseMockCommand(currentMatch, activeView);
    if (!command) {
      break;
    }

    const result = service.submitMatchCommand({
      commandId: randomId("mock-cmd"),
      sessionId: mockIdentity.sessionId,
      matchId: currentMatch.matchId,
      commandType: command.commandType,
      payload: command.payload,
      clientStateVersion: currentMatch.version,
    });

    const browserSession = readBrowserSession();
    if (browserSession) {
      applyDispatchesForSession(browserSession.sessionId, result.dispatches, result.match);
    }

    snapshot = client.getSnapshot();
    currentMatch = getCurrentMatchState(snapshot);
  }

  emitRoom();
  emitMatch();
  return snapshot;
}

function chooseMockCommand(match: MatchState, view: MatchView): Pick<ClientSubmitCommandMessage, "commandType" | "payload"> | undefined {
  if (match.status === "match_setup") {
    if (
      match.setup?.step === "setup_forward_settlement" ||
      match.setup?.step === "setup_reverse_settlement"
    ) {
      return {
        commandType: "PLACE_INITIAL_SETTLEMENT",
        payload: {
          intersectionId: getLegalInitialSettlementPlacements(match, view.playerId)[0],
        },
      };
    }

    return {
      commandType: "PLACE_INITIAL_ROAD",
      payload: {
        edgeId: getLegalInitialRoadPlacements(match, view.playerId)[0],
      },
    };
  }

  const requiredAction = view.requiredAction;
  if (requiredAction === "ROLL_DICE") {
    return {
      commandType: "ROLL_DICE",
      payload: {},
    };
  }

  if (requiredAction === "DISCARD_RESOURCES") {
    const player = match.players?.find((entry: MatchPlayerState) => entry.playerId === view.playerId);
    const count = view.requiredDiscardCount ?? 0;
    return {
      commandType: "DISCARD_RESOURCES",
      payload: {
        resources: discardHalf(player?.resources ?? { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 }, count),
      },
    };
  }

  if (requiredAction === "MOVE_ROBBER") {
    return {
      commandType: "MOVE_ROBBER",
      payload: {
        targetHexId: match.board ? firstDifferentHex(match.board) : undefined,
      },
    };
  }

  if (requiredAction === "STEAL_RESOURCE") {
    return {
      commandType: "STEAL_RESOURCE",
      payload: {
        victimPlayerId: view.stealablePlayerIds?.[0],
      },
    };
  }

  if (requiredAction === "PICK_YEAR_OF_PLENTY_RESOURCE") {
    return {
      commandType: "PICK_YEAR_OF_PLENTY_RESOURCE",
      payload: {
        resourceType: firstResourceSelection(),
      },
    };
  }

  if (requiredAction === "PICK_MONOPOLY_RESOURCE_TYPE") {
    return {
      commandType: "PICK_MONOPOLY_RESOURCE_TYPE",
      payload: {
        resourceType: "wood",
      },
    };
  }

  if (requiredAction === "RESPOND_TRADE") {
    return {
      commandType: "RESPOND_TRADE",
      payload: {
        tradeId: view.tradeOffer?.tradeId,
        response: "reject",
      },
    };
  }

  if (requiredAction === "BUILD_ROAD" && match.turn?.developmentCardResolution) {
    const edgeId = Object.keys(match.board?.edges ?? {}).find((candidate) =>
      !match.board?.edges[candidate]?.road,
    );
    return edgeId
      ? {
          commandType: "BUILD_ROAD",
          payload: {
            edgeId,
          },
        }
      : undefined;
  }

  if (match.turn?.activePlayerId === view.playerId && view.allowedActions?.includes("END_TURN")) {
    return {
      commandType: "END_TURN",
      payload: {},
    };
  }

  return undefined;
}

class LocalRealtimeClient implements RealtimeClient {
  async createRoom(input: { displayName: string; maxPlayers?: 3 | 4 }): Promise<MatchSnapshotState> {
    const session = normalizeSession(input.displayName);
    const state = ensureSessionState(session);
    const result = service.createRoom({
      commandId: randomId("create"),
      sessionId: session.sessionId,
      playerId: session.playerId,
      displayName: session.displayName,
      ...(input.maxPlayers !== undefined ? { maxPlayers: input.maxPlayers } : {}),
    });
    state.eventLog = [];
    return applyResult({
      match: result.match,
      dispatches: result.dispatches,
    });
  }

  async joinRoom(input: { displayName: string; roomCode: string }): Promise<MatchSnapshotState> {
    const session = normalizeSession(input.displayName);
    ensureSessionState(session);
    const result = service.joinRoom({
      commandId: randomId("join"),
      sessionId: session.sessionId,
      playerId: session.playerId,
      displayName: session.displayName,
      roomCode: input.roomCode.toUpperCase(),
    });
    return applyResult({
      match: result.match,
      dispatches: result.dispatches,
    });
  }

  async toggleReady(ready: boolean): Promise<MatchSnapshotState> {
    const session = readBrowserSession();
    if (!session) {
      return getEmptySnapshot();
    }
    const result = service.toggleReady({
      commandId: randomId("ready"),
      sessionId: session.sessionId,
      ready,
    });
    return applyResult({
      match: result.match,
      dispatches: result.dispatches,
    });
  }

  async reassignSeat(targetPlayerId: string, seatIndex: number): Promise<MatchSnapshotState> {
    const session = readBrowserSession();
    if (!session) {
      return getEmptySnapshot();
    }
    const result = service.reassignSeat({
      commandId: randomId("seat"),
      sessionId: session.sessionId,
      targetPlayerId,
      seatIndex,
    });
    return applyResult({
      match: result.match,
      dispatches: result.dispatches,
    });
  }

  async reassignColor(targetPlayerId: string, color: RoomView["seatStates"][number]["color"] extends infer T ? T : never): Promise<MatchSnapshotState> {
    const session = readBrowserSession();
    if (!session || !color) {
      return getEmptySnapshot();
    }
    const result = service.reassignColor({
      commandId: randomId("color"),
      sessionId: session.sessionId,
      targetPlayerId,
      color,
    });
    return applyResult({
      match: result.match,
      dispatches: result.dispatches,
    });
  }

  async startMatch(): Promise<MatchSnapshotState> {
    const session = readBrowserSession();
    if (!session) {
      return getEmptySnapshot();
    }
    const result = service.startMatch({
      commandId: randomId("start"),
      sessionId: session.sessionId,
    });
    return applyResult({
      match: result.match,
      dispatches: result.dispatches,
    });
  }

  async submitCommand(input: Omit<ClientSubmitCommandMessage, "type" | "roomId">): Promise<MatchSnapshotState> {
    const session = readBrowserSession();
    if (!session || !session.matchId) {
      return getEmptySnapshot();
    }
    const result = service.submitMatchCommand({
      commandId: input.commandId,
      sessionId: session.sessionId,
      matchId: input.matchId ?? session.matchId,
      commandType: input.commandType,
      ...(input.payload !== undefined ? { payload: input.payload } : {}),
      ...(input.clientStateVersion !== undefined ? { clientStateVersion: input.clientStateVersion } : {}),
    });
    return applyResult({
      match: result.match,
      dispatches: result.dispatches,
    });
  }

  async reattachSession(): Promise<MatchSnapshotState> {
    const session = readBrowserSession();
    if (!session) {
      return getEmptySnapshot();
    }
    const result = service.reattachSession({
      sessionId: session.sessionId,
    });
    return applyResult({
      match: result.match,
      dispatches: result.dispatches,
    });
  }

  subscribeRoom(listener: Listener): () => void {
    roomListeners.add(listener);
    return () => {
      roomListeners.delete(listener);
    };
  }

  subscribeMatch(listener: Listener): () => void {
    matchListeners.add(listener);
    return () => {
      matchListeners.delete(listener);
    };
  }

  getSnapshot(): MatchSnapshotState {
    const session = readBrowserSession();
    return session ? getSnapshotForSession(session.sessionId) : getEmptySnapshot();
  }

  getSession(): BrowserSessionState | undefined {
    return readBrowserSession();
  }

  setSessionDisplayName(displayName: string): BrowserSessionState {
    return normalizeSession(displayName);
  }

  async fillRoomWithMockPlayers(targetPlayers: 3 | 4): Promise<MatchSnapshotState> {
    const session = readBrowserSession();
    if (!session) {
      return getEmptySnapshot();
    }
    const current = this.getSnapshot();
    const room = current.room;
    if (!room) {
      return current;
    }

    const currentCount = room.playerSummaries.length;
    const needed = targetPlayers - currentCount;
    const browserSession = readBrowserSession();
    for (let index = 0; index < needed; index += 1) {
      const identity: MockSeatIdentity = {
        sessionId: randomId("mock-session"),
        playerId: randomId("mock-player"),
        displayName: `Guest ${currentCount + index + 1}`,
      };
      rememberMockSeat(room.roomId, identity);
      const joinResult = service.joinRoom({
        commandId: randomId("mock-join"),
        sessionId: identity.sessionId,
        playerId: identity.playerId,
        displayName: identity.displayName,
        roomCode: room.roomCode,
      });
      if (browserSession) {
        applyDispatchesForSession(browserSession.sessionId, joinResult.dispatches, joinResult.match);
      }
    }

    const latestRoom = service.getRoom(room.roomId);
    if (!latestRoom) {
      return this.getSnapshot();
    }

    for (const player of latestRoom.players) {
      const readyResult = service.toggleReady({
        commandId: randomId("mock-ready"),
        sessionId: player.sessionId,
        ready: true,
      });
      if (browserSession) {
        applyDispatchesForSession(browserSession.sessionId, readyResult.dispatches, readyResult.match);
      }
    }

    const freshRoom = service.getRoom(room.roomId);
    if (freshRoom && session) {
      const match = freshRoom.currentMatchId ? service.getMatch(freshRoom.currentMatchId) : undefined;
      applyDispatchesForSession(session.sessionId, [], match);
    }
    emitRoom();
    return this.getSnapshot();
  }

  async advanceSandbox(): Promise<MatchSnapshotState> {
    return advanceMockPlayersInternal(this);
  }
}

let singleton: LocalRealtimeClient | undefined;

export function getRealtimeClient(): RealtimeClient {
  if (!singleton) {
    singleton = new LocalRealtimeClient();
  }
  return singleton;
}
