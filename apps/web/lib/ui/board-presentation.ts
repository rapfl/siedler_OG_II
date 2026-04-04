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

const BOARD_PADDING = 52;
const HEX_CORNER_ANGLES = [30, 90, 150, 210, 270, 330] as const;
const HEX_RADIUS = 1;

export function createBoardPresentation(
  board: GeneratedBoard,
  width: number,
  height: number,
  playerColors: Map<string, PlayerColor | undefined>,
): BoardPresentation {
  const sourceHexPolygons = Object.fromEntries(
    Object.entries(board.hexes).map(([hexId, hex]) => [hexId, createSourceHexPolygon(hex.uiCenter)]),
  ) as Record<string, BoardUiPoint[]>;
  const sourceIntersections = Object.fromEntries(
    Object.entries(board.intersections).map(([intersectionId, intersection]) => [intersectionId, intersection.uiPosition]),
  ) as Record<string, BoardUiPoint>;
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

  return {
    width,
    height,
    center,
    hexes: board.hexOrder.map((hexId) => {
      const hex = board.hexes[hexId]!;
      const centerPoint = screenHexCenters[hexId]!;
      return {
        hexId,
        resourceType: hex.resourceType,
        tokenNumber: hex.tokenNumber,
        hasRobber: hex.hasRobber,
        center: centerPoint,
        polygon: screenHexPolygons[hexId]!,
      };
    }),
    intersections: Object.values(board.intersections).map((intersection) => ({
      intersectionId: intersection.intersectionId,
      position: screenIntersections[intersection.intersectionId]!,
      harborAccess: intersection.harborAccess,
      ...(intersection.building
        ? {
            building: {
              buildingType: intersection.building.buildingType,
              ownerColor: playerColors.get(intersection.building.ownerPlayerId),
            },
          }
        : {}),
    })),
    edges: Object.values(board.edges).map((edge) => ({
      edgeId: edge.edgeId,
      a: screenIntersections[edge.intersectionAId]!,
      b: screenIntersections[edge.intersectionBId]!,
      ownerColor: edge.road?.ownerPlayerId ? playerColors.get(edge.road.ownerPlayerId) : undefined,
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
