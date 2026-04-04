import { describe, expect, it } from "vitest";

import {
  MatchEngineError,
  buildRoad,
  buildSettlement,
  calculateVisiblePoints,
  createRoom,
  discardResources,
  endTurn,
  getLegalInitialRoadPlacements,
  getLegalInitialSettlementPlacements,
  initializeMatchSetup,
  joinRoom,
  moveRobber,
  placeInitialRoad,
  placeInitialSettlement,
  rollDice,
  stealResource,
  startMatch,
  toggleReady,
  upgradeCity,
} from "../src/index.js";
import type { MatchState, ResourceCounts } from "../../shared-types/src/index.js";

const context = {
  now: "2026-04-04T09:30:00.000Z",
  roomIdFactory: () => "room-turn",
  roomCodeFactory: () => "TURN01",
  matchIdFactory: () => "match-turn",
  matchSeedFactory: () => "seed-turn",
};

function createReadyRoom(playerCount: 3 | 4) {
  let room = createRoom(context, {
    host: {
      playerId: "p1",
      displayName: "P1",
      sessionId: "s1",
    },
    maxPlayers: playerCount,
  });

  const players = [
    { playerId: "p2", displayName: "P2", sessionId: "s2" },
    { playerId: "p3", displayName: "P3", sessionId: "s3" },
    { playerId: "p4", displayName: "P4", sessionId: "s4" },
  ];

  for (const player of players.slice(0, playerCount - 1)) {
    room = joinRoom(room, context, { player });
  }

  for (const player of room.players) {
    room = toggleReady(room, context, player.playerId, true);
  }

  return room;
}

function completeSetup(playerCount: 3 | 4 = 4): MatchState {
  const started = startMatch(createReadyRoom(playerCount), context, "p1").match;
  let match = initializeMatchSetup(started);

  while (match.status === "match_setup") {
    const actor = match.setup?.currentPlayerId!;
    if (match.setup?.step === "setup_forward_settlement" || match.setup?.step === "setup_reverse_settlement") {
      match = placeInitialSettlement(match, actor, getLegalInitialSettlementPlacements(match, actor)[0]!);
    } else {
      match = placeInitialRoad(match, actor, getLegalInitialRoadPlacements(match, actor)[0]!);
    }
  }

  return match;
}

function withResources(match: MatchState, playerId: string, resources: Partial<ResourceCounts>): MatchState {
  return {
    ...match,
    players: match.players?.map((player) =>
      player.playerId === playerId
        ? {
            ...player,
            resources: {
              ...player.resources,
              ...resources,
            },
          }
        : player,
    ),
  };
}

function toActionPhase(match: MatchState, activePlayerId = match.turn?.activePlayerId ?? "p1"): MatchState {
  return {
    ...match,
    turn: {
      ...match.turn!,
      activePlayerId,
      phase: "action_phase",
      lastRoll: 8,
    },
  };
}

function findLegalRoadTarget(match: MatchState, playerId: string): string {
  for (const edgeId of Object.keys(match.board!.edges)) {
    try {
      buildRoad(withResources(match, playerId, { wood: 10, brick: 10 }), playerId, edgeId, { now: context.now });
      return edgeId;
    } catch {
      continue;
    }
  }

  throw new Error(`No legal road target found for ${playerId}`);
}

function findIllegalRoadTarget(match: MatchState, playerId: string): string {
  for (const edgeId of Object.keys(match.board!.edges)) {
    try {
      buildRoad(withResources(match, playerId, { wood: 10, brick: 10 }), playerId, edgeId, { now: context.now });
    } catch {
      return edgeId;
    }
  }

  throw new Error(`No illegal road target found for ${playerId}`);
}

function findRobberTargetForVictim(match: MatchState, actorPlayerId: string, victimPlayerId: string): string {
  return Object.values(match.board!.hexes).find(
    (hex) =>
      hex.hexId !== match.board!.robberHexId &&
      hex.adjacentIntersectionIds.some(
        (intersectionId) =>
          match.board!.intersections[intersectionId]?.building?.ownerPlayerId === victimPlayerId &&
          victimPlayerId !== actorPlayerId,
      ),
  )!.hexId;
}

function findLegalSettlementTarget(match: MatchState, playerId: string): string {
  for (const intersectionId of Object.keys(match.board!.intersections)) {
    try {
      buildSettlement(
        withResources(match, playerId, { wood: 10, brick: 10, sheep: 10, wheat: 10 }),
        playerId,
        intersectionId,
        { now: context.now },
      );
      return intersectionId;
    } catch {
      continue;
    }
  }

  throw new Error(`No legal settlement target found for ${playerId}`);
}

function tryFindLegalSettlementTarget(match: MatchState, playerId: string): string | undefined {
  try {
    return findLegalSettlementTarget(match, playerId);
  } catch {
    return undefined;
  }
}

describe("turn engine", () => {
  it("plays a regular turn: roll, production, action phase, end turn", () => {
    const match = completeSetup(4);
    const activePlayerId = match.turn?.activePlayerId!;
    const trackedHex = match.board!.hexOrder
      .map((hexId) => match.board!.hexes[hexId]!)
      .find((hex) =>
        hex.tokenNumber !== undefined &&
        hex.resourceType !== "desert" &&
        hex.adjacentIntersectionIds.some(
          (intersectionId) => match.board!.intersections[intersectionId]?.building?.ownerPlayerId === activePlayerId,
        ),
      )!;

    const before = structuredClone(match.players);
    const rolled = rollDice(match, activePlayerId, {
      now: "2026-04-04T10:00:00.000Z",
      forcedRollTotal: trackedHex.tokenNumber,
    });

    expect(rolled.turn).toMatchObject({
      activePlayerId,
      phase: "action_phase",
      lastRoll: trackedHex.tokenNumber,
    });

    for (const player of rolled.players ?? []) {
      const previous = before?.find((entry) => entry.playerId === player.playerId)!;
      const produced = Object.keys(player.resources).some(
        (resource) =>
          player.resources[resource as keyof ResourceCounts] !== previous.resources[resource as keyof ResourceCounts],
      );
      if (player.playerId === activePlayerId) {
        expect(produced).toBe(true);
      }
    }

    const ended = endTurn(rolled, activePlayerId, { now: "2026-04-04T10:01:00.000Z" });
    expect(ended.turn).toMatchObject({
      activePlayerId: "p2",
      phase: "roll_pending",
      turnNumber: 2,
    });
  });

  it("transitions 7 into forced-state groundwork", () => {
    const match = withResources(completeSetup(4), "p2", {
      wood: 3,
      brick: 2,
      sheep: 1,
      wheat: 1,
      ore: 1,
    });

    const rolled = rollDice(match, "p1", {
      now: "2026-04-04T10:00:00.000Z",
      forcedRollTotal: 7,
    });

    expect(rolled.turn).toMatchObject({
      phase: "discard_pending",
      lastRoll: 7,
      discardPlayerIds: ["p2"],
    });
  });

  it("resolves discard, blocks normal builds during forced states, then moves robber and steals", () => {
    const match = withResources(completeSetup(4), "p2", {
      wood: 8,
    });

    const rolled = rollDice(match, "p1", {
      now: "2026-04-04T10:00:00.000Z",
      forcedRollTotal: 7,
    });

    expect(() =>
      buildRoad(withResources(rolled, "p1", { wood: 5, brick: 5 }), "p1", findLegalRoadTarget(toActionPhase(rolled), "p1"), {
        now: "2026-04-04T10:00:30.000Z",
      }),
    ).toThrowError(MatchEngineError);

    expect(() =>
      discardResources(rolled, "p2", {
        resources: {
          wood: 3,
        },
      }),
    ).toThrowError(MatchEngineError);

    const discarded = discardResources(rolled, "p2", {
      resources: {
        wood: 4,
      },
    });

    expect(discarded.turn).toMatchObject({
      phase: "robber_pending",
      discardResolvedPlayerIds: ["p2"],
    });

    const robberHexId = findRobberTargetForVictim(discarded, "p1", "p2");
    const moved = moveRobber(discarded, "p1", robberHexId);

    expect(moved.turn?.stealablePlayerIds).toContain("p2");
    const p1WoodBeforeSteal = moved.players?.find((player) => player.playerId === "p1")?.resources.wood ?? 0;
    const p2WoodBeforeSteal = moved.players?.find((player) => player.playerId === "p2")?.resources.wood ?? 0;

    const stolen = stealResource(moved, "p1", "p2", {
      now: "2026-04-04T10:01:00.000Z",
      forcedResourceType: "wood",
    });

    expect(stolen.turn).toMatchObject({
      phase: "action_phase",
      stealablePlayerIds: undefined,
    });
    expect(stolen.players?.find((player) => player.playerId === "p1")?.resources.wood).toBe(p1WoodBeforeSteal + 1);
    expect(stolen.players?.find((player) => player.playerId === "p2")?.resources.wood).toBe(p2WoodBeforeSteal - 1);
  });

  it("produces 2 for a city and 0 when the robber blocks the hex", () => {
    const match = completeSetup(4);
    const intersectionId = match.players?.find((player) => player.playerId === "p1")?.initialSettlementIntersectionIds[0]!;
    const targetHexId = match.board!.intersections[intersectionId]!.adjacentHexIds.find(
      (hexId) => match.board!.hexes[hexId]!.resourceType !== "desert",
    )!;
    const targetHex = match.board!.hexes[targetHexId]!;
    const isolatedBoard = structuredClone(match.board!);

    for (const hex of Object.values(isolatedBoard.hexes)) {
      hex.hasRobber = false;
      if (hex.hexId !== targetHexId && !hex.isDesert) {
        hex.tokenNumber = 3;
      }
    }

    isolatedBoard.hexes[targetHexId] = {
      ...isolatedBoard.hexes[targetHexId]!,
      tokenNumber: 8,
      hasRobber: false,
    };
    isolatedBoard.intersections[intersectionId] = {
      ...isolatedBoard.intersections[intersectionId]!,
      building: {
        ownerPlayerId: "p1",
        buildingType: "city",
      },
    };

    const cityMatch = {
      ...match,
      board: isolatedBoard,
    };

    const produced = rollDice(cityMatch, "p1", {
      now: "2026-04-04T10:00:00.000Z",
      forcedRollTotal: 8,
    });
    expect(produced.players?.find((player) => player.playerId === "p1")?.resources[targetHex.resourceType]).toBe(2);

    const blocked = {
      ...cityMatch,
      board: {
        ...cityMatch.board!,
        robberHexId: targetHexId,
        hexes: {
          ...cityMatch.board!.hexes,
          [targetHexId]: {
            ...cityMatch.board!.hexes[targetHexId]!,
            hasRobber: true,
          },
        },
      },
    };

    const blockedProduced = rollDice(blocked, "p1", {
      now: "2026-04-04T10:00:00.000Z",
      forcedRollTotal: 8,
    });
    expect(blockedProduced.players?.find((player) => player.playerId === "p1")?.resources[targetHex.resourceType]).toBe(0);
  });

  it("builds connected roads, updates longest road, and rejects disconnected roads", () => {
    let match = toActionPhase(withResources(completeSetup(4), "p1", {
      wood: 10,
      brick: 10,
    }));

    for (let index = 0; index < 8 && match.longestRoadHolderPlayerId !== "p1"; index += 1) {
      match = buildRoad(match, "p1", findLegalRoadTarget(match, "p1"), {
        now: `2026-04-04T10:0${index}:00.000Z`,
      });
    }

    const illegalEdgeId = findIllegalRoadTarget(match, "p1");

    expect(match.longestRoadHolderPlayerId).toBe("p1");
    expect(match.longestRoadLength).toBeGreaterThanOrEqual(5);

    expect(() => buildRoad(match, "p1", illegalEdgeId, { now: "2026-04-04T10:09:00.000Z" })).toThrowError(
      MatchEngineError,
    );
  });

  it("builds a legal settlement only when road-connected", () => {
    let match = toActionPhase(withResources(completeSetup(4), "p1", {
      wood: 10,
      brick: 10,
      sheep: 10,
      wheat: 10,
    }));

    let intersectionId = tryFindLegalSettlementTarget(match, "p1");
    let roadsBuilt = 0;
    while (!intersectionId && roadsBuilt < 8) {
      match = buildRoad(match, "p1", findLegalRoadTarget(match, "p1"), {
        now: `2026-04-04T10:${roadsBuilt.toString().padStart(2, "0")}:00.000Z`,
      });
      intersectionId = tryFindLegalSettlementTarget(match, "p1");
      roadsBuilt += 1;
    }

    expect(intersectionId).toBeDefined();
    const built = buildSettlement(match, "p1", intersectionId!, {
      now: "2026-04-04T10:01:00.000Z",
    });

    expect(built.board!.intersections[intersectionId!]!.building).toMatchObject({
      ownerPlayerId: "p1",
      buildingType: "settlement",
    });
    expect(built.players?.find((player) => player.playerId === "p1")?.resources).toMatchObject({
      wood: 10 - roadsBuilt - 1,
      brick: 10 - roadsBuilt - 1,
      sheep: 9,
      wheat: 9,
    });
  });

  it("finishes the match when an upgrade pushes the active player to 10 visible points", () => {
    const match = completeSetup(4);
    const targetUpgradeId = match.players?.find((player) => player.playerId === "p1")?.initialSettlementIntersectionIds[0]!;
    const otherStartingSettlementId = match.players?.find((player) => player.playerId === "p1")?.initialSettlementIntersectionIds[1]!;
    const manualBoard = structuredClone(match.board!);
    const extraIntersectionIds = Object.keys(manualBoard.intersections)
      .filter((intersectionId) => !manualBoard.intersections[intersectionId]!.building)
      .slice(0, 4);

    manualBoard.intersections[otherStartingSettlementId] = {
      ...manualBoard.intersections[otherStartingSettlementId]!,
      building: {
        ownerPlayerId: "p1",
        buildingType: "city",
      },
    };

    manualBoard.intersections[extraIntersectionIds[0]!] = {
      ...manualBoard.intersections[extraIntersectionIds[0]!]!,
      building: {
        ownerPlayerId: "p1",
        buildingType: "city",
      },
    };
    manualBoard.intersections[extraIntersectionIds[1]!] = {
      ...manualBoard.intersections[extraIntersectionIds[1]!]!,
      building: {
        ownerPlayerId: "p1",
        buildingType: "city",
      },
    };
    manualBoard.intersections[extraIntersectionIds[2]!] = {
      ...manualBoard.intersections[extraIntersectionIds[2]!]!,
      building: {
        ownerPlayerId: "p1",
        buildingType: "settlement",
      },
    };
    manualBoard.intersections[extraIntersectionIds[3]!] = {
      ...manualBoard.intersections[extraIntersectionIds[3]!]!,
      building: {
        ownerPlayerId: "p1",
        buildingType: "settlement",
      },
    };

    const primed = toActionPhase(withResources(
      {
        ...match,
        board: manualBoard,
      },
      "p1",
      {
        wheat: 2,
        ore: 3,
      },
    ));

    expect(calculateVisiblePoints(primed).p1).toBe(9);

    const upgraded = upgradeCity(primed, "p1", targetUpgradeId, {
      now: "2026-04-04T10:05:00.000Z",
    });

    expect(upgraded.status).toBe("match_finished");
    expect(upgraded.winnerPlayerId).toBe("p1");
    expect(calculateVisiblePoints(upgraded).p1).toBe(10);
  });
});
