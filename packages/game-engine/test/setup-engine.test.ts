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
      phase: "roll_pending",
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
