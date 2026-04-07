import type { BoardUiPoint } from "@siedler/shared-types";

export interface RoadSegmentGeometry {
  start: BoardUiPoint;
  end: BoardUiPoint;
  width: number;
  hitWidth: number;
  length: number;
  baseLength: number;
}

export interface IntersectionPieceGeometry {
  roadWidth: number;
  settlementWidth: number;
  settlementHeight: number;
  cityWidth: number;
  cityHeight: number;
}

export function createRoadSegmentGeometry(a: BoardUiPoint, b: BoardUiPoint): RoadSegmentGeometry {
  const baseLength = Math.hypot(b.x - a.x, b.y - a.y);
  const direction = baseLength > 0 ? { x: (b.x - a.x) / baseLength, y: (b.y - a.y) / baseLength } : { x: 0, y: 0 };
  const width = clamp(baseLength * 0.12, 7, 11);
  const inset = clamp(baseLength * 0.23, width * 1.35, Math.max(baseLength * 0.32, width * 1.5));
  const usableLength = Math.max(baseLength - inset * 2, baseLength * 0.34);
  const midpoint = {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
  const halfLength = usableLength / 2;

  return {
    start: {
      x: midpoint.x - direction.x * halfLength,
      y: midpoint.y - direction.y * halfLength,
    },
    end: {
      x: midpoint.x + direction.x * halfLength,
      y: midpoint.y + direction.y * halfLength,
    },
    width,
    hitWidth: Math.max(width * 2.5, 18),
    length: usableLength,
    baseLength,
  };
}

export function createIntersectionPieceGeometry(position: BoardUiPoint, adjacentPositions: BoardUiPoint[]): IntersectionPieceGeometry {
  const referenceLength = selectReferenceEdgeLength(position, adjacentPositions);
  const roadWidth = clamp(referenceLength * 0.12, 7, 11);

  return {
    roadWidth,
    settlementWidth: clamp(referenceLength * 0.3, 18, 26),
    settlementHeight: clamp(referenceLength * 0.4, 24, 34),
    cityWidth: clamp(referenceLength * 0.34, 22, 30),
    cityHeight: clamp(referenceLength * 0.34, 22, 30),
  };
}

function selectReferenceEdgeLength(position: BoardUiPoint, adjacentPositions: BoardUiPoint[]): number {
  const distances = adjacentPositions
    .map((adjacent) => Math.hypot(adjacent.x - position.x, adjacent.y - position.y))
    .filter((distance) => distance > 0)
    .sort((left, right) => left - right);

  return distances[0] ?? 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
