import { describe, expect, it } from "vitest";

import { createBoardTemplate } from "@siedler/game-engine";

import { createBoardPresentation } from "../lib/ui/board-presentation";

describe("board presentation", () => {
  it("keeps projected hex polygons within the board bounds and below giant-blob scale", () => {
    const board = createBoardTemplate();
    const presentation = createBoardPresentation(board, 1200, 800, new Map());

    for (const hex of presentation.hexes) {
      const xs = hex.polygon.map((point) => point.x);
      const ys = hex.polygon.map((point) => point.y);
      const width = Math.max(...xs) - Math.min(...xs);
      const height = Math.max(...ys) - Math.min(...ys);

      expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...xs)).toBeLessThanOrEqual(presentation.width);
      expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...ys)).toBeLessThanOrEqual(presentation.height);
      expect(width).toBeLessThan(presentation.width / 2);
      expect(height).toBeLessThan(presentation.height / 2);
    }
  });

  it("preserves a faithful hex-grid geometry instead of warping center spacing", () => {
    const board = createBoardTemplate();
    const presentation = createBoardPresentation(board, 1200, 800, new Map());
    const distanceRatios = Object.values(board.hexes)
      .flatMap((hex) =>
        hex.adjacentHexIds
          .filter((neighborId) => hex.hexId < neighborId)
          .map((neighborId) => {
            const sourceNeighbor = board.hexes[neighborId]!;
            const presentedHex = presentation.hexes.find((entry) => entry.hexId === hex.hexId)!;
            const presentedNeighbor = presentation.hexes.find((entry) => entry.hexId === neighborId)!;
            const sourceDistance = Math.hypot(
              sourceNeighbor.uiCenter.x - hex.uiCenter.x,
              sourceNeighbor.uiCenter.y - hex.uiCenter.y,
            );
            const screenDistance = Math.hypot(
              presentedNeighbor.center.x - presentedHex.center.x,
              presentedNeighbor.center.y - presentedHex.center.y,
            );

            return screenDistance / sourceDistance;
          }),
      )
      .sort((left, right) => left - right);

    expect(distanceRatios.length).toBeGreaterThan(0);
    expect(distanceRatios.at(-1)! / distanceRatios[0]!).toBeLessThan(1.02);
  });
});
