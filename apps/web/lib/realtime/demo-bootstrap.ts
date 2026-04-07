import type { MatchSnapshotState, RealtimeClient } from "./local-client";
import type { BrowserSessionState } from "../session/storage";

const DEMO_DISPLAY_NAME = "Sir Alistair";

type DemoRealtimeClient = Pick<
  RealtimeClient,
  | "createRoom"
  | "fillRoomWithMockPlayers"
  | "toggleReady"
  | "startMatch"
  | "reattachSession"
  | "supportsSandboxTools"
  | "getSnapshot"
>;

export interface DemoBootstrapResult {
  snapshot: MatchSnapshotState;
  matchId?: string | undefined;
}

export async function ensurePlayableSandboxMatch(
  client: DemoRealtimeClient,
  snapshot: MatchSnapshotState,
  session: BrowserSessionState | undefined,
): Promise<DemoBootstrapResult> {
  if (snapshot.match?.matchId) {
    return {
      snapshot,
      matchId: snapshot.match.matchId,
    };
  }

  let next = snapshot;

  if (session?.matchId) {
    next = await client.reattachSession();
    if (next.match?.matchId) {
      return {
        snapshot: next,
        matchId: next.match.matchId,
      };
    }
  }

  if (!next.room) {
    next = await client.createRoom({
      displayName: session?.displayName || DEMO_DISPLAY_NAME,
      maxPlayers: 4,
    });
  }

  if (client.supportsSandboxTools() && (next.room?.playerSummaries.length ?? 0) < 4) {
    next = await client.fillRoomWithMockPlayers(4);
  }

  const selfSeatReady =
    next.room?.playerSummaries.find((player) => player.playerId === next.room?.selfPlayerId)?.ready ?? false;
  if (!selfSeatReady) {
    next = await client.toggleReady(true);
  }

  if (!next.match && next.room?.canStartMatch) {
    next = await client.startMatch();
  }

  if (!next.match) {
    next = await client.reattachSession();
  }

  return next.match?.matchId
    ? {
        snapshot: next,
        matchId: next.match.matchId,
      }
    : {
        snapshot: next,
      };
}
