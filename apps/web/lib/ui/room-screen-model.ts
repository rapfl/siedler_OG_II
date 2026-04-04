import type { BrowserSessionState } from "../session/storage";
import { roomStatusBadge } from "./view-model";
import type { RoomView } from "@siedler/shared-types";

export function createRoomScreenModel(
  room: RoomView | undefined,
  session: BrowserSessionState | undefined,
  sandboxCount: number,
) {
  const badge = room ? roomStatusBadge(room) : { label: "Room", tone: "muted" as const };
  const selfPlayerId = room?.selfPlayerId;
  const selfSeat = room?.seatStates.find((seat) => seat.occupantPlayerId === selfPlayerId);
  const selfSummary = room?.playerSummaries.find((player) => player.playerId === selfPlayerId);

  return {
    badge,
    selfPlayerId,
    selfSeat,
    selfSummary,
    sessionName: session?.displayName ?? "Keine Session",
    sandboxCount,
  };
}
