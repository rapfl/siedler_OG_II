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

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return undefined;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return undefined;
    }

    const candidate = parsed as Partial<BrowserSessionState>;
    if (typeof candidate.sessionId !== "string" || typeof candidate.playerId !== "string" || typeof candidate.displayName !== "string") {
      return undefined;
    }

    return {
      sessionId: candidate.sessionId,
      playerId: candidate.playerId,
      displayName: candidate.displayName,
      ...(typeof candidate.roomCode === "string" ? { roomCode: candidate.roomCode } : {}),
      ...(typeof candidate.roomId === "string" ? { roomId: candidate.roomId } : {}),
      ...(typeof candidate.matchId === "string" ? { matchId: candidate.matchId } : {}),
    };
  } catch {
    return undefined;
  }
}

export function writeBrowserSession(session: BrowserSessionState): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}

export function clearBrowserSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
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
