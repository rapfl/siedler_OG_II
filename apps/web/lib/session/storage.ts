"use client";

export interface BrowserSessionState {
  sessionId: string;
  playerId: string;
  displayName: string;
  roomCode?: string;
  roomId?: string;
  matchId?: string;
}

const STORAGE_KEY = "siedler_og_ii_session";

function randomId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createBrowserSession(displayName: string): BrowserSessionState {
  return {
    sessionId: randomId("session"),
    playerId: randomId("player"),
    displayName: displayName.trim() || "Spieler",
  };
}

export function readBrowserSession(): BrowserSessionState | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as BrowserSessionState;
  } catch {
    return undefined;
  }
}

export function writeBrowserSession(session: BrowserSessionState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearBrowserSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

export function updateBrowserSession(patch: Partial<BrowserSessionState>): BrowserSessionState | undefined {
  const current = readBrowserSession();
  if (!current) {
    return undefined;
  }

  const next = {
    ...current,
    ...patch,
  };
  writeBrowserSession(next);
  return next;
}
