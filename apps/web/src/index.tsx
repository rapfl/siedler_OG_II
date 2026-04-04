import type { PlayerView } from "../../../packages/shared-types/src/index.js";

export function renderLobbySummary(view: PlayerView): string {
  return `${view.room.roomCode} • ${view.room.playerSummaries.length}/${view.room.maxPlayers} players`;
}
