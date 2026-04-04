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

export function createBoardPresentation(
  board: GeneratedBoard,
  width: number,
  height: number,
  playerColors: Map<string, PlayerColor | undefined>,
): BoardPresentation {
  const sourceHexPolygons = Object.fromEntries(
    Object.entries(board.hexes).map(([hexId, hex]) => [hexId, createSourceHexPolygon(hexId, hex.uiCenter)]),
  ) as Record<string, BoardUiPoint[]>;

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

  const abstractProject = (point: BoardUiPoint) => projectBoardPoint(point, rawCenter, span);

  const abstractHexCenters = Object.fromEntries(
    Object.entries(board.hexes).map(([hexId, hex]) => [hexId, abstractProject(hex.uiCenter)]),
  ) as Record<string, BoardUiPoint>;

  const abstractIntersections = Object.fromEntries(
    Object.entries(board.intersections).map(([intersectionId, intersection]) => [
      intersectionId,
      abstractProject(intersection.uiPosition),
    ]),
  ) as Record<string, BoardUiPoint>;

  const abstractHexPolygons = Object.fromEntries(
    Object.entries(sourceHexPolygons).map(([hexId, polygon]) => [hexId, polygon.map(abstractProject)]),
  ) as Record<string, BoardUiPoint[]>;

  const abstractPoints = [...Object.values(abstractIntersections), ...Object.values(abstractHexPolygons).flat()];
  const minX = Math.min(...abstractPoints.map((point) => point.x));
  const maxX = Math.max(...abstractPoints.map((point) => point.x));
  const minY = Math.min(...abstractPoints.map((point) => point.y));
  const maxY = Math.max(...abstractPoints.map((point) => point.y));

  const availableWidth = Math.max(width - BOARD_PADDING * 2, 1);
  const availableHeight = Math.max(height - BOARD_PADDING * 2, 1);
  const scale = Math.min(availableWidth / (maxX - minX), availableHeight / (maxY - minY));
  const offsetX = (width - (maxX - minX) * scale) / 2 - minX * scale;
  const offsetY = (height - (maxY - minY) * scale) / 2 - minY * scale;

  const project = (point: BoardUiPoint): BoardUiPoint => ({
    x: point.x * scale + offsetX,
    y: point.y * scale + offsetY,
  });

  const screenHexCenters = Object.fromEntries(
    Object.entries(abstractHexCenters).map(([hexId, point]) => [hexId, project(point)]),
  ) as Record<string, BoardUiPoint>;

  const screenIntersections = Object.fromEntries(
    Object.entries(abstractIntersections).map(([intersectionId, point]) => [intersectionId, project(point)]),
  ) as Record<string, BoardUiPoint>;

  const screenHexPolygons = Object.fromEntries(
    Object.entries(abstractHexPolygons).map(([hexId, polygon]) => [hexId, polygon.map(project)]),
  ) as Record<string, BoardUiPoint[]>;

  const center = project(abstractProject(rawCenter));

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

function createSourceHexPolygon(hexId: string, sourceCenter: BoardUiPoint) {
  return HEX_CORNER_ANGLES.map((angle) => {
    const radians = (Math.PI / 180) * angle;
    const radius = 0.96 + hashToUnit(`${hexId}:${angle}`) * 0.08;
    return {
      x: sourceCenter.x + Math.cos(radians) * radius,
      y: sourceCenter.y + Math.sin(radians) * radius,
    };
  });
}

function projectBoardPoint(point: BoardUiPoint, center: BoardUiPoint, span: BoardUiPoint): BoardUiPoint {
  const nx = span.x === 0 ? 0 : (point.x - center.x) / span.x;
  const ny = span.y === 0 ? 0 : (point.y - center.y) / span.y;

  const stretched = {
    x: (point.x - center.x) * 1.04,
    y: (point.y - center.y) * 0.96,
  };

  const drift = {
    x: Math.sin(ny * Math.PI * 1.1) * 0.46 + nx * ny * 0.9,
    y: Math.sin(nx * Math.PI * 1.5) * 0.24 - nx * nx * 0.74 + ny * 0.18,
  };

  return rotatePoint(
    {
      x: center.x + stretched.x + drift.x,
      y: center.y + stretched.y + drift.y,
    },
    center,
    -6,
  );
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
  const push = 26;

  return {
    x: midpoint.x + (dx / magnitude) * push,
    y: midpoint.y + (dy / magnitude) * push,
  };
}

function hashToUnit(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return ((hash >>> 0) % 1000) / 1000;
}
