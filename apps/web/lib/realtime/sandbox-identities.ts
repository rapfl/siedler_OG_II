import type { RoomView } from "@siedler/shared-types";

import type { BrowserSessionState } from "../session/storage";

export interface StoredSandboxIdentity {
  sessionId: string;
  playerId: string;
  displayName: string;
}

export function reconcileSandboxIdentities(
  identities: StoredSandboxIdentity[],
  room: RoomView | undefined,
  session: BrowserSessionState | undefined,
): StoredSandboxIdentity[] {
  const roomPlayers = new Map((room?.playerSummaries ?? []).map((player) => [player.playerId, player]));
  const deduped = new Map<string, StoredSandboxIdentity>();

  for (const identity of identities) {
    const roomPlayer = roomPlayers.get(identity.playerId);
    if (room && !roomPlayer) {
      continue;
    }

    const normalized: StoredSandboxIdentity = {
      sessionId: identity.sessionId,
      playerId: identity.playerId,
      displayName: roomPlayer?.displayName ?? identity.displayName,
    };
    const existing = deduped.get(identity.playerId);

    if (!existing || existing.sessionId !== session?.sessionId) {
      if (identity.sessionId === session?.sessionId) {
        deduped.set(identity.playerId, normalized);
      } else if (!existing) {
        deduped.set(identity.playerId, normalized);
      }
    }
  }

  return [...deduped.values()].sort((left, right) => {
    if (left.sessionId === session?.sessionId) {
      return -1;
    }
    if (right.sessionId === session?.sessionId) {
      return 1;
    }
    return left.displayName.localeCompare(right.displayName);
  });
}
