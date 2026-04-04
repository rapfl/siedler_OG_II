"use client";

import type {
  ClientSubmitCommandMessage,
  CommandRejectedMessage,
  GeneratedBoard,
  MatchView,
  RoomView,
  ServerMessage,
} from "@siedler/shared-types";
import { createBrowserSession, readBrowserSession, type BrowserSessionState, writeBrowserSession } from "../session/storage";

type Listener = () => void;
const sandboxEnabled = process.env.NODE_ENV !== "production";

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
  getSandboxIdentities(): Array<MockSeatIdentity & { isCurrent: boolean }>;
  switchSandboxIdentity(sessionId: string): Promise<MatchSnapshotState>;
  advanceSandbox(): Promise<MatchSnapshotState>;
  supportsSandboxTools(): boolean;
}

interface SessionState {
  browserSession: BrowserSessionState;
  room?: RoomView;
  match?: MatchView;
  roomCode?: string;
  board?: GeneratedBoard;
  eventLog: ServerMessage[];
  lastMessage?: ServerMessage;
  lastRejected?: CommandRejectedMessage;
  snapshotCache?: MatchSnapshotState;
}

interface MockSeatIdentity {
  sessionId: string;
  playerId: string;
  displayName: string;
}

const SANDBOX_IDENTITY_STORAGE_KEY = "siedler_og_ii_sandbox_identities";

interface ApiRealtimeSnapshot {
  room?: RoomView;
  match?: MatchView;
  board?: GeneratedBoard;
  roomCode?: string;
  dispatches: Array<{ sessionId: string; message: ServerMessage }>;
  lastRejected?: CommandRejectedMessage;
}

const roomListeners = new Set<Listener>();
const matchListeners = new Set<Listener>();
const sessionStates = new Map<string, SessionState>();
const mockSeatsByRoomCode = new Map<string, MockSeatIdentity[]>();
let pollHandle: number | undefined;
const EMPTY_SNAPSHOT: MatchSnapshotState = {
  eventLog: [],
};

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
      snapshotCache: {
        eventLog: [],
      },
    };
    sessionStates.set(session.sessionId, existing);
  } else {
    existing.browserSession = session;
  }
  return existing;
}

function getEmptySnapshot(): MatchSnapshotState {
  return EMPTY_SNAPSHOT;
}

function getSnapshotForSession(sessionId: string): MatchSnapshotState {
  const state = sessionStates.get(sessionId);
  if (!state) {
    return getEmptySnapshot();
  }

  if (state.snapshotCache) {
    return state.snapshotCache;
  }

  state.snapshotCache = {
    ...(state.room ? { room: state.room } : {}),
    ...(state.match ? { match: state.match } : {}),
    ...(state.board ? { board: state.board } : {}),
    ...(state.roomCode ? { roomCode: state.roomCode } : {}),
    ...(state.lastMessage ? { lastMessage: state.lastMessage } : {}),
    ...(state.lastRejected ? { lastRejected: state.lastRejected } : {}),
    eventLog: state.eventLog,
  };

  return state.snapshotCache;
}

function applyServerSnapshot(sessionId: string, snapshot: ApiRealtimeSnapshot): MatchSnapshotState {
  const browserSession = readBrowserSession();
  if (!browserSession || browserSession.sessionId !== sessionId) {
    return getEmptySnapshot();
  }

  const state = ensureSessionState(browserSession);
  for (const dispatch of snapshot.dispatches.filter((entry) => entry.sessionId === sessionId)) {
    state.lastMessage = dispatch.message;
    state.eventLog = [...state.eventLog.slice(-23), dispatch.message];
  }

  if (snapshot.room) {
    state.room = snapshot.room;
    state.roomCode = snapshot.roomCode ?? snapshot.room.roomCode;
  }
  if (snapshot.match) {
    state.match = snapshot.match;
  }
  if (snapshot.board) {
    state.board = snapshot.board;
  }
  if (snapshot.lastRejected) {
    state.lastRejected = snapshot.lastRejected;
  } else if (snapshot.room || snapshot.match || snapshot.board) {
    delete state.lastRejected;
  }

  const nextSession = {
    ...state.browserSession,
    ...(state.roomCode ? { roomCode: state.roomCode } : {}),
    ...(state.room ? { roomId: state.room.roomId } : {}),
    ...(state.match ? { matchId: state.match.matchId } : {}),
  };
  state.browserSession = nextSession;
  state.snapshotCache = {
    ...(state.room ? { room: state.room } : {}),
    ...(state.match ? { match: state.match } : {}),
    ...(state.board ? { board: state.board } : {}),
    ...(state.roomCode ? { roomCode: state.roomCode } : {}),
    ...(state.lastMessage ? { lastMessage: state.lastMessage } : {}),
    ...(state.lastRejected ? { lastRejected: state.lastRejected } : {}),
    eventLog: state.eventLog,
  };
  writeBrowserSession(nextSession);

  emitRoom();
  emitMatch();
  return state.snapshotCache;
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    cache: "no-store",
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? "Request failed.");
  }

  return body;
}

async function pollCurrentSession() {
  const session = readBrowserSession();
  if (!session) {
    return;
  }

  try {
    const snapshot = await fetchJson<ApiRealtimeSnapshot>(`/api/session/state?sessionId=${encodeURIComponent(session.sessionId)}`);
    applyServerSnapshot(session.sessionId, snapshot);
  } catch {
    // Polling should not throw into the browser event loop; a later tick can resync.
  }
}

async function refreshCurrentSessionState(sessionId: string): Promise<MatchSnapshotState> {
  const snapshot = await fetchJson<ApiRealtimeSnapshot>(`/api/session/state?sessionId=${encodeURIComponent(sessionId)}`);
  return applyServerSnapshot(sessionId, snapshot);
}

function shouldResync(snapshot: MatchSnapshotState): boolean {
  return snapshot.lastRejected?.reasonCode === "stale_state";
}

function ensurePolling() {
  if (typeof window === "undefined" || pollHandle !== undefined) {
    return;
  }

  pollHandle = window.setInterval(() => {
    void pollCurrentSession();
  }, 2000);
}

function stopPollingIfUnused() {
  if (pollHandle === undefined) {
    return;
  }

  if (roomListeners.size === 0 && matchListeners.size === 0) {
    window.clearInterval(pollHandle);
    pollHandle = undefined;
  }
}

function rememberMockSeat(roomCode: string, identity: MockSeatIdentity) {
  const current = getMockSeats(roomCode);
  if (current.some((entry) => entry.sessionId === identity.sessionId)) {
    return;
  }

  const next = [...current, identity];
  mockSeatsByRoomCode.set(roomCode, next);
  writeSandboxIdentities(roomCode, next);
}

function getMockSeats(roomCode: string): MockSeatIdentity[] {
  const existing = mockSeatsByRoomCode.get(roomCode);
  if (existing) {
    return existing;
  }

  const restored = readSandboxIdentities(roomCode);
  mockSeatsByRoomCode.set(roomCode, restored);
  return restored;
}

function readSandboxIdentityMap(): Record<string, MockSeatIdentity[]> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(SANDBOX_IDENTITY_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }

    const next: Record<string, MockSeatIdentity[]> = {};
    for (const [roomCode, identities] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(identities)) {
        continue;
      }
      next[roomCode] = identities.filter(isMockSeatIdentity);
    }
    return next;
  } catch {
    return {};
  }
}

function readSandboxIdentities(roomCode: string): MockSeatIdentity[] {
  return readSandboxIdentityMap()[roomCode] ?? [];
}

function writeSandboxIdentities(roomCode: string, identities: MockSeatIdentity[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const current = readSandboxIdentityMap();
    current[roomCode] = identities;
    window.localStorage.setItem(SANDBOX_IDENTITY_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}

function isMockSeatIdentity(value: unknown): value is MockSeatIdentity {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<MockSeatIdentity>;
  return typeof candidate.sessionId === "string" && typeof candidate.playerId === "string" && typeof candidate.displayName === "string";
}

function rememberCurrentSeat(session: BrowserSessionState) {
  if (!session.roomCode) {
    return;
  }

  rememberMockSeat(session.roomCode, {
    sessionId: session.sessionId,
    playerId: session.playerId,
    displayName: session.displayName,
  });
}

class HttpRealtimeClient implements RealtimeClient {
  async createRoom(input: { displayName: string; maxPlayers?: 3 | 4 }): Promise<MatchSnapshotState> {
    const session = normalizeSession(input.displayName);
    ensureSessionState(session).eventLog = [];
    const snapshot = await fetchJson<ApiRealtimeSnapshot>("/api/room/create", {
      method: "POST",
      body: JSON.stringify({
        sessionId: session.sessionId,
        playerId: session.playerId,
        displayName: session.displayName,
        ...(input.maxPlayers !== undefined ? { maxPlayers: input.maxPlayers } : {}),
      }),
    });
    const next = applyServerSnapshot(session.sessionId, snapshot);
    rememberCurrentSeat(readBrowserSession() ?? session);
    return shouldResync(next) ? refreshCurrentSessionState(session.sessionId) : next;
  }

  async joinRoom(input: { displayName: string; roomCode: string }): Promise<MatchSnapshotState> {
    const session = normalizeSession(input.displayName);
    const snapshot = await fetchJson<ApiRealtimeSnapshot>("/api/room/join", {
      method: "POST",
      body: JSON.stringify({
        sessionId: session.sessionId,
        playerId: session.playerId,
        displayName: session.displayName,
        roomCode: input.roomCode.toUpperCase(),
      }),
    });
    const next = applyServerSnapshot(session.sessionId, snapshot);
    rememberCurrentSeat(readBrowserSession() ?? session);
    return shouldResync(next) ? refreshCurrentSessionState(session.sessionId) : next;
  }

  async toggleReady(ready: boolean): Promise<MatchSnapshotState> {
    const session = readBrowserSession();
    if (!session) {
      return getEmptySnapshot();
    }
    const snapshot = await fetchJson<ApiRealtimeSnapshot>("/api/room/action", {
      method: "POST",
      body: JSON.stringify({
        sessionId: session.sessionId,
        action: "toggle_ready",
        ready,
      }),
    });
    const next = applyServerSnapshot(session.sessionId, snapshot);
    return shouldResync(next) ? refreshCurrentSessionState(session.sessionId) : next;
  }

  async reassignSeat(targetPlayerId: string, seatIndex: number): Promise<MatchSnapshotState> {
    const session = readBrowserSession();
    if (!session) {
      return getEmptySnapshot();
    }
    const snapshot = await fetchJson<ApiRealtimeSnapshot>("/api/room/action", {
      method: "POST",
      body: JSON.stringify({
        sessionId: session.sessionId,
        action: "reassign_seat",
        targetPlayerId,
        seatIndex,
      }),
    });
    const next = applyServerSnapshot(session.sessionId, snapshot);
    return shouldResync(next) ? refreshCurrentSessionState(session.sessionId) : next;
  }

  async reassignColor(targetPlayerId: string, color: RoomView["seatStates"][number]["color"] extends infer T ? T : never): Promise<MatchSnapshotState> {
    const session = readBrowserSession();
    if (!session || !color) {
      return getEmptySnapshot();
    }
    const snapshot = await fetchJson<ApiRealtimeSnapshot>("/api/room/action", {
      method: "POST",
      body: JSON.stringify({
        sessionId: session.sessionId,
        action: "reassign_color",
        targetPlayerId,
        color,
      }),
    });
    const next = applyServerSnapshot(session.sessionId, snapshot);
    return shouldResync(next) ? refreshCurrentSessionState(session.sessionId) : next;
  }

  async startMatch(): Promise<MatchSnapshotState> {
    const session = readBrowserSession();
    if (!session) {
      return getEmptySnapshot();
    }
    const snapshot = await fetchJson<ApiRealtimeSnapshot>("/api/room/action", {
      method: "POST",
      body: JSON.stringify({
        sessionId: session.sessionId,
        action: "start_match",
      }),
    });
    const next = applyServerSnapshot(session.sessionId, snapshot);
    return shouldResync(next) ? refreshCurrentSessionState(session.sessionId) : next;
  }

  async submitCommand(input: Omit<ClientSubmitCommandMessage, "type" | "roomId">): Promise<MatchSnapshotState> {
    const session = readBrowserSession();
    if (!session || !session.matchId) {
      return getEmptySnapshot();
    }
    const snapshot = await fetchJson<ApiRealtimeSnapshot>("/api/match/command", {
      method: "POST",
      body: JSON.stringify({
        sessionId: session.sessionId,
        commandId: input.commandId,
        matchId: input.matchId ?? session.matchId,
        commandType: input.commandType,
        ...(input.payload !== undefined ? { payload: input.payload } : {}),
        ...(input.clientStateVersion !== undefined ? { clientStateVersion: input.clientStateVersion } : {}),
      }),
    });
    const next = applyServerSnapshot(session.sessionId, snapshot);
    return shouldResync(next) ? refreshCurrentSessionState(session.sessionId) : next;
  }

  async reattachSession(): Promise<MatchSnapshotState> {
    const session = readBrowserSession();
    if (!session) {
      return getEmptySnapshot();
    }
    const snapshot = await fetchJson<ApiRealtimeSnapshot>("/api/room/action", {
      method: "POST",
      body: JSON.stringify({
        sessionId: session.sessionId,
        action: "reattach",
      }),
    });
    const next = applyServerSnapshot(session.sessionId, snapshot);
    return shouldResync(next) ? refreshCurrentSessionState(session.sessionId) : next;
  }

  subscribeRoom(listener: Listener): () => void {
    roomListeners.add(listener);
    ensurePolling();
    return () => {
      roomListeners.delete(listener);
      stopPollingIfUnused();
    };
  }

  subscribeMatch(listener: Listener): () => void {
    matchListeners.add(listener);
    ensurePolling();
    return () => {
      matchListeners.delete(listener);
      stopPollingIfUnused();
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
    if (!sandboxEnabled) {
      return this.getSnapshot();
    }
    const browserSession = readBrowserSession();
    const snapshot = this.getSnapshot();
    const roomCode = snapshot.room?.roomCode ?? browserSession?.roomCode;
    if (!browserSession || !roomCode) {
      return getEmptySnapshot();
    }

    const currentCount = snapshot.room?.playerSummaries.length ?? 0;
    const needed = targetPlayers - currentCount;
    for (let index = 0; index < needed; index += 1) {
      const identity: MockSeatIdentity = {
        sessionId: randomId("mock-session"),
        playerId: randomId("mock-player"),
        displayName: `Guest ${currentCount + index + 1}`,
      };
      rememberMockSeat(roomCode, identity);
      await fetchJson<ApiRealtimeSnapshot>("/api/room/join", {
        method: "POST",
        body: JSON.stringify({
          sessionId: identity.sessionId,
          playerId: identity.playerId,
          displayName: identity.displayName,
          roomCode,
        }),
      });
      await fetchJson<ApiRealtimeSnapshot>("/api/room/action", {
        method: "POST",
        body: JSON.stringify({
          sessionId: identity.sessionId,
          action: "toggle_ready",
          ready: true,
        }),
      });
    }

    const hostSnapshot = await fetchJson<ApiRealtimeSnapshot>(`/api/session/state?sessionId=${encodeURIComponent(browserSession.sessionId)}`);
    const next = applyServerSnapshot(browserSession.sessionId, hostSnapshot);
    rememberCurrentSeat(readBrowserSession() ?? browserSession);
    return next;
  }

  getSandboxIdentities(): Array<MockSeatIdentity & { isCurrent: boolean }> {
    if (!sandboxEnabled) {
      return [];
    }

    const session = readBrowserSession();
    const roomCode = this.getSnapshot().room?.roomCode ?? session?.roomCode;
    if (!roomCode) {
      return [];
    }

    if (session) {
      rememberCurrentSeat(session);
    }

    return getMockSeats(roomCode).map((identity) => ({
      ...identity,
      isCurrent: identity.sessionId === session?.sessionId,
    }));
  }

  async switchSandboxIdentity(sessionId: string): Promise<MatchSnapshotState> {
    if (!sandboxEnabled) {
      return this.getSnapshot();
    }

    const current = readBrowserSession();
    const roomCode = this.getSnapshot().room?.roomCode ?? current?.roomCode;
    if (!roomCode) {
      return this.getSnapshot();
    }

    const identity = getMockSeats(roomCode).find((entry) => entry.sessionId === sessionId);
    if (!identity) {
      throw new Error("Unknown sandbox identity.");
    }

    const nextSession: BrowserSessionState = {
      sessionId: identity.sessionId,
      playerId: identity.playerId,
      displayName: identity.displayName,
      ...(current?.roomCode ? { roomCode: current.roomCode } : {}),
      ...(current?.roomId ? { roomId: current.roomId } : {}),
      ...(current?.matchId ? { matchId: current.matchId } : {}),
    };

    writeBrowserSession(nextSession);
    ensureSessionState(nextSession);
    emitRoom();
    emitMatch();

    return refreshCurrentSessionState(identity.sessionId);
  }

  async advanceSandbox(): Promise<MatchSnapshotState> {
    if (!sandboxEnabled) {
      return this.getSnapshot();
    }
    const browserSession = readBrowserSession();
    const current = this.getSnapshot();
    if (!browserSession || !current.match || !current.board || !current.roomCode) {
      return current;
    }

    const refreshed = await fetchJson<ApiRealtimeSnapshot>(`/api/session/state?sessionId=${encodeURIComponent(browserSession.sessionId)}`);
    return applyServerSnapshot(browserSession.sessionId, refreshed);
  }

  supportsSandboxTools(): boolean {
    return sandboxEnabled;
  }
}

let singleton: HttpRealtimeClient | undefined;

export function getRealtimeClient(): RealtimeClient {
  if (!singleton) {
    singleton = new HttpRealtimeClient();
  }
  return singleton;
}
