import { describe, expect, it } from "vitest";

import { getBoardHoverLabel } from "../lib/ui/board-hover-label";

describe("board hover labels", () => {
  it("uses semantic player-facing labels without leaking internal graph ids", () => {
    const labels = [
      getBoardHoverLabel("PLACE_INITIAL_ROAD"),
      getBoardHoverLabel("PLACE_INITIAL_SETTLEMENT"),
      getBoardHoverLabel("MOVE_ROBBER"),
      getBoardHoverLabel("UPGRADE_CITY"),
    ].filter((label): label is string => label !== undefined);

    expect(labels).toEqual(["Legale Strasse", "Legaler Baupunkt", "Raeuber-Ziel", "Legaler Baupunkt"]);

    for (const label of labels) {
      expect(label).not.toContain("edge-");
      expect(label).not.toContain("intersection-");
    }
  });
});
