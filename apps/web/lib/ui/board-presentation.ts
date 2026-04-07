import type {
  BoardUiPoint,
  GeneratedBoard,
  HarborType,
  PlayerColor,
} from "@siedler/shared-types";

export interface PresentedHex {
  hexId: string;
  resourceType: string;
  tokenNumber?: number | undefined;
  hasRobber: boolean;
  center: BoardUiPoint;
  polygon: BoardUiPoint[];
}

export interface PresentedIntersection {
  intersectionId: string;
  position: BoardUiPoint;
  harborAccess?: HarborType | undefined;
  building?: {
    buildingType: "settlement" | "city";
    ownerColor?: PlayerColor | undefined;
  } | undefined;
}

export interface PresentedEdge {
  edgeId: string;
  a: BoardUiPoint;
  b: BoardUiPoint;
  ownerColor?: PlayerColor | undefined;
}

export interface PresentedHarbor {
  harborId: string;
  harborType: HarborType;
  labelPosition: BoardUiPoint;
}

export interface BoardPresentation {
  width: number;
  height: number;
  center: BoardUiPoint;
  hexes: PresentedHex[];
  intersections: PresentedIntersection[];
  edges: PresentedEdge[];
  harbors: PresentedHarbor[];
}

export interface StaticBoardPresentation {
  width: number;
  height: number;
  center: BoardUiPoint;
  hexes: Array<
    PresentedHex & {
      polygonCoords: number[];
      bounds: { minX: number; maxX: number; minY: number; maxY: number };
    }
  >;
  intersections: Array<
    Omit<PresentedIntersection, "building"> & {
      adjacentEdgeIds: string[];
      adjacentIntersectionIds: string[];
    }
  >;
  edges: PresentedEdge[];
  harbors: PresentedHarbor[];
}

const BOARD_PADDING = 52;
const HEX_CORNER_ANGLES = [30, 90, 150, 210, 270, 330] as const;
const HEX_RADIUS = 1;
const STATIC_PRESENTATION_CACHE = new WeakMap<GeneratedBoard, Map<string, StaticBoardPresentation>>();

export function createBoardPresentation(
  board: GeneratedBoard,
  width: number,
  height: number,
  playerColors: Map<string, PlayerColor | undefined>,
): BoardPresentation {
  const staticPresentation = createStaticBoardPresentation(board, width, height);

  return {
    width: staticPresentation.width,
    height: staticPresentation.height,
    center: staticPresentation.center,
    hexes: staticPresentation.hexes,
    intersections: staticPresentation.intersections.map((intersection) => ({
      intersectionId: intersection.intersectionId,
      position: intersection.position,
      harborAccess: intersection.harborAccess,
      ...(board.intersections[intersection.intersectionId]?.building
        ? {
            building: {
              buildingType: board.intersections[intersection.intersectionId]!.building!.buildingType,
              ownerColor: playerColors.get(board.intersections[intersection.intersectionId]!.building!.ownerPlayerId),
            },
          }
        : {}),
    })),
    edges: staticPresentation.edges.map((edge) => ({
      ...edge,
      ownerColor: board.edges[edge.edgeId]?.road?.ownerPlayerId ? playerColors.get(board.edges[edge.edgeId]!.road!.ownerPlayerId) : undefined,
    })),
    harbors: staticPresentation.harbors,
  };
}

export function createStaticBoardPresentation(board: GeneratedBoard, width: number, height: number): StaticBoardPresentation {
  const cacheKey = `${width}x${height}`;
  const cachedByBoard = STATIC_PRESENTATION_CACHE.get(board);
  const cached = cachedByBoard?.get(cacheKey);
  if (cached) {
    return cached;
  }

  const sourceHexPolygons = Object.fromEntries(
    Object.entries(board.hexes).map(([hexId, hex]) => [hexId, createSourceHexPolygon(hex.uiCenter)]),
  ) as Record<string, BoardUiPoint[]>;
  const sourceIntersections = buildSourceIntersectionPositions(board, sourceHexPolygons);
  const sourcePoints = [...Object.values(sourceHexPolygons).flat(), ...Object.values(sourceIntersections)];
  const bounds = measureBounds(sourcePoints);

  const availableWidth = Math.max(width - BOARD_PADDING * 2, 1);
  const availableHeight = Math.max(height - BOARD_PADDING * 2, 1);
  const scale = Math.min(availableWidth / bounds.width, availableHeight / bounds.height);
  const offsetX = (width - bounds.width * scale) / 2 - bounds.minX * scale;
  const offsetY = (height - bounds.height * scale) / 2 - bounds.minY * scale;

  const project = (point: BoardUiPoint): BoardUiPoint => ({
    x: point.x * scale + offsetX,
    y: point.y * scale + offsetY,
  });

  const screenHexCenters = Object.fromEntries(
    Object.entries(board.hexes).map(([hexId, hex]) => [hexId, project(hex.uiCenter)]),
  ) as Record<string, BoardUiPoint>;

  const screenIntersections = Object.fromEntries(
    Object.entries(sourceIntersections).map(([intersectionId, point]) => [intersectionId, project(point)]),
  ) as Record<string, BoardUiPoint>;

  const screenHexPolygons = Object.fromEntries(
    Object.entries(sourceHexPolygons).map(([hexId, polygon]) => [hexId, polygon.map(project)]),
  ) as Record<string, BoardUiPoint[]>;

  const center = project({
    x: bounds.minX + bounds.width / 2,
    y: bounds.minY + bounds.height / 2,
  });

  const presentation: StaticBoardPresentation = {
    width,
    height,
    center,
    hexes: board.hexOrder.map((hexId) => {
      const polygon = screenHexPolygons[hexId]!;
      const xs = polygon.map((point) => point.x);
      const ys = polygon.map((point) => point.y);
      const hex = board.hexes[hexId]!;
      return {
        hexId,
        resourceType: hex.resourceType,
        tokenNumber: hex.tokenNumber,
        hasRobber: hex.hasRobber,
        center: screenHexCenters[hexId]!,
        polygon,
        polygonCoords: polygon.flatMap((point) => [point.x, point.y]),
        bounds: {
          minX: Math.min(...xs),
          maxX: Math.max(...xs),
          minY: Math.min(...ys),
          maxY: Math.max(...ys),
        },
      };
    }),
    intersections: Object.values(board.intersections).map((intersection) => ({
      intersectionId: intersection.intersectionId,
      position: screenIntersections[intersection.intersectionId]!,
      harborAccess: intersection.harborAccess,
      adjacentEdgeIds: intersection.adjacentEdgeIds,
      adjacentIntersectionIds: intersection.adjacentIntersectionIds,
    })),
    edges: Object.values(board.edges).map((edge) => ({
      edgeId: edge.edgeId,
      a: screenIntersections[edge.intersectionAId]!,
      b: screenIntersections[edge.intersectionBId]!,
    })),
    harbors: Object.values(board.harbors).map((harbor) => {
      const a = screenIntersections[harbor.intersectionIds[0]]!;
      const b = screenIntersections[harbor.intersectionIds[1]]!;
      return {
        harborId: harbor.harborId,
        harborType: harbor.harborType,
        labelPosition: positionHarborLabel(a, b, center),
      };
    }),
  };

  const nextCache = cachedByBoard ?? new Map<string, StaticBoardPresentation>();
  nextCache.set(cacheKey, presentation);
  if (!cachedByBoard) {
    STATIC_PRESENTATION_CACHE.set(board, nextCache);
  }

  return presentation;
}

function createSourceHexPolygon(sourceCenter: BoardUiPoint) {
  return HEX_CORNER_ANGLES.map((angle) => {
    const radians = (Math.PI / 180) * angle;
    return {
      x: sourceCenter.x + Math.cos(radians) * HEX_RADIUS,
      y: sourceCenter.y + Math.sin(radians) * HEX_RADIUS,
    };
  });
}

function buildSourceIntersectionPositions(
  board: GeneratedBoard,
  sourceHexPolygons: Record<string, BoardUiPoint[]>,
): Record<string, BoardUiPoint> {
  const collected = new Map<string, BoardUiPoint[]>();

  for (const hex of Object.values(board.hexes)) {
    const polygon = sourceHexPolygons[hex.hexId] ?? [];
    hex.adjacentIntersectionIds.forEach((intersectionId, index) => {
      const point = polygon[index];
      if (!point) {
        return;
      }
      const existing = collected.get(intersectionId) ?? [];
      existing.push(point);
      collected.set(intersectionId, existing);
    });
  }

  return Object.fromEntries(
    Object.values(board.intersections).map((intersection) => {
      const points = collected.get(intersection.intersectionId) ?? [];
      const averaged =
        points.length > 0
          ? {
              x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
              y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
            }
          : intersection.uiPosition;

      return [intersection.intersectionId, averaged];
    }),
  ) as Record<string, BoardUiPoint>;
}

function positionHarborLabel(a: BoardUiPoint, b: BoardUiPoint, center: BoardUiPoint) {
  const midpoint = {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
  const dx = midpoint.x - center.x;
  const dy = midpoint.y - center.y;
  const magnitude = Math.max(Math.hypot(dx, dy), 0.001);
  const push = 26;

  return {
    x: midpoint.x + (dx / magnitude) * push,
    y: midpoint.y + (dy / magnitude) * push,
  };
}

function measureBounds(points: BoardUiPoint[]) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
  };
}
