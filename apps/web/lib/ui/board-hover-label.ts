import type { MatchCommandType } from "@siedler/shared-types";

export function getBoardHoverLabel(mode: MatchCommandType | undefined): string | undefined {
  switch (mode) {
    case "MOVE_ROBBER":
      return "Raeuber-Ziel";
    case "PLACE_INITIAL_ROAD":
    case "BUILD_ROAD":
      return "Legale Strasse";
    case "PLACE_INITIAL_SETTLEMENT":
    case "BUILD_SETTLEMENT":
    case "UPGRADE_CITY":
      return "Legaler Baupunkt";
    default:
      return undefined;
  }
}
