import { describe, expect, it } from "vitest";

import { requiredActionPanel, requiredActionSurface } from "../lib/ui/match-required-action";

describe("required action surfaces", () => {
  it("maps forced trade and dev-card actions to their required drawers", () => {
    expect(requiredActionSurface("RESPOND_TRADE")).toBe("trade");
    expect(requiredActionPanel("RESPOND_TRADE")).toBe("trade");
    expect(requiredActionSurface("PICK_YEAR_OF_PLENTY_RESOURCE")).toBe("dev");
    expect(requiredActionPanel("PICK_YEAR_OF_PLENTY_RESOURCE")).toBe("dev");
    expect(requiredActionSurface("PICK_MONOPOLY_RESOURCE_TYPE")).toBe("dev");
    expect(requiredActionPanel("PICK_MONOPOLY_RESOURCE_TYPE")).toBe("dev");
  });

  it("keeps steal visible as an inline forced action instead of hiding it in a drawer", () => {
    expect(requiredActionSurface("STEAL_RESOURCE")).toBe("inline");
    expect(requiredActionPanel("STEAL_RESOURCE")).toBeNull();
  });

  it("keeps board-first required actions on the board surface", () => {
    expect(requiredActionSurface("PLACE_INITIAL_SETTLEMENT")).toBe("board");
    expect(requiredActionSurface("PLACE_INITIAL_ROAD")).toBe("board");
    expect(requiredActionSurface("MOVE_ROBBER")).toBe("board");
    expect(requiredActionSurface("BUILD_ROAD")).toBe("board");
  });
});
