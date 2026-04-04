"use client";

import { useMemo } from "react";

import { buildPlayerLookup, playerColorToken } from "../lib/ui/view-model";
import type { BoardUiPoint, GeneratedBoard, MatchCommandType, MatchView, RoomView } from "@siedler/shared-types";

interface GameBoardProps {
  board: GeneratedBoard | undefined;
  room: RoomView | undefined;
  match: MatchView | undefined;
  mode: MatchCommandType | undefined;
  onHexSelect?: (hexId: string) => void;
  onIntersectionSelect?: (intersectionId: string) => void;
  onEdgeSelect?: (edgeId: string) => void;
}

const RESOURCE_CLASS: Record<string, string> = {
  wood: "hex-wood",
  brick: "hex-brick",
  sheep: "hex-sheep",
  wheat: "hex-wheat",
  ore: "hex-ore",
  desert: "hex-desert",
};

export function GameBoard({
  board,
  room,
  match,
  mode,
  onHexSelect,
  onIntersectionSelect,
  onEdgeSelect,
}: GameBoardProps) {
  const layout = useMemo(() => createBoardLayout(board), [board]);
  const playerLookup = useMemo(() => buildPlayerLookup(room), [room]);

  if (!board || !match) {
    return (
      <div className="board-shell board-empty board-stage">
        <p>Kein Brett geladen. Starte ein Match oder synchronisiere den Snapshot.</p>
      </div>
    );
  }

  const legalHexIds = new Set(mode === "MOVE_ROBBER" ? match.legalRobberHexIds ?? [] : []);
  const legalIntersectionIds = new Set(
    mode === "PLACE_INITIAL_SETTLEMENT" || mode === "BUILD_SETTLEMENT"
      ? match.legalSettlementIntersectionIds ?? []
      : mode === "UPGRADE_CITY"
        ? match.legalCityIntersectionIds ?? []
        : [],
  );
  const legalEdgeIds = new Set(
    mode === "PLACE_INITIAL_ROAD" || mode === "BUILD_ROAD" ? match.legalRoadEdgeIds ?? [] : [],
  );

  return (
    <div className="board-shell board-stage">
      <svg
        className="game-board"
        viewBox={`${layout.bounds.minX} ${layout.bounds.minY} ${layout.bounds.width} ${layout.bounds.height}`}
        role="img"
        aria-label="Spielbrett"
      >
        <defs>
          <filter id="boardGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0.1" stdDeviation="0.22" floodColor="rgba(5, 5, 16, 0.4)" />
          </filter>
          <filter id="hexTexture" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11" result="noise" />
            <feColorMatrix
              in="noise"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 0.08 0"
            />
            <feBlend in="SourceGraphic" mode="overlay" />
          </filter>
          <radialGradient id="boardVignette" cx="50%" cy="48%" r="58%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.03)" />
            <stop offset="70%" stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.34)" />
          </radialGradient>
        </defs>

        <rect
          x={layout.bounds.minX}
          y={layout.bounds.minY}
          width={layout.bounds.width}
          height={layout.bounds.height}
          className="board-backdrop"
          rx="1.6"
        />
        <rect
          x={layout.bounds.minX}
          y={layout.bounds.minY}
          width={layout.bounds.width}
          height={layout.bounds.height}
          fill="url(#boardVignette)"
          rx="1.6"
        />

        {Object.values(board.harbors).map((harbor) => {
          const a = layout.intersectionPositions[harbor.intersectionIds[0]];
          const b = layout.intersectionPositions[harbor.intersectionIds[1]];
          if (!a || !b) {
            return null;
          }

          const { x, y } = positionHarborLabel(a, b, layout.center);
          return (
            <text key={harbor.harborId} x={x} y={y} className="harbor-label">
              {harborLabel(harbor.harborType)}
            </text>
          );
        })}

        {board.hexOrder.map((hexId) => {
          const hex = board.hexes[hexId];
          if (!hex) {
            return null;
          }
          const center = layout.hexCenters[hexId]!;
          const polygon = hexPolygonPoints(hexId, center.x, center.y, 1.08);

          return (
            <g key={hexId} filter="url(#boardGlow)">
              <polygon
                points={polygon}
                className={`hex-shape ${RESOURCE_CLASS[hex.resourceType]} ${legalHexIds.has(hexId) ? "hex-legal" : ""}`}
                filter="url(#hexTexture)"
                onClick={() => {
                  if (legalHexIds.has(hexId)) {
                    onHexSelect?.(hexId);
                  }
                }}
              />
              <circle cx={center.x} cy={center.y} r="0.34" className="token-circle" />
              <text x={center.x} y={center.y + 0.07} className="token-value">
                {hex.tokenNumber ?? "D"}
              </text>
              <text x={center.x} y={center.y - 0.68} className="hex-label">
                {resourceLabel(hex.resourceType)}
              </text>
              {hex.hasRobber ? (
                <g>
                  <circle cx={center.x + 0.64} cy={center.y - 0.64} r="0.24" className="robber-dot" />
                  <text x={center.x + 0.64} y={center.y - 0.58} className="robber-label">
                    X
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}

        {Object.values(board.edges).map((edge) => {
          const a = layout.intersectionPositions[edge.intersectionAId];
          const b = layout.intersectionPositions[edge.intersectionBId];
          if (!a || !b) {
            return null;
          }

          const owner = edge.road?.ownerPlayerId ? playerLookup.get(edge.road.ownerPlayerId) : undefined;
          return (
            <g key={edge.edgeId}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className={`edge-base ${edge.road ? `road-line ${playerColorToken(owner?.color)}` : "edge-empty"} ${legalEdgeIds.has(edge.edgeId) ? "edge-legal" : ""}`}
              />
              {legalEdgeIds.has(edge.edgeId) ? (
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  className="edge-hitbox"
                  onClick={() => onEdgeSelect?.(edge.edgeId)}
                />
              ) : null}
            </g>
          );
        })}

        {Object.values(board.intersections).map((intersection) => {
          const position = layout.intersectionPositions[intersection.intersectionId];
          if (!position) {
            return null;
          }
          const owner = intersection.building?.ownerPlayerId ? playerLookup.get(intersection.building.ownerPlayerId) : undefined;
          return (
            <g key={intersection.intersectionId}>
              {intersection.building ? (
                intersection.building.buildingType === "city" ? (
                  <rect
                    x={position.x - 0.18}
                    y={position.y - 0.18}
                    width="0.36"
                    height="0.36"
                    rx="0.08"
                    className={`building-shape ${playerColorToken(owner?.color)}`}
                  />
                ) : (
                  <polygon
                    points={settlementPoints(position.x, position.y)}
                    className={`building-shape ${playerColorToken(owner?.color)}`}
                  />
                )
              ) : (
                <circle
                  cx={position.x}
                  cy={position.y}
                  r="0.09"
                  className={`intersection-dot ${legalIntersectionIds.has(intersection.intersectionId) ? "intersection-legal" : ""}`}
                  onClick={() => {
                    if (legalIntersectionIds.has(intersection.intersectionId)) {
                      onIntersectionSelect?.(intersection.intersectionId);
                    }
                  }}
                />
              )}
              {legalIntersectionIds.has(intersection.intersectionId) ? (
                <circle
                  cx={position.x}
                  cy={position.y}
                  r="0.21"
                  className="intersection-ring"
                  onClick={() => onIntersectionSelect?.(intersection.intersectionId)}
                />
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function createBoardLayout(board: GeneratedBoard | undefined) {
  if (!board) {
    return {
      center: { x: 50, y: 50 },
      bounds: { minX: 0, minY: 0, width: 100, height: 100 },
      hexCenters: {} as Record<string, BoardUiPoint>,
      intersectionPositions: {} as Record<string, BoardUiPoint>,
    };
  }

  const sourceHexCenters = Object.values(board.hexes).map((hex) => hex.uiCenter);
  const xs = sourceHexCenters.map((point) => point.x);
  const ys = sourceHexCenters.map((point) => point.y);
  const rawCenter = {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
  const span = {
    x: Math.max(...xs) - Math.min(...xs),
    y: Math.max(...ys) - Math.min(...ys),
  };

  const project = (point: BoardUiPoint) => projectBoardPoint(point, rawCenter, span);

  const hexCenters = Object.fromEntries(
    Object.entries(board.hexes).map(([hexId, hex]) => [hexId, project(hex.uiCenter)]),
  ) as Record<string, BoardUiPoint>;

  const intersectionPositions = Object.fromEntries(
    Object.entries(board.intersections).map(([intersectionId, intersection]) => [intersectionId, project(intersection.uiPosition)]),
  ) as Record<string, BoardUiPoint>;

  const projectedPoints = [...Object.values(hexCenters), ...Object.values(intersectionPositions)];
  const padding = 3.1;
  const minX = Math.min(...projectedPoints.map((point) => point.x)) - padding;
  const maxX = Math.max(...projectedPoints.map((point) => point.x)) + padding;
  const minY = Math.min(...projectedPoints.map((point) => point.y)) - padding;
  const maxY = Math.max(...projectedPoints.map((point) => point.y)) + padding;

  return {
    center: project(rawCenter),
    bounds: {
      minX,
      minY,
      width: maxX - minX,
      height: maxY - minY,
    },
    hexCenters,
    intersectionPositions,
  };
}

function projectBoardPoint(point: BoardUiPoint, center: BoardUiPoint, span: BoardUiPoint): BoardUiPoint {
  const nx = span.x === 0 ? 0 : (point.x - center.x) / span.x;
  const ny = span.y === 0 ? 0 : (point.y - center.y) / span.y;

  const stretched = {
    x: (point.x - center.x) * 1.08,
    y: (point.y - center.y) * 0.94,
  };

  const drift = {
    x: Math.sin(ny * Math.PI * 1.2) * 0.48 + nx * ny * 0.9,
    y: Math.sin(nx * Math.PI * 1.6) * 0.34 - nx * nx * 0.82 + ny * 0.2,
  };

  const rotated = rotatePoint(
    {
      x: center.x + stretched.x + drift.x,
      y: center.y + stretched.y + drift.y,
    },
    center,
    -7,
  );

  return rotated;
}

function rotatePoint(point: BoardUiPoint, center: BoardUiPoint, angleDegrees: number): BoardUiPoint {
  const radians = (Math.PI / 180) * angleDegrees;
  const dx = point.x - center.x;
  const dy = point.y - center.y;

  return {
    x: center.x + dx * Math.cos(radians) - dy * Math.sin(radians),
    y: center.y + dx * Math.sin(radians) + dy * Math.cos(radians),
  };
}

function positionHarborLabel(a: BoardUiPoint, b: BoardUiPoint, center: BoardUiPoint) {
  const midpoint = {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
  const dx = midpoint.x - center.x;
  const dy = midpoint.y - center.y;
  const magnitude = Math.max(Math.hypot(dx, dy), 0.001);
  const push = 0.9;

  return {
    x: midpoint.x + (dx / magnitude) * push,
    y: midpoint.y + (dy / magnitude) * push,
  };
}

function hexPolygonPoints(hexId: string, centerX: number, centerY: number, radius: number) {
  const points = [30, 90, 150, 210, 270, 330].map((angle) => {
    const radians = (Math.PI / 180) * angle;
    const radiusOffset = radius * (0.96 + hashToUnit(`${hexId}:${angle}`) * 0.1);
    return `${centerX + Math.cos(radians) * radiusOffset},${centerY + Math.sin(radians) * radiusOffset}`;
  });
  return points.join(" ");
}

function settlementPoints(centerX: number, centerY: number) {
  return [
    `${centerX},${centerY - 0.2}`,
    `${centerX + 0.16},${centerY - 0.04}`,
    `${centerX + 0.16},${centerY + 0.16}`,
    `${centerX - 0.16},${centerY + 0.16}`,
    `${centerX - 0.16},${centerY - 0.04}`,
  ].join(" ");
}

function harborLabel(harborType: string) {
  switch (harborType) {
    case "generic_3_to_1":
      return "3:1";
    case "wood_2_to_1":
      return "Holz 2:1";
    case "brick_2_to_1":
      return "Lehm 2:1";
    case "sheep_2_to_1":
      return "Wolle 2:1";
    case "wheat_2_to_1":
      return "Getreide 2:1";
    case "ore_2_to_1":
      return "Erz 2:1";
    default:
      return harborType;
  }
}

function resourceLabel(resourceType: string) {
  switch (resourceType) {
    case "wood":
      return "HOLZ";
    case "brick":
      return "LEHM";
    case "sheep":
      return "WOLLE";
    case "wheat":
      return "GETREIDE";
    case "ore":
      return "ERZ";
    default:
      return "DESERT";
  }
}

function hashToUnit(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return ((hash >>> 0) % 1000) / 1000;
}
