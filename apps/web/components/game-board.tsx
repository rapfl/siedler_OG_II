"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { createBoardPresentation } from "../lib/ui/board-presentation";
import { getBoardHoverLabel } from "../lib/ui/board-hover-label";
import { buildPlayerLookup } from "../lib/ui/view-model";
import { Application, Assets, Circle, Container, Graphics, Sprite, Text, TextStyle, Texture } from "pixi.js";
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

const TILE_TEXTURE_URLS: Record<string, string> = {
  wood: "/tiles/wood.svg",
  brick: "/tiles/brick.svg",
  sheep: "/tiles/sheep.svg",
  wheat: "/tiles/wheat.svg",
  ore: "/tiles/ore.svg",
  desert: "/tiles/desert.svg",
};

const RESOURCE_COLORS: Record<string, number> = {
  wood: 0x355b2f,
  brick: 0x7a332d,
  sheep: 0xa9c690,
  wheat: 0xd8b448,
  ore: 0x8f948b,
  desert: 0xb0a489,
};

const PLAYER_COLORS: Record<string, number> = {
  red: 0xb85b53,
  blue: 0x5b7484,
  white: 0xe5ded4,
  orange: 0xd19a42,
  neutral: 0x9a9389,
};

const harborStyle = new TextStyle({
  fill: 0xe9d7bc,
  fontFamily: "Noto Serif",
  fontSize: 11,
  fontWeight: "700",
  letterSpacing: 1.2,
});

const tokenStyle = new TextStyle({
  fill: 0x2a2117,
  fontFamily: "Work Sans",
  fontSize: 18,
  fontWeight: "700",
});

const resourceStyle = new TextStyle({
  fill: 0xf2e7d6,
  fontFamily: "Work Sans",
  fontSize: 10,
  fontWeight: "700",
  letterSpacing: 1.4,
});

const tokenHotStyle = new TextStyle({
  fill: 0x8d3429,
  fontFamily: "Work Sans",
  fontSize: 18,
  fontWeight: "800",
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
  const texturesRef = useRef<Record<string, Texture>>({});
  const [renderError, setRenderError] = useState<string>();
  const playerLookup = useMemo(() => buildPlayerLookup(room), [room]);
  const hoverLabel = getBoardHoverLabel(mode);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    let disposed = false;
    let observer: ResizeObserver | undefined;
    let localApp: Application | null = null;
    let appInitialized = false;

    try {
      const app = new Application();
      localApp = app;

      const setup = async () => {
        try {
          await app.init({
            resizeTo: host,
            backgroundAlpha: 0,
            antialias: true,
            autoDensity: true,
          });
          appInitialized = true;

          if (disposed) {
            safeDestroyApplication(app, appInitialized);
            return;
          }

          const loadedEntries = await Promise.all(
            Object.entries(TILE_TEXTURE_URLS).map(async ([key, url]) => {
              const tex = await Assets.load<Texture>(url);
              return [key, tex] as [string, Texture];
            }),
          );
          texturesRef.current = Object.fromEntries(loadedEntries);

          appRef.current = app;
          host.replaceChildren(app.canvas);
          renderRef.current();
        } catch (error) {
          setRenderError(error instanceof Error ? error.message : "Pixi renderer konnte nicht initialisiert werden.");
          safeDestroyApplication(app, appInitialized);
        }
      };

      void setup();

      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(() => {
          renderRef.current();
        });
        observer.observe(host);
      }
    } catch (error) {
      setRenderError(error instanceof Error ? error.message : "Pixi renderer konnte nicht vorbereitet werden.");
    }

    return () => {
      disposed = true;
      observer?.disconnect();
      onHoverTargetChange?.(undefined);
      safeDestroyApplication(localApp, appInitialized);
      if (appRef.current === localApp) {
        appRef.current = null;
      }
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
        new Map(Array.from(playerLookup, ([playerId, player]) => [playerId, player.color])),
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
      backdrop.fill(0x0d1520);
      root.addChild(backdrop);

      const vignette = new Graphics();
      vignette.ellipse(width / 2, height / 2, width * 0.44, height * 0.4);
      vignette.fill({ color: 0x1a3860, alpha: 0.18 });
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
        const polyCoords = hex.polygon.flatMap((point) => [point.x, point.y]);
        const xs = hex.polygon.map((p) => p.x);
        const ys = hex.polygon.map((p) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const texture = texturesRef.current[hex.resourceType];
        if (texture) {
          const sprite = new Sprite(texture);
          sprite.x = minX;
          sprite.y = minY;
          sprite.width = maxX - minX;
          sprite.height = maxY - minY;
          const spriteMask = new Graphics();
          spriteMask.poly(polyCoords);
          spriteMask.fill(0xffffff);
          root.addChild(spriteMask);
          sprite.mask = spriteMask;
          root.addChild(sprite);
        } else {
          const fill = new Graphics();
          fill.poly(polyCoords);
          fill.fill(resolveResourceColor(hex.resourceType), 0.97);
          root.addChild(fill);
        }

        const shape = new Graphics();
        shape.poly(polyCoords);
        shape.stroke({
          color: legalHexIds.has(hex.hexId) ? 0xf0cf6f : 0xc8daf0,
          width: legalHexIds.has(hex.hexId) ? 5 : 2,
          alpha: legalHexIds.has(hex.hexId) ? 0.98 : 0.14,
        });
        if (legalHexIds.has(hex.hexId)) {
          shape.fill({ color: 0xf0cf6f, alpha: 0.15 });
          enableInteraction(
            shape,
            () => onHexSelect?.(hex.hexId),
            () => onHoverTargetChange?.(hoverLabel),
            () => onHoverTargetChange?.(undefined),
          );
        }
        root.addChild(shape);

        const token = new Graphics();
        token.circle(hex.center.x, hex.center.y + 6, 20);
        token.fill(0xf2e8d4);
        token.stroke({ color: 0x7a8aaa, width: 2, alpha: 0.4 });
        root.addChild(token);

        const tokenNumber = hex.tokenNumber;
        const tokenText = new Text(tokenNumber?.toString() ?? "D", isHotNumber(tokenNumber) ? tokenHotStyle : tokenStyle);
        tokenText.anchor.set(0.5);
        tokenText.x = hex.center.x;
        tokenText.y = hex.center.y + 4;
        root.addChild(tokenText);


        const pips = probabilityPipCount(tokenNumber);
        if (pips > 0) {
          const pipRow = new Graphics();
          const pipSpacing = 7;
          const startX = hex.center.x - ((pips - 1) * pipSpacing) / 2;
          for (let index = 0; index < pips; index += 1) {
            pipRow.circle(startX + index * pipSpacing, hex.center.y + 24, 2.2);
          }
          pipRow.fill(isHotNumber(tokenNumber) ? 0x8d3429 : 0x4a5878);
          root.addChild(pipRow);
        }

        if (hex.hasRobber) {
          const robber = new Graphics();
          robber.circle(hex.center.x + 42, hex.center.y - 34, 14);
          robber.fill(0x08101c);
          robber.stroke({ color: 0xe9c349, width: 2, alpha: 0.82 });
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
            color: legalEdgeIds.has(edge.edgeId) ? 0xf0cf6f : 0xc8daf0,
            width: legalEdgeIds.has(edge.edgeId) ? 8 : 3,
            alpha: legalEdgeIds.has(edge.edgeId) ? 0.95 : 0.12,
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
            () => onHoverTargetChange?.(hoverLabel),
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

        const isLegal = legalIntersectionIds.has(intersection.intersectionId);
        const dot = new Graphics();
        dot.circle(intersection.position.x, intersection.position.y, isLegal ? 9 : 5);
        dot.fill(isLegal ? 0xf0cf6f : 0xc8daf0);
        dot.alpha = isLegal ? 1 : 0.42;
        root.addChild(dot);

        if (legalIntersectionIds.has(intersection.intersectionId)) {
          const selectIntersection = () => onIntersectionSelect?.(intersection.intersectionId);

          dot.hitArea = new Circle(intersection.position.x, intersection.position.y, 22);
          enableInteraction(
            dot,
            selectIntersection,
            () => onHoverTargetChange?.(hoverLabel),
            () => onHoverTargetChange?.(undefined),
          );

          const ring = new Graphics();
          ring.circle(intersection.position.x, intersection.position.y, 18);
          ring.stroke({ color: 0xf0cf6f, width: 3, alpha: 0.84 });
          ring.hitArea = new Circle(intersection.position.x, intersection.position.y, 22);
          enableInteraction(
            ring,
            selectIntersection,
            () => onHoverTargetChange?.(hoverLabel),
            () => onHoverTargetChange?.(undefined),
          );
          root.addChild(ring);

          const hit = new Graphics();
          hit.circle(intersection.position.x, intersection.position.y, 22);
          hit.hitArea = new Circle(intersection.position.x, intersection.position.y, 24);
          enableInteraction(
            hit,
            selectIntersection,
            () => onHoverTargetChange?.(hoverLabel),
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
  }, [board, room, match, mode, playerLookup, onEdgeSelect, onHexSelect, onHoverTargetChange, onIntersectionSelect, hoverLabel]);

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
  graphic.on("pointerdown", onTap);
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

function probabilityPipCount(tokenNumber: number | undefined): number {
  switch (tokenNumber) {
    case 2:
    case 12:
      return 1;
    case 3:
    case 11:
      return 2;
    case 4:
    case 10:
      return 3;
    case 5:
    case 9:
      return 4;
    case 6:
    case 8:
      return 5;
    default:
      return 0;
  }
}

function isHotNumber(tokenNumber: number | undefined): boolean {
  return tokenNumber === 6 || tokenNumber === 8;
}

function safeDestroyApplication(app: Application | null, initialized: boolean) {
  if (!app || !initialized) {
    return;
  }

  try {
    app.destroy();
  } catch {
    // Pixi can throw during teardown when init never completed cleanly.
  }
}
