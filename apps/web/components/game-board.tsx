"use client";

import { useMemo } from "react";

import { boardBounds, buildPlayerLookup, playerColorToken } from "../lib/ui/view-model";
import type { GeneratedBoard, MatchCommandType, MatchView, RoomView } from "@siedler/shared-types";

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
  const bounds = useMemo(() => boardBounds(board), [board]);
  const playerLookup = useMemo(() => buildPlayerLookup(room), [room]);

  if (!board || !match) {
    return (
      <div className="board-shell board-empty">
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
    <div className="board-shell">
      <svg
        className="game-board"
        viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
        role="img"
        aria-label="Spielbrett"
      >
        <defs>
          <filter id="boardGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0.1" stdDeviation="0.22" floodColor="rgba(5, 5, 16, 0.4)" />
          </filter>
        </defs>

        <rect
          x={bounds.minX}
          y={bounds.minY}
          width={bounds.width}
          height={bounds.height}
          className="board-backdrop"
          rx="1.6"
        />

        {Object.values(board.harbors).map((harbor) => {
          const a = board.intersections[harbor.intersectionIds[0]]?.uiPosition;
          const b = board.intersections[harbor.intersectionIds[1]]?.uiPosition;
          if (!a || !b) {
            return null;
          }

          const x = (a.x + b.x) / 2;
          const y = (a.y + b.y) / 2;
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
          const polygon = hexPolygonPoints(hex.uiCenter.x, hex.uiCenter.y, 1.08);

          return (
            <g key={hexId} filter="url(#boardGlow)">
              <polygon
                points={polygon}
                className={`hex-shape ${RESOURCE_CLASS[hex.resourceType]} ${legalHexIds.has(hexId) ? "hex-legal" : ""}`}
                onClick={() => {
                  if (legalHexIds.has(hexId)) {
                    onHexSelect?.(hexId);
                  }
                }}
              />
              <circle cx={hex.uiCenter.x} cy={hex.uiCenter.y} r="0.34" className="token-circle" />
              <text x={hex.uiCenter.x} y={hex.uiCenter.y + 0.07} className="token-value">
                {hex.tokenNumber ?? "D"}
              </text>
              <text x={hex.uiCenter.x} y={hex.uiCenter.y - 0.68} className="hex-label">
                {resourceLabel(hex.resourceType)}
              </text>
              {hex.hasRobber ? (
                <g>
                  <circle cx={hex.uiCenter.x + 0.64} cy={hex.uiCenter.y - 0.64} r="0.24" className="robber-dot" />
                  <text x={hex.uiCenter.x + 0.64} y={hex.uiCenter.y - 0.58} className="robber-label">
                    X
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}

        {Object.values(board.edges).map((edge) => {
          const a = board.intersections[edge.intersectionAId]?.uiPosition;
          const b = board.intersections[edge.intersectionBId]?.uiPosition;
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
          const owner = intersection.building?.ownerPlayerId ? playerLookup.get(intersection.building.ownerPlayerId) : undefined;
          return (
            <g key={intersection.intersectionId}>
              {intersection.building ? (
                intersection.building.buildingType === "city" ? (
                  <rect
                    x={intersection.uiPosition.x - 0.18}
                    y={intersection.uiPosition.y - 0.18}
                    width="0.36"
                    height="0.36"
                    rx="0.08"
                    className={`building-shape ${playerColorToken(owner?.color)}`}
                  />
                ) : (
                  <polygon
                    points={settlementPoints(intersection.uiPosition.x, intersection.uiPosition.y)}
                    className={`building-shape ${playerColorToken(owner?.color)}`}
                  />
                )
              ) : (
                <circle
                  cx={intersection.uiPosition.x}
                  cy={intersection.uiPosition.y}
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
                  cx={intersection.uiPosition.x}
                  cy={intersection.uiPosition.y}
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

function hexPolygonPoints(centerX: number, centerY: number, radius: number) {
  const points = [30, 90, 150, 210, 270, 330].map((angle) => {
    const radians = (Math.PI / 180) * angle;
    return `${centerX + Math.cos(radians) * radius},${centerY + Math.sin(radians) * radius}`;
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
