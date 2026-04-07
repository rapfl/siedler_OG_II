"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { getBoardHoverLabel } from "../lib/ui/board-hover-label";
import { createIntersectionPieceGeometry, createRoadSegmentGeometry } from "../lib/ui/board-render-geometry";
import { createStaticBoardPresentation, type StaticBoardPresentation } from "../lib/ui/board-presentation";
import { buildPlayerLookup } from "../lib/ui/view-model";
import { Application, Assets, Circle, Container, Graphics, Sprite, Text, TextStyle, Texture } from "pixi.js";
import type { GeneratedBoard, HarborType, MatchCommandType, MatchView, PlayerColor, RoomView } from "@siedler/shared-types";

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

interface BoardViewport {
  width: number;
  height: number;
}

interface LegalTargets {
  hexIds: Set<string>;
  intersectionIds: Set<string>;
  edgeIds: Set<string>;
}

interface DynamicSceneRefs {
  staticKey: string;
  root: Container;
  backdrop: Graphics;
  vignette: Graphics;
  dynamicLayer: Container;
  interactionLayer: Container;
  hexOutlines: Map<string, Graphics>;
  tokens: Map<string, Graphics>;
  tokenTexts: Map<string, Text>;
  tokenPips: Map<string, Graphics>;
  robbers: Map<string, Graphics>;
  edgeLines: Map<string, Graphics>;
  intersections: Map<string, Graphics>;
  intersectionRings: Map<string, Graphics>;
  intersectionBuildings: Map<string, Graphics>;
  interactiveItems: Graphics[];
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
  const texturesRef = useRef<Record<string, Texture>>({});
  const sceneRef = useRef<DynamicSceneRefs | null>(null);
  const [renderError, setRenderError] = useState<string>();
  const [viewport, setViewport] = useState<BoardViewport>({ width: 320, height: 320 });
  const playerLookup = useMemo(() => buildPlayerLookup(room), [room]);
  const hoverLabel = getBoardHoverLabel(mode);

  const playerColors = useMemo(() => {
    return new Map(Array.from(playerLookup, ([playerId, player]) => [playerId, player.color]));
  }, [playerLookup]);

  const legalTargets = useMemo(() => {
    return {
      hexIds: new Set(mode === "MOVE_ROBBER" ? match?.legalRobberHexIds ?? [] : []),
      intersectionIds: new Set(
        mode === "PLACE_INITIAL_SETTLEMENT" || mode === "BUILD_SETTLEMENT"
          ? match?.legalSettlementIntersectionIds ?? []
          : mode === "UPGRADE_CITY"
            ? match?.legalCityIntersectionIds ?? []
            : [],
      ),
      edgeIds: new Set(mode === "PLACE_INITIAL_ROAD" || mode === "BUILD_ROAD" ? match?.legalRoadEdgeIds ?? [] : []),
    } satisfies LegalTargets;
  }, [match?.legalCityIntersectionIds, match?.legalRoadEdgeIds, match?.legalRobberHexIds, match?.legalSettlementIntersectionIds, mode]);

  const presentation = useMemo(() => {
    if (!board) {
      return undefined;
    }
    return createStaticBoardPresentation(board, viewport.width, viewport.height);
  }, [board, viewport.height, viewport.width]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    let disposed = false;
    let observer: ResizeObserver | undefined;
    let localApp: Application | null = null;
    let appInitialized = false;

    const syncViewport = () => {
      const nextWidth = Math.max(host.clientWidth, 320);
      const nextHeight = Math.max(host.clientHeight, 320);
      setViewport((current) =>
        current.width === nextWidth && current.height === nextHeight ? current : { width: nextWidth, height: nextHeight },
      );
    };

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
            safeDestroyApplication(app, true);
            return;
          }

          const loadedEntries = await Promise.all(
            Object.entries(TILE_TEXTURE_URLS).map(async ([key, url]) => [key, await Assets.load<Texture>(url)] as const),
          );
          texturesRef.current = Object.fromEntries(loadedEntries);
          appRef.current = app;
          host.replaceChildren(app.canvas);
          syncViewport();
        } catch (error) {
          setRenderError(error instanceof Error ? error.message : "Pixi renderer konnte nicht initialisiert werden.");
          safeDestroyApplication(app, appInitialized);
        }
      };

      void setup();

      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(syncViewport);
        observer.observe(host);
      }
    } catch (error) {
      setRenderError(error instanceof Error ? error.message : "Pixi renderer konnte nicht vorbereitet werden.");
    }

    return () => {
      disposed = true;
      observer?.disconnect();
      onHoverTargetChange?.(undefined);
      destroyScene(sceneRef.current);
      sceneRef.current = null;
      safeDestroyApplication(localApp, appInitialized);
      if (appRef.current === localApp) {
        appRef.current = null;
      }
    };
  }, [onHoverTargetChange]);

  useEffect(() => {
    const app = appRef.current;
    if (!app || !board || !presentation) {
      destroyScene(sceneRef.current);
      sceneRef.current = null;
      return;
    }

    try {
      setRenderError(undefined);
      const staticKey = `${board.hexOrder.join("|")}::${presentation.width}x${presentation.height}`;
      if (sceneRef.current?.staticKey === staticKey) {
        drawBackdrop(sceneRef.current, presentation.width, presentation.height);
        return;
      }

      destroyScene(sceneRef.current);
      sceneRef.current = buildScene(app, presentation, texturesRef.current);
      drawBackdrop(sceneRef.current, presentation.width, presentation.height);
    } catch (error) {
      setRenderError(error instanceof Error ? error.message : "Pixi renderer konnte den Spieltisch nicht vorbereiten.");
    }
  }, [board, presentation]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!board || !match || !presentation || !scene) {
      clearInteractiveItems(sceneRef.current, onHoverTargetChange);
      return;
    }

    try {
      setRenderError(undefined);
      updateDynamicScene({
        board,
        scene,
        presentation,
        playerColors,
        legalTargets,
        hoverLabel,
        onHexSelect,
        onIntersectionSelect,
        onEdgeSelect,
        onHoverTargetChange,
      });
    } catch (error) {
      setRenderError(error instanceof Error ? error.message : "Pixi renderer konnte den aktuellen Spielzustand nicht zeichnen.");
    }
  }, [
    board,
    hoverLabel,
    legalTargets,
    match,
    onEdgeSelect,
    onHexSelect,
    onHoverTargetChange,
    onIntersectionSelect,
    playerColors,
    presentation,
  ]);

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

function buildScene(app: Application, presentation: StaticBoardPresentation, textures: Record<string, Texture>): DynamicSceneRefs {
  const root = new Container();
  const staticLayer = new Container();
  const dynamicLayer = new Container();
  const interactionLayer = new Container();

  const backdrop = new Graphics();
  const vignette = new Graphics();

  root.addChild(backdrop);
  root.addChild(vignette);
  root.addChild(staticLayer);
  root.addChild(dynamicLayer);
  root.addChild(interactionLayer);
  app.stage.addChild(root);

  for (const harbor of presentation.harbors) {
    const label = new Text({ text: harborLabel(harbor.harborType), style: harborStyle });
    label.anchor.set(0.5);
    label.x = harbor.labelPosition.x;
    label.y = harbor.labelPosition.y;
    label.alpha = 0.9;
    staticLayer.addChild(label);
  }

  for (const hex of presentation.hexes) {
    const texture = textures[hex.resourceType];
    if (texture) {
      const mask = new Graphics();
      mask.poly(hex.polygonCoords);
      mask.fill(0xffffff);
      const sprite = new Sprite(texture);
      sprite.x = hex.bounds.minX;
      sprite.y = hex.bounds.minY;
      sprite.width = hex.bounds.maxX - hex.bounds.minX;
      sprite.height = hex.bounds.maxY - hex.bounds.minY;
      sprite.mask = mask;
      staticLayer.addChild(mask);
      staticLayer.addChild(sprite);
    } else {
      const fill = new Graphics();
      fill.poly(hex.polygonCoords);
      fill.fill(resolveResourceColor(hex.resourceType), 0.97);
      staticLayer.addChild(fill);
    }
  }

  const refs: DynamicSceneRefs = {
    staticKey: `${presentation.hexes.map((hex) => hex.hexId).join("|")}::${presentation.width}x${presentation.height}`,
    root,
    backdrop,
    vignette,
    dynamicLayer,
    interactionLayer,
    hexOutlines: new Map(),
    tokens: new Map(),
    tokenTexts: new Map(),
    tokenPips: new Map(),
    robbers: new Map(),
    edgeLines: new Map(),
    intersections: new Map(),
    intersectionRings: new Map(),
    intersectionBuildings: new Map(),
    interactiveItems: [],
  };

  for (const hex of presentation.hexes) {
    const outline = new Graphics();
    dynamicLayer.addChild(outline);
    refs.hexOutlines.set(hex.hexId, outline);

    const token = new Graphics();
    dynamicLayer.addChild(token);
    refs.tokens.set(hex.hexId, token);

    const tokenText = new Text({ text: "", style: tokenStyle });
    tokenText.anchor.set(0.5);
    dynamicLayer.addChild(tokenText);
    refs.tokenTexts.set(hex.hexId, tokenText);

    const pipRow = new Graphics();
    dynamicLayer.addChild(pipRow);
    refs.tokenPips.set(hex.hexId, pipRow);

    const robber = new Graphics();
    robber.visible = false;
    dynamicLayer.addChild(robber);
    refs.robbers.set(hex.hexId, robber);
  }

  for (const edge of presentation.edges) {
    const line = new Graphics();
    dynamicLayer.addChild(line);
    refs.edgeLines.set(edge.edgeId, line);
  }

  for (const intersection of presentation.intersections) {
    const dot = new Graphics();
    dynamicLayer.addChild(dot);
    refs.intersections.set(intersection.intersectionId, dot);

    const ring = new Graphics();
    ring.visible = false;
    dynamicLayer.addChild(ring);
    refs.intersectionRings.set(intersection.intersectionId, ring);

    const building = new Graphics();
    building.visible = false;
    dynamicLayer.addChild(building);
    refs.intersectionBuildings.set(intersection.intersectionId, building);
  }

  return refs;
}

function updateDynamicScene(input: {
  board: GeneratedBoard;
  scene: DynamicSceneRefs;
  presentation: StaticBoardPresentation;
  playerColors: Map<string, PlayerColor | undefined>;
  legalTargets: LegalTargets;
  hoverLabel: string | undefined;
  onHexSelect: ((hexId: string) => void) | undefined;
  onIntersectionSelect: ((intersectionId: string) => void) | undefined;
  onEdgeSelect: ((edgeId: string) => void) | undefined;
  onHoverTargetChange: ((target: string | undefined) => void) | undefined;
}) {
  const {
    board,
    scene,
    presentation,
    playerColors,
    legalTargets,
    hoverLabel,
    onHexSelect,
    onIntersectionSelect,
    onEdgeSelect,
    onHoverTargetChange,
  } = input;

  clearInteractiveItems(scene, onHoverTargetChange);
  drawBackdrop(scene, presentation.width, presentation.height);
  const intersectionPositions = new Map(
    presentation.intersections.map((intersection) => [intersection.intersectionId, intersection.position] as const),
  );

  for (const hex of presentation.hexes) {
    const isLegal = legalTargets.hexIds.has(hex.hexId);
    const outline = scene.hexOutlines.get(hex.hexId)!;
    outline.clear();
    outline.poly(hex.polygonCoords);
    outline.stroke({
      color: isLegal ? 0xf0cf6f : 0xc8daf0,
      width: isLegal ? 5 : 2,
      alpha: isLegal ? 0.98 : 0.14,
    });
    if (isLegal) {
      outline.fill({ color: 0xf0cf6f, alpha: 0.15 });
    }

    const token = scene.tokens.get(hex.hexId)!;
    token.clear();
    token.circle(hex.center.x, hex.center.y + 6, 20);
    token.fill(0xf2e8d4);
    token.stroke({ color: 0x7a8aaa, width: 2, alpha: 0.4 });

    const tokenText = scene.tokenTexts.get(hex.hexId)!;
    tokenText.text = hex.tokenNumber?.toString() ?? "D";
    tokenText.style = isHotNumber(hex.tokenNumber) ? tokenHotStyle : tokenStyle;
    tokenText.x = hex.center.x;
    tokenText.y = hex.center.y + 4;

    const pipRow = scene.tokenPips.get(hex.hexId)!;
    pipRow.clear();
    const pips = probabilityPipCount(hex.tokenNumber);
    if (pips > 0) {
      const pipSpacing = 7;
      const startX = hex.center.x - ((pips - 1) * pipSpacing) / 2;
      for (let index = 0; index < pips; index += 1) {
        pipRow.circle(startX + index * pipSpacing, hex.center.y + 24, 2.2);
      }
      pipRow.fill(isHotNumber(hex.tokenNumber) ? 0x8d3429 : 0x4a5878);
    }

    const robber = scene.robbers.get(hex.hexId)!;
    robber.clear();
    robber.visible = !!board.hexes[hex.hexId]?.hasRobber;
    if (robber.visible) {
      robber.circle(hex.center.x + 42, hex.center.y - 34, 14);
      robber.fill(0x08101c);
      robber.stroke({ color: 0xe9c349, width: 2, alpha: 0.82 });
    }

    if (isLegal) {
      const hit = new Graphics();
      hit.poly(hex.polygonCoords);
      hit.fill({ color: 0xffffff, alpha: 0.001 });
      attachInteraction(
        hit,
        () => onHexSelect?.(hex.hexId),
        hoverLabel,
        onHoverTargetChange,
      );
      scene.interactionLayer.addChild(hit);
      scene.interactiveItems.push(hit);
    }
  }

  for (const edge of presentation.edges) {
    const road = board.edges[edge.edgeId]?.road;
    const isLegal = legalTargets.edgeIds.has(edge.edgeId);
    const line = scene.edgeLines.get(edge.edgeId)!;
    const roadGeometry = createRoadSegmentGeometry(edge.a, edge.b);
    line.clear();
    line.moveTo(roadGeometry.start.x, roadGeometry.start.y);
    line.lineTo(roadGeometry.end.x, roadGeometry.end.y);
    if (road) {
      line.stroke({
        color: resolvePlayerColor(playerColors.get(road.ownerPlayerId)),
        width: roadGeometry.width,
        alpha: 0.96,
      });
    } else {
      line.stroke({
        color: isLegal ? 0xf0cf6f : 0xc8daf0,
        width: isLegal ? roadGeometry.width : 3,
        alpha: isLegal ? 0.95 : 0.12,
      });
    }

    if (isLegal) {
      const hit = new Graphics();
      hit.moveTo(roadGeometry.start.x, roadGeometry.start.y);
      hit.lineTo(roadGeometry.end.x, roadGeometry.end.y);
      hit.stroke({ color: 0xffffff, width: roadGeometry.hitWidth, alpha: 0.001 });
      attachInteraction(
        hit,
        () => onEdgeSelect?.(edge.edgeId),
        hoverLabel,
        onHoverTargetChange,
      );
      scene.interactionLayer.addChild(hit);
      scene.interactiveItems.push(hit);
    }
  }

  for (const intersection of presentation.intersections) {
    const currentIntersection = board.intersections[intersection.intersectionId];
    const isLegal = legalTargets.intersectionIds.has(intersection.intersectionId);
    const adjacentPositions = intersection.adjacentIntersectionIds
      .map((neighborId) => intersectionPositions.get(neighborId))
      .filter((point): point is (typeof intersection.position) => point !== undefined);
    const pieceGeometry = createIntersectionPieceGeometry(intersection.position, adjacentPositions);
    const dot = scene.intersections.get(intersection.intersectionId)!;
    const ring = scene.intersectionRings.get(intersection.intersectionId)!;
    const building = scene.intersectionBuildings.get(intersection.intersectionId)!;

    dot.clear();
    ring.clear();
    building.clear();

    if (currentIntersection?.building) {
      building.visible = true;
      const ownerColor = resolvePlayerColor(playerColors.get(currentIntersection.building.ownerPlayerId));
      if (currentIntersection.building.buildingType === "city") {
        building.roundRect(
          intersection.position.x - pieceGeometry.cityWidth / 2,
          intersection.position.y - pieceGeometry.cityHeight / 2,
          pieceGeometry.cityWidth,
          pieceGeometry.cityHeight,
          Math.max(pieceGeometry.cityWidth * 0.18, 5),
        );
      } else {
        building.poly([
          intersection.position.x,
          intersection.position.y - pieceGeometry.settlementHeight * 0.66,
          intersection.position.x + pieceGeometry.settlementWidth * 0.52,
          intersection.position.y - pieceGeometry.settlementHeight * 0.12,
          intersection.position.x + pieceGeometry.settlementWidth * 0.52,
          intersection.position.y + pieceGeometry.settlementHeight * 0.5,
          intersection.position.x - pieceGeometry.settlementWidth * 0.52,
          intersection.position.y + pieceGeometry.settlementHeight * 0.5,
          intersection.position.x - pieceGeometry.settlementWidth * 0.52,
          intersection.position.y - pieceGeometry.settlementHeight * 0.12,
        ]);
      }
      building.fill(ownerColor);
      building.stroke({ color: 0xffffff, width: 2, alpha: 0.18 });
      dot.visible = false;
      ring.visible = false;
      continue;
    }

    building.visible = false;
    dot.visible = true;
    dot.circle(intersection.position.x, intersection.position.y, isLegal ? Math.max(pieceGeometry.roadWidth * 0.9, 8) : 5);
    dot.fill(isLegal ? 0xf0cf6f : 0xc8daf0);
    dot.alpha = isLegal ? 1 : 0.42;

    ring.visible = isLegal;
    if (isLegal) {
      ring.circle(intersection.position.x, intersection.position.y, Math.max(pieceGeometry.settlementWidth * 0.9, 16));
      ring.stroke({ color: 0xf0cf6f, width: 3, alpha: 0.84 });

      const hit = new Graphics();
      hit.circle(intersection.position.x, intersection.position.y, Math.max(pieceGeometry.settlementWidth, 22));
      hit.fill({ color: 0xffffff, alpha: 0.001 });
      hit.hitArea = new Circle(intersection.position.x, intersection.position.y, Math.max(pieceGeometry.settlementWidth + 2, 24));
      attachInteraction(
        hit,
        () => onIntersectionSelect?.(intersection.intersectionId),
        hoverLabel,
        onHoverTargetChange,
      );
      scene.interactionLayer.addChild(hit);
      scene.interactiveItems.push(hit);
    }
  }
}

function drawBackdrop(scene: DynamicSceneRefs, width: number, height: number) {
  scene.backdrop.clear();
  scene.backdrop.roundRect(0, 0, width, height, 32);
  scene.backdrop.fill(0x0d1520);

  scene.vignette.clear();
  scene.vignette.ellipse(width / 2, height / 2, width * 0.44, height * 0.4);
  scene.vignette.fill({ color: 0x1a3860, alpha: 0.18 });
}

function clearInteractiveItems(scene: DynamicSceneRefs | null, onHoverTargetChange?: (target: string | undefined) => void) {
  if (!scene) {
    return;
  }

  for (const item of scene.interactiveItems) {
    item.removeAllListeners();
    item.destroy();
  }
  scene.interactiveItems = [];
  scene.interactionLayer.removeChildren();
  onHoverTargetChange?.(undefined);
}

function destroyScene(scene: DynamicSceneRefs | null) {
  if (!scene) {
    return;
  }

  clearInteractiveItems(scene);
  scene.root.destroy({ children: true });
}

function attachInteraction(
  graphic: Graphics,
  onTap: () => void,
  hoverLabel: string | undefined,
  onHoverTargetChange?: (target: string | undefined) => void,
) {
  graphic.eventMode = "static";
  graphic.cursor = "pointer";
  graphic.on("pointerdown", onTap);
  graphic.on("pointerover", () => onHoverTargetChange?.(hoverLabel));
  graphic.on("pointerout", () => onHoverTargetChange?.(undefined));
}

function harborLabel(harborType: HarborType): string {
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
      harborType satisfies never;
      return harborType;
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
