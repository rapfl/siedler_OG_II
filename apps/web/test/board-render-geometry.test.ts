import { describe, expect, it } from "vitest";

import { createBoardTemplate } from "@siedler/game-engine";

import { createIntersectionPieceGeometry, createRoadSegmentGeometry } from "../lib/ui/board-render-geometry";
import { createStaticBoardPresentation } from "../lib/ui/board-presentation";

describe("board render geometry", () => {
  it("insets road segments away from intersections while keeping them aligned to the owning edge", () => {
    const board = createBoardTemplate();
    const presentation = createStaticBoardPresentation(board, 1200, 800);
    const edge = presentation.edges[0]!;
    const geometry = createRoadSegmentGeometry(edge.a, edge.b);
    const originalLength = Math.hypot(edge.b.x - edge.a.x, edge.b.y - edge.a.y);
    const renderedLength = Math.hypot(geometry.end.x - geometry.start.x, geometry.end.y - geometry.start.y);
    const originalMidpoint = { x: (edge.a.x + edge.b.x) / 2, y: (edge.a.y + edge.b.y) / 2 };
    const renderedMidpoint = { x: (geometry.start.x + geometry.end.x) / 2, y: (geometry.start.y + geometry.end.y) / 2 };

    expect(renderedLength).toBeLessThan(originalLength);
    expect(renderedLength).toBeGreaterThan(originalLength * 0.3);
    expect(renderedMidpoint.x).toBeCloseTo(originalMidpoint.x, 6);
    expect(renderedMidpoint.y).toBeCloseTo(originalMidpoint.y, 6);
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.hitWidth).toBeGreaterThan(geometry.width);
  });

  it("derives building sizes from adjacent edge geometry instead of fixed oversized pixels", () => {
    const board = createBoardTemplate();
    const presentation = createStaticBoardPresentation(board, 1200, 800);
    const intersection = presentation.intersections.find((entry) => entry.adjacentIntersectionIds.length >= 2)!;
    const adjacentPositions = intersection.adjacentIntersectionIds
      .map((neighborId) => presentation.intersections.find((entry) => entry.intersectionId === neighborId)!.position);
    const geometry = createIntersectionPieceGeometry(intersection.position, adjacentPositions);

    expect(geometry.settlementWidth).toBeGreaterThan(0);
    expect(geometry.settlementHeight).toBeGreaterThan(geometry.settlementWidth);
    expect(geometry.cityWidth).toBeGreaterThanOrEqual(geometry.settlementWidth);
    expect(geometry.roadWidth).toBeLessThan(geometry.settlementWidth);
  });
});
