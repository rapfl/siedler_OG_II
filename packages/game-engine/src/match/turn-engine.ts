import type {
  BoardEdge,
  BoardIntersection,
  GeneratedBoard,
  MatchPlayerState,
  MatchState,
  ResourceCounts,
  ResourceType,
  TurnState,
} from "../../../shared-types/src/index.js";

import { emptyResourceCounts, sumResourceCounts } from "./setup-engine.js";

const ROAD_COST: ResourceCounts = {
  wood: 1,
  brick: 1,
  sheep: 0,
  wheat: 0,
  ore: 0,
};

const SETTLEMENT_COST: ResourceCounts = {
  wood: 1,
  brick: 1,
  sheep: 1,
  wheat: 1,
  ore: 0,
};

const CITY_COST: ResourceCounts = {
  wood: 0,
  brick: 0,
  sheep: 0,
  wheat: 2,
  ore: 3,
};

export type MatchEngineErrorCode =
  | "MATCH_NOT_IN_PROGRESS"
  | "MATCH_ALREADY_FINISHED"
  | "TURN_STATE_MISSING"
  | "NOT_ACTIVE_PLAYER"
  | "INVALID_TURN_PHASE"
  | "PLAYER_NOT_PENDING_DISCARD"
  | "INVALID_DISCARD_COUNT"
  | "INVALID_DISCARD_RESOURCES"
  | "HEX_NOT_FOUND"
  | "ROBBER_TARGET_UNCHANGED"
  | "VICTIM_NOT_STEALABLE"
  | "VICTIM_HAS_NO_RESOURCES"
  | "EDGE_NOT_FOUND"
  | "EDGE_OCCUPIED"
  | "ROAD_NOT_CONNECTED"
  | "INTERSECTION_NOT_FOUND"
  | "INTERSECTION_OCCUPIED"
  | "SETTLEMENT_DISTANCE_RULE"
  | "SETTLEMENT_REQUIRES_ROAD_CONNECTION"
  | "BUILDING_NOT_OWN_SETTLEMENT"
  | "INSUFFICIENT_RESOURCES";

export class MatchEngineError extends Error {
  constructor(
    public readonly code: MatchEngineErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MatchEngineError";
  }
}

export interface MatchEngineContext {
  now: string;
  forcedRollTotal?: number;
}

export interface LongestRoadResult {
  holderPlayerId?: string | undefined;
  length: number;
  roadLengthByPlayerId: Record<string, number>;
}

export interface DiscardResourcesInput {
  resources: Partial<ResourceCounts>;
}

export interface StealResourceContext extends MatchEngineContext {
  forcedResourceType?: ResourceType;
}

export function rollDice(match: MatchState, actorPlayerId: string, context: MatchEngineContext): MatchState {
  const { board, players, turn } = requireTurnContext(match);
  ensureActivePlayer(turn, actorPlayerId);
  ensureTurnPhase(turn, "roll_pending");

  const { total, nextRngState } = nextDiceRoll(match.rngState ?? 1, context.forcedRollTotal);
  const nextTurn: TurnState = {
    ...turn,
    phase: total === 7 ? resolveSevenPhase(players) : "action_phase",
    lastRoll: total,
    discardPlayerIds:
      total === 7
        ? players.filter((player) => sumResourceCounts(player.resources) >= 8).map((player) => player.playerId)
        : undefined,
    discardResolvedPlayerIds: total === 7 ? [] : undefined,
    stealablePlayerIds: undefined,
  };

  if (total === 7) {
    return {
      ...match,
      rngState: nextRngState,
      turn: nextTurn,
      version: match.version + 1,
    };
  }

  const produced = applyProduction(players, board, total);

  return {
    ...match,
    rngState: nextRngState,
    players: produced,
    turn: nextTurn,
    version: match.version + 1,
  };
}

export function endTurn(match: MatchState, actorPlayerId: string, context: MatchEngineContext): MatchState {
  const { turn } = requireTurnContext(match);
  ensureActivePlayer(turn, actorPlayerId);
  ensureTurnPhase(turn, "action_phase");

  const currentIndex = match.playerOrder.indexOf(actorPlayerId);
  const nextPlayerId = match.playerOrder[(currentIndex + 1) % match.playerOrder.length]!;

  const nextMatch: MatchState = {
    ...match,
    turn: {
      activePlayerId: nextPlayerId,
      phase: "roll_pending",
      turnNumber: turn.turnNumber + 1,
      lastRoll: undefined,
      discardPlayerIds: undefined,
      discardResolvedPlayerIds: undefined,
      stealablePlayerIds: undefined,
    },
    version: match.version + 1,
  };

  return evaluateVictory(nextMatch, nextPlayerId, context.now, "turn_start_victory");
}

export function buildRoad(match: MatchState, actorPlayerId: string, edgeId: string, context: MatchEngineContext): MatchState {
  const { board, players, turn } = requireTurnContext(match);
  ensureActivePlayer(turn, actorPlayerId);
  ensureTurnPhase(turn, "action_phase");

  const edge = board.edges[edgeId];
  if (!edge) {
    throw new MatchEngineError("EDGE_NOT_FOUND", `Unknown edge: ${edgeId}`);
  }
  if (edge.road) {
    throw new MatchEngineError("EDGE_OCCUPIED", "Cannot build a road on an occupied edge.");
  }
  if (!canBuildRoad(board, actorPlayerId, edgeId)) {
    throw new MatchEngineError("ROAD_NOT_CONNECTED", "Road must connect to the player's road network or building.");
  }

  const nextPlayers = payCost(players, actorPlayerId, ROAD_COST);
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

  const nextMatch = recalculateLongestRoad({
    ...match,
    board: nextBoard,
    players: nextPlayers,
    version: match.version + 1,
  });

  return evaluateVictory(nextMatch, actorPlayerId, context.now, "score_threshold");
}

export function buildSettlement(
  match: MatchState,
  actorPlayerId: string,
  intersectionId: string,
  context: MatchEngineContext,
): MatchState {
  const { board, players, turn } = requireTurnContext(match);
  ensureActivePlayer(turn, actorPlayerId);
  ensureTurnPhase(turn, "action_phase");

  const intersection = board.intersections[intersectionId];
  if (!intersection) {
    throw new MatchEngineError("INTERSECTION_NOT_FOUND", `Unknown intersection: ${intersectionId}`);
  }
  if (intersection.building) {
    throw new MatchEngineError("INTERSECTION_OCCUPIED", "Cannot build on an occupied intersection.");
  }
  if (intersection.adjacentIntersectionIds.some((adjacentId) => board.intersections[adjacentId]?.building)) {
    throw new MatchEngineError("SETTLEMENT_DISTANCE_RULE", "Settlement violates the distance rule.");
  }
  if (!intersection.adjacentEdgeIds.some((edgeId) => board.edges[edgeId]?.road?.ownerPlayerId === actorPlayerId)) {
    throw new MatchEngineError(
      "SETTLEMENT_REQUIRES_ROAD_CONNECTION",
      "Settlement requires a connected road belonging to the active player.",
    );
  }

  const nextPlayers = payCost(players, actorPlayerId, SETTLEMENT_COST);
  const nextBoard: GeneratedBoard = {
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
  };

  const nextMatch = recalculateLongestRoad({
    ...match,
    board: nextBoard,
    players: nextPlayers,
    version: match.version + 1,
  });

  return evaluateVictory(nextMatch, actorPlayerId, context.now, "score_threshold");
}

export function upgradeCity(
  match: MatchState,
  actorPlayerId: string,
  intersectionId: string,
  context: MatchEngineContext,
): MatchState {
  const { board, players, turn } = requireTurnContext(match);
  ensureActivePlayer(turn, actorPlayerId);
  ensureTurnPhase(turn, "action_phase");

  const intersection = board.intersections[intersectionId];
  if (!intersection) {
    throw new MatchEngineError("INTERSECTION_NOT_FOUND", `Unknown intersection: ${intersectionId}`);
  }
  if (
    intersection.building?.ownerPlayerId !== actorPlayerId ||
    intersection.building.buildingType !== "settlement"
  ) {
    throw new MatchEngineError("BUILDING_NOT_OWN_SETTLEMENT", "City upgrade requires an existing own settlement.");
  }

  const nextPlayers = payCost(players, actorPlayerId, CITY_COST);
  const nextBoard: GeneratedBoard = {
    ...board,
    intersections: {
      ...board.intersections,
      [intersectionId]: {
        ...intersection,
        building: {
          ownerPlayerId: actorPlayerId,
          buildingType: "city",
        },
      },
    },
  };

  const nextMatch = recalculateLongestRoad({
    ...match,
    board: nextBoard,
    players: nextPlayers,
    version: match.version + 1,
  });

  return evaluateVictory(nextMatch, actorPlayerId, context.now, "score_threshold");
}

export function calculateVisiblePoints(match: MatchState): Record<string, number> {
  const { board } = requireBoard(match);
  const points = Object.fromEntries(match.playerOrder.map((playerId) => [playerId, 0])) as Record<string, number>;

  for (const intersection of Object.values(board.intersections)) {
    if (!intersection.building) {
      continue;
    }

    const ownerPlayerId = intersection.building.ownerPlayerId;
    points[ownerPlayerId] = (points[ownerPlayerId] ?? 0) + (intersection.building.buildingType === "city" ? 2 : 1);
  }

  if (match.longestRoadHolderPlayerId) {
    points[match.longestRoadHolderPlayerId] = (points[match.longestRoadHolderPlayerId] ?? 0) + 2;
  }

  return points;
}

export function discardResources(
  match: MatchState,
  actorPlayerId: string,
  input: DiscardResourcesInput,
): MatchState {
  const { players, turn } = requireTurnContext(match);
  ensureTurnPhase(turn, "discard_pending");

  if (!turn.discardPlayerIds?.includes(actorPlayerId) || turn.discardResolvedPlayerIds?.includes(actorPlayerId)) {
    throw new MatchEngineError("PLAYER_NOT_PENDING_DISCARD", "Player is not currently required to discard.");
  }

  const actor = players.find((player) => player.playerId === actorPlayerId)!;
  const requiredDiscardCount = Math.floor(sumResourceCounts(actor.resources) / 2);
  const requestedDiscardCount = sumResourceCounts(normalizeResourceCounts(input.resources));

  if (requestedDiscardCount !== requiredDiscardCount) {
    throw new MatchEngineError(
      "INVALID_DISCARD_COUNT",
      `Expected discard of ${requiredDiscardCount} cards, received ${requestedDiscardCount}.`,
    );
  }

  if (!hasResources(actor.resources, normalizeResourceCounts(input.resources))) {
    throw new MatchEngineError("INVALID_DISCARD_RESOURCES", "Player cannot discard resources they do not have.");
  }

  const nextPlayers = players.map((player) =>
    player.playerId === actorPlayerId
      ? {
          ...player,
          resources: subtractResources(player.resources, normalizeResourceCounts(input.resources)),
        }
      : player,
  );

  const nextResolvedPlayerIds = [...(turn.discardResolvedPlayerIds ?? []), actorPlayerId];
  const allResolved = (turn.discardPlayerIds ?? []).every((playerId) => nextResolvedPlayerIds.includes(playerId));

  return {
    ...match,
    players: nextPlayers,
    turn: {
      ...turn,
      phase: allResolved ? "robber_pending" : "discard_pending",
      discardResolvedPlayerIds: nextResolvedPlayerIds,
    },
    version: match.version + 1,
  };
}

export function moveRobber(match: MatchState, actorPlayerId: string, targetHexId: string): MatchState {
  const { board, players, turn } = requireTurnContext(match);
  ensureActivePlayer(turn, actorPlayerId);
  ensureTurnPhase(turn, "robber_pending");

  const targetHex = board.hexes[targetHexId];
  if (!targetHex) {
    throw new MatchEngineError("HEX_NOT_FOUND", `Unknown hex: ${targetHexId}`);
  }
  if (board.robberHexId === targetHexId) {
    throw new MatchEngineError("ROBBER_TARGET_UNCHANGED", "Robber must move to a different hex.");
  }

  const nextHexes = structuredClone(board.hexes);
  nextHexes[board.robberHexId] = {
    ...nextHexes[board.robberHexId]!,
    hasRobber: false,
  };
  nextHexes[targetHexId] = {
    ...nextHexes[targetHexId]!,
    hasRobber: true,
  };

  const stealablePlayerIds = deriveStealablePlayerIds(players, board, actorPlayerId, targetHexId);
  const phase = stealablePlayerIds.length > 0 ? "robber_pending" : "action_phase";

  return {
    ...match,
    board: {
      ...board,
      hexes: nextHexes,
      robberHexId: targetHexId,
    },
    turn: {
      ...turn,
      phase,
      discardPlayerIds: phase === "action_phase" ? undefined : turn.discardPlayerIds,
      discardResolvedPlayerIds: phase === "action_phase" ? undefined : turn.discardResolvedPlayerIds,
      stealablePlayerIds: stealablePlayerIds.length > 0 ? stealablePlayerIds : undefined,
    },
    version: match.version + 1,
  };
}

export function stealResource(
  match: MatchState,
  actorPlayerId: string,
  victimPlayerId: string,
  context: StealResourceContext,
): MatchState {
  const { players, turn } = requireTurnContext(match);
  ensureActivePlayer(turn, actorPlayerId);
  ensureTurnPhase(turn, "robber_pending");

  if (!turn.stealablePlayerIds?.includes(victimPlayerId)) {
    throw new MatchEngineError("VICTIM_NOT_STEALABLE", "Selected victim is not currently stealable.");
  }

  const victim = players.find((player) => player.playerId === victimPlayerId)!;
  if (sumResourceCounts(victim.resources) === 0) {
    throw new MatchEngineError("VICTIM_HAS_NO_RESOURCES", "Victim has no resources to steal.");
  }

  const { resourceType, nextRngState } = drawStolenResource(
    victim.resources,
    match.rngState ?? 1,
    context.forcedResourceType,
  );

  const nextPlayers = players.map((player) => {
    if (player.playerId === victimPlayerId) {
      return {
        ...player,
        resources: subtractResources(player.resources, {
          ...emptyResourceCounts(),
          [resourceType]: 1,
        }),
      };
    }

    if (player.playerId === actorPlayerId) {
      return {
        ...player,
        resources: addResources(player.resources, {
          ...emptyResourceCounts(),
          [resourceType]: 1,
        }),
      };
    }

    return player;
  });

  return {
    ...match,
    players: nextPlayers,
    rngState: nextRngState,
    turn: {
      ...turn,
      phase: "action_phase",
      discardPlayerIds: undefined,
      discardResolvedPlayerIds: undefined,
      stealablePlayerIds: undefined,
    },
    version: match.version + 1,
  };
}

export function calculateLongestRoad(match: MatchState): LongestRoadResult {
  const { board } = requireBoard(match);
  const roadLengthByPlayerId = Object.fromEntries(match.playerOrder.map((playerId) => [playerId, 0])) as Record<
    string,
    number
  >;

  for (const playerId of match.playerOrder) {
    const ownedEdges = Object.values(board.edges).filter((edge) => edge.road?.ownerPlayerId === playerId);
    if (ownedEdges.length === 0) {
      continue;
    }

    roadLengthByPlayerId[playerId] = longestRoadLengthForPlayer(board, playerId, ownedEdges.map((edge) => edge.edgeId));
  }

  const maxLength = Math.max(0, ...Object.values(roadLengthByPlayerId));
  if (maxLength < 5) {
    return {
      holderPlayerId: undefined,
      length: maxLength,
      roadLengthByPlayerId,
    };
  }

  const leaders = Object.entries(roadLengthByPlayerId)
    .filter(([, length]) => length === maxLength)
    .map(([playerId]) => playerId);

  if (leaders.length === 1) {
    return {
      holderPlayerId: leaders[0],
      length: maxLength,
      roadLengthByPlayerId,
    };
  }

  if (match.longestRoadHolderPlayerId && leaders.includes(match.longestRoadHolderPlayerId)) {
    return {
      holderPlayerId: match.longestRoadHolderPlayerId,
      length: maxLength,
      roadLengthByPlayerId,
    };
  }

  return {
    holderPlayerId: undefined,
    length: maxLength,
    roadLengthByPlayerId,
  };
}

function recalculateLongestRoad(match: MatchState): MatchState {
  const result = calculateLongestRoad(match);

  return {
    ...match,
    longestRoadHolderPlayerId: result.holderPlayerId,
    longestRoadLength: result.length,
  };
}

function evaluateVictory(
  match: MatchState,
  subjectPlayerId: string,
  now: string,
  victoryCause: MatchState["victoryCause"],
): MatchState {
  const visiblePoints = calculateVisiblePoints(match);

  if ((visiblePoints[subjectPlayerId] ?? 0) < 10) {
    return match;
  }

  return {
    ...match,
    status: "match_finished",
    winnerPlayerId: subjectPlayerId,
    victoryCause,
    finishedAt: now,
    version: match.version + 1,
  };
}

function longestRoadLengthForPlayer(board: GeneratedBoard, playerId: string, ownedEdgeIds: string[]): number {
  const adjacency = new Map<string, string[]>();

  for (const edgeId of ownedEdgeIds) {
    adjacency.set(edgeId, []);
  }

  for (const edgeId of ownedEdgeIds) {
    const edge = board.edges[edgeId]!;
    const intersections = [edge.intersectionAId, edge.intersectionBId];

    for (const intersectionId of intersections) {
      const intersection = board.intersections[intersectionId]!;
      const blockedByOpponent =
        intersection.building !== undefined && intersection.building.ownerPlayerId !== playerId;

      if (blockedByOpponent) {
        continue;
      }

      for (const adjacentEdgeId of intersection.adjacentEdgeIds) {
        if (adjacentEdgeId === edgeId) {
          continue;
        }
        if (board.edges[adjacentEdgeId]?.road?.ownerPlayerId !== playerId) {
          continue;
        }

        adjacency.get(edgeId)!.push(adjacentEdgeId);
      }
    }
  }

  let best = 0;

  for (const edgeId of ownedEdgeIds) {
    const visited = new Set<string>([edgeId]);
    best = Math.max(best, depthFirstRoad(edgeId, adjacency, visited));
  }

  return best;
}

function depthFirstRoad(edgeId: string, adjacency: Map<string, string[]>, visited: Set<string>): number {
  const nextEdges = adjacency.get(edgeId) ?? [];
  let best = visited.size;

  for (const nextEdgeId of nextEdges) {
    if (visited.has(nextEdgeId)) {
      continue;
    }

    visited.add(nextEdgeId);
    best = Math.max(best, depthFirstRoad(nextEdgeId, adjacency, visited));
    visited.delete(nextEdgeId);
  }

  return best;
}

function applyProduction(players: MatchPlayerState[], board: GeneratedBoard, rollTotal: number): MatchPlayerState[] {
  const gainsByPlayer = new Map<string, ResourceCounts>();

  for (const hex of Object.values(board.hexes)) {
    if (hex.tokenNumber !== rollTotal || hex.hasRobber || hex.resourceType === "desert") {
      continue;
    }

    for (const intersectionId of hex.adjacentIntersectionIds) {
      const building = board.intersections[intersectionId]?.building;
      if (!building) {
        continue;
      }

      const gain = gainsByPlayer.get(building.ownerPlayerId) ?? emptyResourceCounts();
      gain[hex.resourceType] += building.buildingType === "city" ? 2 : 1;
      gainsByPlayer.set(building.ownerPlayerId, gain);
    }
  }

  return players.map((player) => ({
    ...player,
    resources: gainsByPlayer.has(player.playerId)
      ? addResources(player.resources, gainsByPlayer.get(player.playerId)!)
      : player.resources,
  }));
}

function payCost(players: MatchPlayerState[], actorPlayerId: string, cost: ResourceCounts): MatchPlayerState[] {
  return players.map((player) => {
    if (player.playerId !== actorPlayerId) {
      return player;
    }

    if (!hasResources(player.resources, cost)) {
      throw new MatchEngineError("INSUFFICIENT_RESOURCES", "Player does not have the required resources.");
    }

    return {
      ...player,
      resources: subtractResources(player.resources, cost),
    };
  });
}

function hasResources(available: ResourceCounts, required: ResourceCounts): boolean {
  return RESOURCE_TYPES.every((resourceType) => available[resourceType] >= required[resourceType]);
}

function subtractResources(resources: ResourceCounts, cost: ResourceCounts): ResourceCounts {
  const next = { ...resources };

  for (const resourceType of RESOURCE_TYPES) {
    next[resourceType] -= cost[resourceType];
  }

  return next;
}

function addResources(resources: ResourceCounts, gain: ResourceCounts): ResourceCounts {
  const next = { ...resources };

  for (const resourceType of RESOURCE_TYPES) {
    next[resourceType] += gain[resourceType];
  }

  return next;
}

function canBuildRoad(board: GeneratedBoard, playerId: string, edgeId: string): boolean {
  const edge = board.edges[edgeId];
  if (!edge || edge.road) {
    return false;
  }

  return [edge.intersectionAId, edge.intersectionBId].some((intersectionId) => {
    const intersection = board.intersections[intersectionId];
    if (!intersection) {
      return false;
    }

    if (intersection.building?.ownerPlayerId === playerId) {
      return true;
    }

    if (intersection.building?.ownerPlayerId && intersection.building.ownerPlayerId !== playerId) {
      return false;
    }

    return intersection.adjacentEdgeIds.some((adjacentEdgeId) => board.edges[adjacentEdgeId]?.road?.ownerPlayerId === playerId);
  });
}

function resolveSevenPhase(players: MatchPlayerState[]): TurnState["phase"] {
  return players.some((player) => sumResourceCounts(player.resources) >= 8) ? "discard_pending" : "robber_pending";
}

function deriveStealablePlayerIds(
  players: MatchPlayerState[],
  board: GeneratedBoard,
  actorPlayerId: string,
  targetHexId: string,
): string[] {
  const victims = new Set<string>();

  for (const intersectionId of board.hexes[targetHexId]!.adjacentIntersectionIds) {
    const building = board.intersections[intersectionId]?.building;
    if (!building || building.ownerPlayerId === actorPlayerId) {
      continue;
    }

    const victim = players.find((player) => player.playerId === building.ownerPlayerId);
    if (victim && sumResourceCounts(victim.resources) > 0) {
      victims.add(victim.playerId);
    }
  }

  return [...victims].sort();
}

function drawStolenResource(
  resources: ResourceCounts,
  rngState: number,
  forcedResourceType?: ResourceType,
): { resourceType: ResourceType; nextRngState: number } {
  if (forcedResourceType !== undefined) {
    if (resources[forcedResourceType] <= 0) {
      throw new MatchEngineError("VICTIM_HAS_NO_RESOURCES", "Forced stolen resource is not available on the victim.");
    }

    return {
      resourceType: forcedResourceType,
      nextRngState: rngState,
    };
  }

  const totalCards = sumResourceCounts(resources);
  const nextState = nextRng(rngState).state;
  let cursor = nextState % totalCards;

  for (const resourceType of RESOURCE_TYPES) {
    const count = resources[resourceType];
    if (cursor < count) {
      return {
        resourceType,
        nextRngState: nextState,
      };
    }

    cursor -= count;
  }

  return {
    resourceType: "wood",
    nextRngState: nextState,
  };
}

function nextDiceRoll(rngState: number, forcedRollTotal?: number) {
  if (forcedRollTotal !== undefined) {
    if (forcedRollTotal < 2 || forcedRollTotal > 12) {
      throw new MatchEngineError("INVALID_TURN_PHASE", "Forced roll total must be between 2 and 12.");
    }

    return {
      total: forcedRollTotal,
      nextRngState: rngState,
    };
  }

  const first = nextRng(rngState);
  const second = nextRng(first.state);

  return {
    total: ((first.state % 6) + 1) + ((second.state % 6) + 1),
    nextRngState: second.state,
  };
}

function nextRng(state: number) {
  return {
    state: (Math.imul(state, 1664525) + 1013904223) >>> 0,
  };
}

function requireTurnContext(match: MatchState) {
  if (match.status === "match_finished") {
    throw new MatchEngineError("MATCH_ALREADY_FINISHED", "Match is already finished.");
  }
  if (match.status !== "match_in_progress") {
    throw new MatchEngineError("MATCH_NOT_IN_PROGRESS", "Match must be in progress for turn commands.");
  }
  if (!match.board || !match.players) {
    throw new MatchEngineError("MATCH_NOT_IN_PROGRESS", "Match board or player state is missing.");
  }
  if (!match.turn) {
    throw new MatchEngineError("TURN_STATE_MISSING", "Turn state is missing.");
  }

  return {
    board: match.board,
    players: match.players,
    turn: match.turn,
  };
}

function requireBoard(match: MatchState) {
  if (!match.board) {
    throw new MatchEngineError("MATCH_NOT_IN_PROGRESS", "Board state is missing.");
  }

  return {
    board: match.board,
  };
}

function ensureActivePlayer(turn: TurnState, actorPlayerId: string): void {
  if (turn.activePlayerId !== actorPlayerId) {
    throw new MatchEngineError("NOT_ACTIVE_PLAYER", "Only the active player may perform this command.");
  }
}

function ensureTurnPhase(turn: TurnState, expectedPhase: TurnState["phase"]): void {
  if (turn.phase !== expectedPhase) {
    throw new MatchEngineError(
      "INVALID_TURN_PHASE",
      `Command requires turn phase ${expectedPhase}, received ${turn.phase}.`,
    );
  }
}

const RESOURCE_TYPES: ResourceType[] = ["wood", "brick", "sheep", "wheat", "ore"];

function normalizeResourceCounts(resources: Partial<ResourceCounts>): ResourceCounts {
  return {
    wood: resources.wood ?? 0,
    brick: resources.brick ?? 0,
    sheep: resources.sheep ?? 0,
    wheat: resources.wheat ?? 0,
    ore: resources.ore ?? 0,
  };
}
