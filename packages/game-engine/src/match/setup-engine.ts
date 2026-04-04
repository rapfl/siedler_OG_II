import type {
  BoardEdge,
  BoardHarbor,
  BoardHex,
  BoardIntersection,
  GeneratedBoard,
  HarborType,
  MatchPlayerState,
  MatchState,
  ResourceCounts,
  ResourceType,
  SetupState,
  SetupStep,
  TerrainType,
} from "../../../shared-types/src/index.js";

const HIGH_PROBABILITY_TOKENS = new Set([6, 8]);
const HEX_ROWS = [
  { r: -2, qStart: 0, count: 3 },
  { r: -1, qStart: -1, count: 4 },
  { r: 0, qStart: -2, count: 5 },
  { r: 1, qStart: -2, count: 4 },
  { r: 2, qStart: -2, count: 3 },
] as const;
const HEX_NEIGHBOR_DIRECTIONS = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
] as const;
const CORNER_ANGLES = [30, 90, 150, 210, 270, 330] as const;
const TERRAIN_DISTRIBUTION: TerrainType[] = [
  "wood",
  "wood",
  "wood",
  "wood",
  "sheep",
  "sheep",
  "sheep",
  "sheep",
  "wheat",
  "wheat",
  "wheat",
  "wheat",
  "brick",
  "brick",
  "brick",
  "ore",
  "ore",
  "ore",
  "desert",
];
const TOKEN_DISTRIBUTION = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12] as const;
const HARBOR_DISTRIBUTION: HarborType[] = [
  "generic_3_to_1",
  "generic_3_to_1",
  "generic_3_to_1",
  "generic_3_to_1",
  "wood_2_to_1",
  "brick_2_to_1",
  "sheep_2_to_1",
  "wheat_2_to_1",
  "ore_2_to_1",
];
const HARBOR_SLOT_INDICES = [0, 3, 6, 10, 13, 17, 20, 23, 27] as const;
const CUBE_CORNER_OFFSETS = [
  [2, -1, -1],
  [1, 1, -2],
  [-1, 2, -1],
  [-2, 1, 1],
  [-1, -1, 2],
  [1, -2, 1],
] as const;

interface BoardTemplate {
  hexOrder: string[];
  hexCoords: Record<string, { q: number; r: number }>;
  adjacentHexIds: Record<string, string[]>;
  hexIntersectionIds: Record<string, string[]>;
  hexEdgeIds: Record<string, string[]>;
  intersections: Record<string, BoardIntersection>;
  edges: Record<string, BoardEdge>;
  harborSlots: Array<[string, string]>;
}

export type SetupEngineErrorCode =
  | "MATCH_NOT_INITIALIZING"
  | "MATCH_NOT_IN_SETUP"
  | "NOT_SETUP_ACTOR"
  | "INVALID_SETUP_STEP"
  | "INTERSECTION_NOT_FOUND"
  | "EDGE_NOT_FOUND"
  | "INTERSECTION_OCCUPIED"
  | "SETTLEMENT_DISTANCE_RULE"
  | "ROAD_NOT_ADJACENT_TO_PENDING_SETTLEMENT"
  | "EDGE_OCCUPIED";

export class SetupEngineError extends Error {
  constructor(
    public readonly code: SetupEngineErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SetupEngineError";
  }
}

const BOARD_TEMPLATE = buildBoardTemplate();

export function createBoardTemplate(): GeneratedBoard {
  return generateBoard("template-seed");
}

export function generateBoard(seed: string): GeneratedBoard {
  const terrainRng = createRng(`${seed}:terrain`);
  const tokenRng = createRng(`${seed}:tokens`);
  const harborRng = createRng(`${seed}:harbors`);
  const terrainOrder = shuffle([...TERRAIN_DISTRIBUTION], terrainRng);

  let assignedTerrain: TerrainType[] | undefined;
  let assignedTokens: number[] | undefined;

  for (let attempt = 0; attempt < 500; attempt += 1) {
    const candidateTerrain = attempt === 0 ? terrainOrder : shuffle([...TERRAIN_DISTRIBUTION], terrainRng);
    const candidateTokens = attempt === 0 ? shuffle([...TOKEN_DISTRIBUTION], tokenRng) : shuffle([...TOKEN_DISTRIBUTION], tokenRng);

    if (hasInvalidHighTokenAdjacency(candidateTerrain, candidateTokens)) {
      continue;
    }

    assignedTerrain = candidateTerrain;
    assignedTokens = candidateTokens;
    break;
  }

  if (!assignedTerrain || !assignedTokens) {
    throw new Error("Unable to generate a fair board with the configured high-token heuristic.");
  }

  const boardHexes: Record<string, BoardHex> = {};
  const boardIntersections: Record<string, BoardIntersection> = structuredClone(BOARD_TEMPLATE.intersections);
  const boardEdges: Record<string, BoardEdge> = structuredClone(BOARD_TEMPLATE.edges);

  const tokenQueue = [...assignedTokens];
  let robberHexId = "";

  BOARD_TEMPLATE.hexOrder.forEach((hexId, index) => {
    const resourceType = assignedTerrain[index]!;
    const isDesert = resourceType === "desert";
    const tokenNumber = isDesert ? undefined : tokenQueue.shift();

    if (isDesert) {
      robberHexId = hexId;
    }

    boardHexes[hexId] = {
      hexId,
      axialCoord: BOARD_TEMPLATE.hexCoords[hexId]!,
      resourceType,
      tokenNumber,
      isDesert,
      hasRobber: isDesert,
      adjacentIntersectionIds: [...BOARD_TEMPLATE.hexIntersectionIds[hexId]!],
      adjacentEdgeIds: [...BOARD_TEMPLATE.hexEdgeIds[hexId]!],
      adjacentHexIds: [...BOARD_TEMPLATE.adjacentHexIds[hexId]!],
    };
  });

  const harborTypes = shuffle([...HARBOR_DISTRIBUTION], harborRng);
  const harbors: Record<string, BoardHarbor> = {};

  BOARD_TEMPLATE.harborSlots.forEach((intersectionIds, index) => {
    const harborType = harborTypes[index]!;
    const harborId = `harbor-${index}`;
    harbors[harborId] = {
      harborId,
      harborType,
      intersectionIds,
    };

    for (const intersectionId of intersectionIds) {
      boardIntersections[intersectionId] = {
        ...boardIntersections[intersectionId]!,
        harborAccess: harborType,
      };
    }
  });

  return {
    hexOrder: [...BOARD_TEMPLATE.hexOrder],
    hexes: boardHexes,
    intersections: boardIntersections,
    edges: boardEdges,
    harbors,
    robberHexId,
  };
}

export function initializeMatchSetup(match: MatchState): MatchState {
  if (match.status !== "match_initializing") {
    throw new SetupEngineError("MATCH_NOT_INITIALIZING", "Match must be initializing before setup can begin.");
  }

  const board = generateBoard(match.seed);
  const players = match.playerOrder.map<MatchPlayerState>((playerId) => ({
    playerId,
    resources: emptyResourceCounts(),
    initialSettlementIntersectionIds: [],
    initialRoadEdgeIds: [],
  }));

  return {
    ...match,
    status: "match_setup",
    board,
    players,
    rngState: xmur3(`${match.seed}:turn-rng`)(),
    longestRoadLength: 0,
    setup: {
      step: "setup_forward_settlement",
      currentPlayerId: match.playerOrder[0]!,
      currentRound: 1,
      currentIndex: 0,
      placementOrder: [...match.playerOrder],
    },
    version: match.version + 1,
  };
}

export function getLegalInitialSettlementPlacements(match: MatchState, actorPlayerId: string): string[] {
  const { board, setup } = requireSetupContext(match);
  ensureSetupActor(setup, actorPlayerId);
  ensureSettlementStep(setup.step);

  return Object.values(board.intersections)
    .filter((intersection) => canPlaceInitialSettlement(board, intersection.intersectionId))
    .map((intersection) => intersection.intersectionId)
    .sort();
}

export function getLegalInitialRoadPlacements(match: MatchState, actorPlayerId: string): string[] {
  const { board, setup } = requireSetupContext(match);
  ensureSetupActor(setup, actorPlayerId);
  ensureRoadStep(setup.step);

  return Object.values(board.edges)
    .filter((edge) => canPlaceInitialRoad(board, edge.edgeId, setup.pendingSettlementIntersectionId!))
    .map((edge) => edge.edgeId)
    .sort();
}

export function placeInitialSettlement(match: MatchState, actorPlayerId: string, intersectionId: string): MatchState {
  const { board, players, setup } = requireSetupContext(match);
  ensureSetupActor(setup, actorPlayerId);
  ensureSettlementStep(setup.step);

  const intersection = board.intersections[intersectionId];
  if (!intersection) {
    throw new SetupEngineError("INTERSECTION_NOT_FOUND", `Unknown intersection: ${intersectionId}`);
  }

  if (!canPlaceInitialSettlement(board, intersectionId)) {
    throw new SetupEngineError(
      intersection.building ? "INTERSECTION_OCCUPIED" : "SETTLEMENT_DISTANCE_RULE",
      "Initial settlement must respect occupancy and distance rules.",
    );
  }

  return {
    ...match,
    board: {
      ...board,
      intersections: {
        ...board.intersections,
        [intersectionId]: {
          ...intersection,
          building: {
            ownerPlayerId: actorPlayerId,
            buildingType: "settlement",
          },
        },
      },
    },
    players: players.map((player) =>
      player.playerId === actorPlayerId
        ? {
            ...player,
            initialSettlementIntersectionIds: [...player.initialSettlementIntersectionIds, intersectionId],
          }
        : player,
    ),
    setup: {
      ...setup,
      step: setup.currentRound === 1 ? "setup_forward_road" : "setup_reverse_road",
      pendingSettlementIntersectionId: intersectionId,
    },
    version: match.version + 1,
  };
}

export function placeInitialRoad(match: MatchState, actorPlayerId: string, edgeId: string): MatchState {
  const { board, players, setup } = requireSetupContext(match);
  ensureSetupActor(setup, actorPlayerId);
  ensureRoadStep(setup.step);

  const edge = board.edges[edgeId];
  if (!edge) {
    throw new SetupEngineError("EDGE_NOT_FOUND", `Unknown edge: ${edgeId}`);
  }

  const pendingSettlementIntersectionId = setup.pendingSettlementIntersectionId;
  if (!pendingSettlementIntersectionId || !canPlaceInitialRoad(board, edgeId, pendingSettlementIntersectionId)) {
    throw new SetupEngineError(
      edge.road ? "EDGE_OCCUPIED" : "ROAD_NOT_ADJACENT_TO_PENDING_SETTLEMENT",
      "Setup road must be free and adjacent to the just-placed setup settlement.",
    );
  }

  const nextBoard: GeneratedBoard = {
    ...board,
    edges: {
      ...board.edges,
      [edgeId]: {
        ...edge,
        road: {
          ownerPlayerId: actorPlayerId,
        },
      },
    },
  };

  const nextPlayers = players.map((player) =>
    player.playerId === actorPlayerId
      ? {
          ...player,
          initialRoadEdgeIds: [...player.initialRoadEdgeIds, edgeId],
        }
      : player,
  );

  const nextSetup = advanceSetupState(setup);

  if (nextSetup.step === "setup_complete") {
    return finalizeSetup({
      ...match,
      status: "match_setup",
      board: nextBoard,
      players: nextPlayers,
      setup: nextSetup,
      version: match.version + 1,
    });
  }

  return {
    ...match,
    board: nextBoard,
    players: nextPlayers,
    setup: nextSetup,
    version: match.version + 1,
  };
}

export function sumResourceCounts(resources: ResourceCounts): number {
  return resources.wood + resources.brick + resources.sheep + resources.wheat + resources.ore;
}

function finalizeSetup(match: MatchState): MatchState {
  const { board, players, setup } = requireSetupContext(match);
  const distributedPlayers = players.map((player) => ({
    ...player,
    resources: collectStartResources(board, player.initialSettlementIntersectionIds[1]),
  }));

  return {
    ...match,
    status: "match_in_progress",
    players: distributedPlayers,
    setup: {
      ...setup,
      pendingSettlementIntersectionId: undefined,
    },
    turn: {
      activePlayerId: setup.placementOrder[0]!,
      phase: "roll_pending",
      turnNumber: 1,
    },
    version: match.version + 1,
  };
}

function collectStartResources(board: GeneratedBoard, secondSettlementIntersectionId?: string): ResourceCounts {
  const resources = emptyResourceCounts();
  if (!secondSettlementIntersectionId) {
    return resources;
  }

  const intersection = board.intersections[secondSettlementIntersectionId];
  if (!intersection) {
    return resources;
  }

  for (const hexId of intersection.adjacentHexIds) {
    const hex = board.hexes[hexId];
    if (!hex || hex.resourceType === "desert") {
      continue;
    }

    resources[hex.resourceType] += 1;
  }

  return resources;
}

function advanceSetupState(setup: SetupState): SetupState {
  const lastIndex = setup.placementOrder.length - 1;

  if (setup.currentRound === 1) {
    if (setup.currentIndex < lastIndex) {
      return {
        ...setup,
        step: "setup_forward_settlement",
        currentIndex: setup.currentIndex + 1,
        currentPlayerId: setup.placementOrder[setup.currentIndex + 1]!,
        pendingSettlementIntersectionId: undefined,
      };
    }

    return {
      ...setup,
      step: "setup_reverse_settlement",
      currentRound: 2,
      currentIndex: lastIndex,
      currentPlayerId: setup.placementOrder[lastIndex]!,
      pendingSettlementIntersectionId: undefined,
    };
  }

  if (setup.currentIndex > 0) {
    return {
      ...setup,
      step: "setup_reverse_settlement",
      currentIndex: setup.currentIndex - 1,
      currentPlayerId: setup.placementOrder[setup.currentIndex - 1]!,
      pendingSettlementIntersectionId: undefined,
    };
  }

  return {
    ...setup,
    step: "setup_complete",
    currentPlayerId: setup.placementOrder[0]!,
    pendingSettlementIntersectionId: undefined,
  };
}

function canPlaceInitialSettlement(board: GeneratedBoard, intersectionId: string): boolean {
  const intersection = board.intersections[intersectionId];
  if (!intersection || intersection.building) {
    return false;
  }

  return intersection.adjacentIntersectionIds.every((adjacentId) => !board.intersections[adjacentId]?.building);
}

function canPlaceInitialRoad(board: GeneratedBoard, edgeId: string, pendingSettlementIntersectionId: string): boolean {
  const edge = board.edges[edgeId];
  if (!edge || edge.road) {
    return false;
  }

  return edge.intersectionAId === pendingSettlementIntersectionId || edge.intersectionBId === pendingSettlementIntersectionId;
}

function requireSetupContext(match: MatchState) {
  if (match.status !== "match_setup" && match.status !== "match_in_progress") {
    throw new SetupEngineError("MATCH_NOT_IN_SETUP", "Match is not in the setup lifecycle.");
  }

  if (!match.board || !match.players || !match.setup) {
    throw new SetupEngineError("MATCH_NOT_IN_SETUP", "Match setup context is incomplete.");
  }

  return {
    board: match.board,
    players: match.players,
    setup: match.setup,
  };
}

function ensureSetupActor(setup: SetupState, actorPlayerId: string): void {
  if (setup.currentPlayerId !== actorPlayerId) {
    throw new SetupEngineError("NOT_SETUP_ACTOR", "Only the current setup actor can place the next piece.");
  }
}

function ensureSettlementStep(step: SetupStep): void {
  if (step !== "setup_forward_settlement" && step !== "setup_reverse_settlement") {
    throw new SetupEngineError("INVALID_SETUP_STEP", "Expected a setup settlement step.");
  }
}

function ensureRoadStep(step: SetupStep): void {
  if (step !== "setup_forward_road" && step !== "setup_reverse_road") {
    throw new SetupEngineError("INVALID_SETUP_STEP", "Expected a setup road step.");
  }
}

function buildBoardTemplate(): BoardTemplate {
  const hexOrder: string[] = [];
  const hexCoords: Record<string, { q: number; r: number }> = {};
  const hexByCoord = new Map<string, string>();
  const hexIntersectionIds: Record<string, string[]> = {};
  const hexEdgeIds: Record<string, string[]> = {};
  const intersectionsByPoint = new Map<string, string>();
  const edgesByKey = new Map<string, string>();
  const intersectionPoints = new Map<string, { x: number; y: number }>();
  const intersections: Record<string, BoardIntersection> = {};
  const edges: Record<string, BoardEdge> = {};

  let hexIndex = 0;
  let intersectionIndex = 0;
  let edgeIndex = 0;

  for (const row of HEX_ROWS) {
    for (let offset = 0; offset < row.count; offset += 1) {
      const q = row.qStart + offset;
      const r = row.r;
      const hexId = `hex-${hexIndex}`;
      hexIndex += 1;

      hexOrder.push(hexId);
      hexCoords[hexId] = { q, r };
      hexByCoord.set(`${q},${r}`, hexId);

      const center = hexToPixel(q, r);
      const cubeCenter = axialToCube(q, r);
      const cornerIds: string[] = [];
      const edgeIds: string[] = [];

      CORNER_ANGLES.forEach((angle, cornerIndex) => {
        const point = hexCorner(center.x, center.y, angle);
        const [offsetX, offsetY, offsetZ] = CUBE_CORNER_OFFSETS[cornerIndex]!;
        const pointKey = `${cubeCenter.x * 3 + offsetX},${cubeCenter.y * 3 + offsetY},${cubeCenter.z * 3 + offsetZ}`;
        let intersectionId = intersectionsByPoint.get(pointKey);

        if (!intersectionId) {
          intersectionId = `intersection-${intersectionIndex}`;
          intersectionIndex += 1;
          intersectionsByPoint.set(pointKey, intersectionId);
          intersectionPoints.set(intersectionId, point);
          intersections[intersectionId] = {
            intersectionId,
            adjacentHexIds: [],
            adjacentEdgeIds: [],
            adjacentIntersectionIds: [],
          };
        }

        cornerIds.push(intersectionId);
        intersections[intersectionId]!.adjacentHexIds.push(hexId);
      });

      for (let side = 0; side < cornerIds.length; side += 1) {
        const a = cornerIds[side]!;
        const b = cornerIds[(side + 1) % cornerIds.length]!;
        const edgeKey = [a, b].sort().join("|");
        let edgeId = edgesByKey.get(edgeKey);

        if (!edgeId) {
          edgeId = `edge-${edgeIndex}`;
          edgeIndex += 1;
          edgesByKey.set(edgeKey, edgeId);
          edges[edgeId] = {
            edgeId,
            intersectionAId: a,
            intersectionBId: b,
            adjacentHexIds: [],
          };
          intersections[a]!.adjacentIntersectionIds.push(b);
          intersections[b]!.adjacentIntersectionIds.push(a);
          intersections[a]!.adjacentEdgeIds.push(edgeId);
          intersections[b]!.adjacentEdgeIds.push(edgeId);
        }

        edges[edgeId]!.adjacentHexIds.push(hexId);
        edgeIds.push(edgeId);
      }

      hexIntersectionIds[hexId] = cornerIds;
      hexEdgeIds[hexId] = edgeIds;
    }
  }

  const adjacentHexIds: Record<string, string[]> = {};
  Object.entries(hexCoords).forEach(([hexId, coord]) => {
    adjacentHexIds[hexId] = HEX_NEIGHBOR_DIRECTIONS.map(([dq, dr]) => hexByCoord.get(`${coord.q + dq},${coord.r + dr}`))
      .filter((candidate): candidate is string => candidate !== undefined)
      .sort();
  });

  Object.values(intersections).forEach((intersection) => {
    intersection.adjacentHexIds.sort();
    intersection.adjacentEdgeIds.sort();
    intersection.adjacentIntersectionIds.sort();
  });

  Object.values(edges).forEach((edge) => {
    edge.adjacentHexIds.sort();
  });

  const coastalEdges = Object.values(edges)
    .filter((edge) => edge.adjacentHexIds.length === 1)
    .sort((left, right) => {
      const leftMidpoint = edgeMidpoint(left, intersectionPoints);
      const rightMidpoint = edgeMidpoint(right, intersectionPoints);
      return Math.atan2(leftMidpoint.y, leftMidpoint.x) - Math.atan2(rightMidpoint.y, rightMidpoint.x);
    });

  const harborSlots = HARBOR_SLOT_INDICES.map((index) => {
    const edge = coastalEdges[index]!;
    return [edge.intersectionAId, edge.intersectionBId] as [string, string];
  });

  return {
    hexOrder,
    hexCoords,
    adjacentHexIds,
    hexIntersectionIds,
    hexEdgeIds,
    intersections,
    edges,
    harborSlots,
  };
}

function hasInvalidHighTokenAdjacency(terrainOrder: TerrainType[], tokenOrder: readonly number[]): boolean {
  const tokensByHex = new Map<string, number>();
  let tokenIndex = 0;

  BOARD_TEMPLATE.hexOrder.forEach((hexId, index) => {
    const terrain = terrainOrder[index]!;
    if (terrain === "desert") {
      return;
    }

    tokensByHex.set(hexId, tokenOrder[tokenIndex]!);
    tokenIndex += 1;
  });

  return BOARD_TEMPLATE.hexOrder.some((hexId) => {
    const token = tokensByHex.get(hexId);
    if (!token || !HIGH_PROBABILITY_TOKENS.has(token)) {
      return false;
    }

    return BOARD_TEMPLATE.adjacentHexIds[hexId]!.some((adjacentHexId) => {
      const adjacentToken = tokensByHex.get(adjacentHexId);
      return adjacentToken !== undefined && HIGH_PROBABILITY_TOKENS.has(adjacentToken);
    });
  });
}

function edgeMidpoint(edge: BoardEdge, intersectionPoints: Map<string, { x: number; y: number }>) {
  const a = intersectionPoints.get(edge.intersectionAId)!;
  const b = intersectionPoints.get(edge.intersectionBId)!;

  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

export function emptyResourceCounts(): ResourceCounts {
  return {
    wood: 0,
    brick: 0,
    sheep: 0,
    wheat: 0,
    ore: 0,
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex]!, items[index]!];
  }

  return items;
}

function createRng(seed: string): () => number {
  const seedFactory = xmur3(seed);
  return mulberry32(seedFactory());
}

function xmur3(seed: string): () => number {
  let hash = 1779033703 ^ seed.length;

  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    return (hash ^= hash >>> 16) >>> 0;
  };
}

function mulberry32(seed: number): () => number {
  return () => {
    let next = (seed += 0x6d2b79f5);
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToPixel(q: number, r: number) {
  return {
    x: Math.sqrt(3) * (q + r / 2),
    y: 1.5 * r,
  };
}

function axialToCube(q: number, r: number) {
  return {
    x: q,
    z: r,
    y: -q - r,
  };
}

function hexCorner(centerX: number, centerY: number, angleDegrees: number) {
  const angle = (Math.PI / 180) * angleDegrees;
  return {
    x: centerX + Math.cos(angle),
    y: centerY + Math.sin(angle),
  };
}
