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
});
