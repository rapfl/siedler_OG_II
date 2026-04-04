import type { MatchCommandType } from "@siedler/shared-types";

export type ForcedActionSurface = "board" | "trade" | "dev" | "inline" | null;
export type MatchUtilityPanel = "trade" | "dev" | "log" | "tools" | null;

export function requiredActionSurface(action: MatchCommandType | undefined): ForcedActionSurface {
  switch (action) {
    case "PLACE_INITIAL_SETTLEMENT":
    case "PLACE_INITIAL_ROAD":
    case "MOVE_ROBBER":
    case "BUILD_ROAD":
      return "board";
    case "RESPOND_TRADE":
      return "trade";
    case "PICK_YEAR_OF_PLENTY_RESOURCE":
    case "PICK_MONOPOLY_RESOURCE_TYPE":
      return "dev";
    case "DISCARD_RESOURCES":
    case "STEAL_RESOURCE":
      return "inline";
    default:
      return null;
  }
}

export function requiredActionPanel(action: MatchCommandType | undefined): MatchUtilityPanel {
  const surface = requiredActionSurface(action);
  if (surface === "trade") {
    return "trade";
  }
  if (surface === "dev") {
    return "dev";
  }
  return null;
}
