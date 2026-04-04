"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { createBoardPresentation } from "../lib/ui/board-presentation";
import { buildPlayerLookup } from "../lib/ui/view-model";
import { Application, Container, Graphics, Text, TextStyle } from "pixi.js";
import type { GeneratedBoard, MatchCommandType, MatchView, RoomView } from "@siedler/shared-types";

interface GameBoardProps {
  board: GeneratedBoard | undefined;
  room: RoomView | undefined;
  match: MatchView | undefined;
  mode: MatchCommandType | undefined;
  onHexSelect?: (hexId: string) => void;
  onIntersectionSelect?: (intersectionId: string) => void;
  onEdgeSelect?: (edgeId: string) => void;
  onHoverTargetChange?: (target: string | undefined) => void;
}

const RESOURCE_COLORS: Record<string, number> = {
  wood: 0x1f7650,
  brick: 0x8f3a3a,
  sheep: 0x7fbf77,
  wheat: 0xcf9f3f,
  ore: 0x6874aa,
  desert: 0x9b896b,
};

const PLAYER_COLORS: Record<string, number> = {
  red: 0xd90368,
  blue: 0x3b82f6,
  white: 0xe3dfff,
  orange: 0xfb8b24,
  neutral: 0xb9a9d6,
};

const harborStyle = new TextStyle({
  fill: 0xf8e9d7,
  fontSize: 11,
  fontWeight: "700",
  letterSpacing: 1.2,
});

const tokenStyle = new TextStyle({
  fill: 0x23140d,
  fontSize: 18,
  fontWeight: "700",
});

const resourceStyle = new TextStyle({
  fill: 0xfff1dd,
  fontSize: 10,
  fontWeight: "700",
  letterSpacing: 1.4,
});

export function GameBoard({
  board,
  room,
  match,
  mode,
  onHexSelect,
  onIntersectionSelect,
  onEdgeSelect,
  onHoverTargetChange,
}: GameBoardProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const renderRef = useRef<() => void>(() => {});
  const [renderError, setRenderError] = useState<string>();
  const playerLookup = useMemo(() => buildPlayerLookup(room), [room]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    let disposed = false;
    const app = new Application();
    appRef.current = app;

    const setup = async () => {
      try {
        await app.init({
          resizeTo: host,
          backgroundAlpha: 0,
          antialias: true,
          autoDensity: true,
        });

        if (disposed) {
          app.destroy();
          return;
        }

        host.replaceChildren(app.canvas);
        renderRef.current();
      } catch (error) {
        setRenderError(error instanceof Error ? error.message : "Pixi renderer konnte nicht initialisiert werden.");
      }
    };

    void setup();

    const observer = new ResizeObserver(() => {
      renderRef.current();
    });
    observer.observe(host);

    return () => {
      disposed = true;
      observer.disconnect();
      onHoverTargetChange?.(undefined);
      app.destroy();
      appRef.current = null;
    };
  }, [onHoverTargetChange]);

  renderRef.current = () => {
    const app = appRef.current;
    const host = hostRef.current;
    if (!app || !host || !board || !match) {
      return;
    }

    try {
      setRenderError(undefined);

      const width = Math.max(host.clientWidth, 320);
      const height = Math.max(host.clientHeight, 320);
      const presentation = createBoardPresentation(
        board,
        width,
        height,
        new Map(Array.from(playerLookup.entries()).map(([playerId, player]) => [playerId, player.color])),
      );

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

      for (const child of app.stage.removeChildren()) {
        child.destroy({ children: true });
      }

      const root = new Container();
      app.stage.addChild(root);

      const backdrop = new Graphics();
      backdrop.roundRect(0, 0, width, height, 32);
      backdrop.fill(0x1b130e);
      root.addChild(backdrop);

      const vignette = new Graphics();
      vignette.ellipse(width / 2, height / 2, width * 0.44, height * 0.4);
      vignette.fill({ color: 0x6b3f18, alpha: 0.12 });
      root.addChild(vignette);

      for (const harbor of presentation.harbors) {
        const label = new Text(harborLabel(harbor.harborType), harborStyle);
        label.anchor.set(0.5);
        label.x = harbor.labelPosition.x;
        label.y = harbor.labelPosition.y;
        label.alpha = 0.9;
        root.addChild(label);
      }

      for (const hex of presentation.hexes) {
        const shape = new Graphics();
        shape.poly(hex.polygon.flatMap((point) => [point.x, point.y]));
        shape.fill(resolveResourceColor(hex.resourceType), 0.97);
        shape.stroke({
          color: legalHexIds.has(hex.hexId) ? 0xfb8b24 : 0xf8e9d7,
          width: legalHexIds.has(hex.hexId) ? 4 : 2,
          alpha: legalHexIds.has(hex.hexId) ? 0.95 : 0.16,
        });
        if (legalHexIds.has(hex.hexId)) {
          enableInteraction(
            shape,
            () => onHexSelect?.(hex.hexId),
            () => onHoverTargetChange?.(`Raeuber auf ${hex.hexId}`),
            () => onHoverTargetChange?.(undefined),
          );
        }
        root.addChild(shape);

        const token = new Graphics();
        token.circle(hex.center.x, hex.center.y, 18);
        token.fill(0xf6ecd6);
        token.stroke({ color: 0x5c3116, width: 2, alpha: 0.28 });
        root.addChild(token);

        const tokenText = new Text(hex.tokenNumber?.toString() ?? "D", tokenStyle);
        tokenText.anchor.set(0.5);
        tokenText.x = hex.center.x;
        tokenText.y = hex.center.y;
        root.addChild(tokenText);

        const resourceText = new Text(resourceLabel(hex.resourceType), resourceStyle);
        resourceText.anchor.set(0.5);
        resourceText.x = hex.center.x;
        resourceText.y = hex.center.y - 42;
        resourceText.alpha = 0.84;
        root.addChild(resourceText);

        if (hex.hasRobber) {
          const robber = new Graphics();
          robber.circle(hex.center.x + 38, hex.center.y - 36, 14);
          robber.fill(0x150a13);
          robber.stroke({ color: 0xfb8b24, width: 2, alpha: 0.7 });
          root.addChild(robber);
        }
      }

      for (const edge of presentation.edges) {
        const line = new Graphics();
        line.moveTo(edge.a.x, edge.a.y);
        line.lineTo(edge.b.x, edge.b.y);
        if (edge.ownerColor) {
          line.stroke({ color: resolvePlayerColor(edge.ownerColor), width: 8, alpha: 0.96 });
        } else {
          line.stroke({
            color: legalEdgeIds.has(edge.edgeId) ? 0xfb8b24 : 0xf6e8d0,
            width: legalEdgeIds.has(edge.edgeId) ? 6 : 3,
            alpha: legalEdgeIds.has(edge.edgeId) ? 0.92 : 0.13,
          });
        }
        root.addChild(line);

        if (legalEdgeIds.has(edge.edgeId)) {
          const hit = new Graphics();
          hit.moveTo(edge.a.x, edge.a.y);
          hit.lineTo(edge.b.x, edge.b.y);
          hit.stroke({ color: 0xffffff, width: 20, alpha: 0.001 });
          enableInteraction(
            hit,
            () => onEdgeSelect?.(edge.edgeId),
            () => onHoverTargetChange?.(`Strasse auf ${edge.edgeId}`),
            () => onHoverTargetChange?.(undefined),
          );
          root.addChild(hit);
        }
      }

      for (const intersection of presentation.intersections) {
        if (intersection.building) {
          const building = new Graphics();
          const color = PLAYER_COLORS[intersection.building.ownerColor ?? "neutral"] ?? PLAYER_COLORS.neutral;
          if (intersection.building.buildingType === "city") {
            building.roundRect(intersection.position.x - 12, intersection.position.y - 12, 24, 24, 6);
          } else {
            building.poly([
              intersection.position.x,
              intersection.position.y - 16,
              intersection.position.x + 14,
              intersection.position.y - 2,
              intersection.position.x + 14,
              intersection.position.y + 14,
              intersection.position.x - 14,
              intersection.position.y + 14,
              intersection.position.x - 14,
              intersection.position.y - 2,
            ]);
          }
          building.fill(color);
          building.stroke({ color: 0xffffff, width: 2, alpha: 0.18 });
          root.addChild(building);
          continue;
        }

        const dot = new Graphics();
        dot.circle(intersection.position.x, intersection.position.y, legalIntersectionIds.has(intersection.intersectionId) ? 8 : 5);
        dot.fill(legalIntersectionIds.has(intersection.intersectionId) ? 0xfb8b24 : 0xf6e8d0);
        dot.alpha = legalIntersectionIds.has(intersection.intersectionId) ? 1 : 0.46;
        root.addChild(dot);

        if (legalIntersectionIds.has(intersection.intersectionId)) {
          const ring = new Graphics();
          ring.circle(intersection.position.x, intersection.position.y, 17);
          ring.stroke({ color: 0xfb8b24, width: 3, alpha: 0.78 });
          root.addChild(ring);

          const hit = new Graphics();
          hit.circle(intersection.position.x, intersection.position.y, 22);
          hit.fill({ color: 0xffffff, alpha: 0.001 });
          enableInteraction(
            hit,
            () => onIntersectionSelect?.(intersection.intersectionId),
            () => onHoverTargetChange?.(`Baupunkt ${intersection.intersectionId}`),
            () => onHoverTargetChange?.(undefined),
          );
          root.addChild(hit);
        }
      }
    } catch (error) {
      setRenderError(error instanceof Error ? error.message : "Pixi renderer konnte den aktuellen Spielzustand nicht zeichnen.");
    }
  };

  useEffect(() => {
    renderRef.current();
  }, [board, room, match, mode, playerLookup, onEdgeSelect, onHexSelect, onHoverTargetChange, onIntersectionSelect]);

  return (
    <div className="board-shell board-stage pixi-board-shell">
      <div ref={hostRef} className="pixi-board-host" />
      {!board || !match ? (
        <div className="board-overlay-message">
          <p>Kein Brett geladen. Starte ein Match oder synchronisiere den Snapshot.</p>
        </div>
      ) : null}
      {renderError ? (
        <div className="board-overlay-message board-overlay-message-danger">
          <p>Board Renderer Fehler: {renderError}</p>
        </div>
      ) : null}
    </div>
  );
}

function enableInteraction(
  graphic: Graphics,
  onTap: () => void,
  onHover: () => void,
  onOut: () => void,
) {
  graphic.eventMode = "static";
  graphic.cursor = "pointer";
  graphic.on("pointertap", onTap);
  graphic.on("pointerover", onHover);
  graphic.on("pointerout", onOut);
}

function harborLabel(harborType: string) {
  switch (harborType) {
    case "generic_3_to_1":
      return "3:1";
    case "wood_2_to_1":
      return "HOLZ";
    case "brick_2_to_1":
      return "LEHM";
    case "sheep_2_to_1":
      return "WOLLE";
    case "wheat_2_to_1":
      return "GETR";
    case "ore_2_to_1":
      return "ERZ";
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
      return "WUESTE";
  }
}

function resolveResourceColor(resourceType: string): number {
  return resourceType in RESOURCE_COLORS ? RESOURCE_COLORS[resourceType]! : RESOURCE_COLORS.desert!;
}

function resolvePlayerColor(color: string | undefined): number {
  return color && color in PLAYER_COLORS ? PLAYER_COLORS[color]! : PLAYER_COLORS.neutral!;
}
