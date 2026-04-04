import { describe, expect, it } from "vitest";

import {
  SetupEngineError,
  createRoom,
  generateBoard,
  getLegalInitialRoadPlacements,
  getLegalInitialSettlementPlacements,
  initializeMatchSetup,
  joinRoom,
  placeInitialRoad,
  placeInitialSettlement,
  startMatch,
  sumResourceCounts,
  toggleReady,
} from "../src/index.js";

const context = {
  now: "2026-04-04T09:30:00.000Z",
  roomIdFactory: () => "room-setup",
  roomCodeFactory: () => "SETUP1",
  matchIdFactory: () => "match-setup",
  matchSeedFactory: () => "seed-setup",
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

  room = toggleReady(room, context, "p1", true);
  room = toggleReady(room, context, "p2", true);
  room = toggleReady(room, context, "p3", true);

  if (playerCount === 4) {
    room = toggleReady(room, context, "p4", true);
  }

  return room;
}

describe("setup engine", () => {
  it("generates the same board for the same seed and changes for a different seed", () => {
    const boardA = generateBoard("seed-repeatable");
    const boardB = generateBoard("seed-repeatable");
    const boardC = generateBoard("seed-different");

    expect(boardA).toEqual(boardB);
    expect(boardC).not.toEqual(boardA);
  });

  it("generates a seeded base-game board with the expected topology and fair high tokens", () => {
    const board = generateBoard("seed-a");

    expect(board.hexOrder).toHaveLength(19);
    expect(Object.keys(board.intersections)).toHaveLength(54);
    expect(Object.keys(board.edges)).toHaveLength(72);
    expect(Object.keys(board.harbors)).toHaveLength(9);

    const desertHexes = Object.values(board.hexes).filter((hex) => hex.isDesert);
    expect(desertHexes).toHaveLength(1);
    expect(board.robberHexId).toBe(desertHexes[0]?.hexId);
    expect(desertHexes[0]?.tokenNumber).toBeUndefined();

    const invalidHighAdjacency = Object.values(board.hexes).some((hex) => {
      if (hex.tokenNumber !== 6 && hex.tokenNumber !== 8) {
        return false;
      }

      return hex.adjacentHexIds.some((adjacentHexId) => {
        const adjacent = board.hexes[adjacentHexId];
        return adjacent?.tokenNumber === 6 || adjacent?.tokenNumber === 8;
      });
    });

    expect(invalidHighAdjacency).toBe(false);
  });

  it("matches the base-game terrain, token, harbor, and robber invariants", () => {
    const board = generateBoard("seed-invariants");

    const terrainCounts = Object.values(board.hexes).reduce<Record<string, number>>((counts, hex) => {
      counts[hex.resourceType] = (counts[hex.resourceType] ?? 0) + 1;
      return counts;
    }, {});

    expect(terrainCounts).toMatchObject({
      wood: 4,
      sheep: 4,
      wheat: 4,
      brick: 3,
      ore: 3,
      desert: 1,
    });

    const tokenCounts = Object.values(board.hexes).reduce<Record<number, number>>((counts, hex) => {
      if (hex.tokenNumber !== undefined) {
        counts[hex.tokenNumber] = (counts[hex.tokenNumber] ?? 0) + 1;
      }
      return counts;
    }, {});

    expect(tokenCounts).toEqual({
      2: 1,
      3: 2,
      4: 2,
      5: 2,
      6: 2,
      8: 2,
      9: 2,
      10: 2,
      11: 2,
      12: 1,
    });

    const harborCounts = Object.values(board.harbors).reduce<Record<string, number>>((counts, harbor) => {
      counts[harbor.harborType] = (counts[harbor.harborType] ?? 0) + 1;
      return counts;
    }, {});

    expect(harborCounts).toMatchObject({
      generic_3_to_1: 4,
      wood_2_to_1: 1,
      brick_2_to_1: 1,
      sheep_2_to_1: 1,
      wheat_2_to_1: 1,
      ore_2_to_1: 1,
    });

    const robberHexes = Object.values(board.hexes).filter((hex) => hex.hasRobber);
    expect(robberHexes).toHaveLength(1);
    expect(robberHexes[0]?.hexId).toBe(board.robberHexId);
    expect(robberHexes[0]?.resourceType).toBe("desert");
  });

  it("keeps board topology and harbor access references internally consistent", () => {
    const board = generateBoard("seed-graph");

    for (const hex of Object.values(board.hexes)) {
      expect(hex.adjacentIntersectionIds).toHaveLength(6);
      expect(hex.adjacentEdgeIds).toHaveLength(6);

      for (const adjacentHexId of hex.adjacentHexIds) {
        expect(board.hexes[adjacentHexId]?.adjacentHexIds).toContain(hex.hexId);
      }

      for (const intersectionId of hex.adjacentIntersectionIds) {
        expect(board.intersections[intersectionId]?.adjacentHexIds).toContain(hex.hexId);
      }

      for (const edgeId of hex.adjacentEdgeIds) {
        expect(board.edges[edgeId]?.adjacentHexIds).toContain(hex.hexId);
      }
    }

    for (const intersection of Object.values(board.intersections)) {
      expect(intersection.adjacentHexIds.length).toBeGreaterThanOrEqual(1);
      expect(intersection.adjacentHexIds.length).toBeLessThanOrEqual(3);
      expect(intersection.adjacentEdgeIds.length).toBeGreaterThanOrEqual(2);
      expect(intersection.adjacentEdgeIds.length).toBeLessThanOrEqual(3);
      expect(intersection.adjacentIntersectionIds.length).toBe(intersection.adjacentEdgeIds.length);

      for (const adjacentIntersectionId of intersection.adjacentIntersectionIds) {
        expect(board.intersections[adjacentIntersectionId]?.adjacentIntersectionIds).toContain(intersection.intersectionId);
      }

      for (const edgeId of intersection.adjacentEdgeIds) {
        const edge = board.edges[edgeId];
        expect(edge).toBeDefined();
        expect(
          edge?.intersectionAId === intersection.intersectionId || edge?.intersectionBId === intersection.intersectionId,
        ).toBe(true);
      }
    }

    for (const edge of Object.values(board.edges)) {
      expect(board.intersections[edge.intersectionAId]).toBeDefined();
      expect(board.intersections[edge.intersectionBId]).toBeDefined();
      expect(edge.adjacentHexIds.length).toBeGreaterThanOrEqual(1);
      expect(edge.adjacentHexIds.length).toBeLessThanOrEqual(2);
    }

    const harborIntersectionIds = new Set<string>();
    for (const harbor of Object.values(board.harbors)) {
      expect(harbor.intersectionIds).toHaveLength(2);
      for (const intersectionId of harbor.intersectionIds) {
        harborIntersectionIds.add(intersectionId);
        expect(board.intersections[intersectionId]?.harborAccess).toBe(harbor.harborType);
      }
    }

    const intersectionsWithHarborAccess = Object.values(board.intersections)
      .filter((intersection) => intersection.harborAccess !== undefined)
      .map((intersection) => intersection.intersectionId);

    expect(intersectionsWithHarborAccess).toHaveLength(18);
    expect(new Set(intersectionsWithHarborAccess)).toEqual(harborIntersectionIds);
  });

  it("runs a full 4-player setup and distributes start resources from the second settlement", () => {
    const started = startMatch(createReadyRoom(4), context, "p1").match;
    let match = initializeMatchSetup(started);

    while (match.status === "match_setup") {
      const actor = match.setup?.currentPlayerId!;

      if (match.setup?.step === "setup_forward_settlement" || match.setup?.step === "setup_reverse_settlement") {
        const legalSettlements = getLegalInitialSettlementPlacements(match, actor);
        expect(legalSettlements.length).toBeGreaterThan(0);
        match = placeInitialSettlement(match, actor, legalSettlements[0]!);
      } else {
        const legalRoads = getLegalInitialRoadPlacements(match, actor);
        expect(legalRoads.length).toBeGreaterThan(0);
        match = placeInitialRoad(match, actor, legalRoads[0]!);
      }
    }

    expect(match.status).toBe("match_in_progress");
    expect(match.turn).toMatchObject({
      activePlayerId: "p1",
      phase: "pre_roll_devcard_window",
      turnNumber: 1,
    });
    expect(match.players?.every((player) => player.initialSettlementIntersectionIds.length === 2)).toBe(true);
    expect(match.players?.every((player) => player.initialRoadEdgeIds.length === 2)).toBe(true);

    for (const player of match.players ?? []) {
      const secondSettlementId = player.initialSettlementIntersectionIds[1]!;
      const expectedResources = match.board!.intersections[secondSettlementId]!.adjacentHexIds.filter((hexId) => {
        const hex = match.board!.hexes[hexId]!;
        return hex.resourceType !== "desert";
      }).length;

      expect(sumResourceCounts(player.resources)).toBe(expectedResources);
    }
  });

  it("runs a full 3-player setup through the same state machine", () => {
    const started = startMatch(createReadyRoom(3), context, "p1").match;
    let match = initializeMatchSetup(started);

    while (match.status === "match_setup") {
      const actor = match.setup?.currentPlayerId!;
      if (match.setup?.step === "setup_forward_settlement" || match.setup?.step === "setup_reverse_settlement") {
        match = placeInitialSettlement(match, actor, getLegalInitialSettlementPlacements(match, actor)[0]!);
      } else {
        match = placeInitialRoad(match, actor, getLegalInitialRoadPlacements(match, actor)[0]!);
      }
    }

    expect(match.status).toBe("match_in_progress");
    expect(match.players).toHaveLength(3);
  });

  it("rejects setup settlements that violate the distance rule", () => {
    const started = startMatch(createReadyRoom(4), context, "p1").match;
    let match = initializeMatchSetup(started);

    const actor = match.setup?.currentPlayerId!;
    const firstSettlement = getLegalInitialSettlementPlacements(match, actor)[0]!;
    match = placeInitialSettlement(match, actor, firstSettlement);

    const adjacentIntersection = match.board!.intersections[firstSettlement]!.adjacentIntersectionIds[0]!;

    expect(() =>
      placeInitialSettlement(
        {
          ...match,
          setup: {
            ...match.setup!,
            step: "setup_forward_settlement",
            currentPlayerId: "p2",
            currentIndex: 1,
            pendingSettlementIntersectionId: undefined,
          },
        },
        "p2",
        adjacentIntersection,
      ),
    ).toThrowError(SetupEngineError);
  });

  it("rejects setup roads that do not connect to the just-placed settlement", () => {
    const started = startMatch(createReadyRoom(4), context, "p1").match;
    let match = initializeMatchSetup(started);

    const actor = match.setup?.currentPlayerId!;
    const settlement = getLegalInitialSettlementPlacements(match, actor)[0]!;
    match = placeInitialSettlement(match, actor, settlement);

    const legalRoads = new Set(getLegalInitialRoadPlacements(match, actor));
    const illegalRoad = Object.keys(match.board!.edges).find((edgeId) => !legalRoads.has(edgeId));
    expect(illegalRoad).toBeDefined();

    expect(() => placeInitialRoad(match, actor, illegalRoad!)).toThrowError(SetupEngineError);
  });
});
