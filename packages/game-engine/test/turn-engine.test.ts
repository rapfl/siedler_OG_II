import { describe, expect, it } from "vitest";

import {
  MatchEngineError,
  buildRoad,
  buildSettlement,
  buyDevelopmentCard,
  cancelTrade,
  confirmTrade,
  calculateLargestArmy,
  calculateHiddenPoints,
  calculateVisiblePoints,
  createRoom,
  discardResources,
  endTurn,
  getLegalInitialRoadPlacements,
  getLegalInitialSettlementPlacements,
  initializeMatchSetup,
  joinRoom,
  moveRobber,
  offerTrade,
  pickMonopolyResourceType,
  pickYearOfPlentyResource,
  placeInitialRoad,
  placeInitialSettlement,
  playKnight,
  playMonopoly,
  playRoadBuilding,
  playYearOfPlenty,
  respondTrade,
  rollDice,
  stealResource,
  startMatch,
  tradeWithBank,
  toggleReady,
  upgradeCity,
} from "../src/index.js";
import type { DevelopmentCardType, MatchState, ResourceCounts } from "../../shared-types/src/index.js";

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

function withDevelopmentCards(match: MatchState, playerId: string, developmentCards: Partial<Record<DevelopmentCardType, number>>): MatchState {
  return {
    ...match,
    players: match.players?.map((player) =>
      player.playerId === playerId
        ? {
            ...player,
            developmentCards: {
              ...player.developmentCards,
              ...developmentCards,
            },
          }
        : player,
    ),
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

function findIllegalSettlementTarget(match: MatchState, playerId: string): string {
  for (const intersectionId of Object.keys(match.board!.intersections)) {
    try {
      buildSettlement(
        withResources(match, playerId, { wood: 10, brick: 10, sheep: 10, wheat: 10 }),
        playerId,
        intersectionId,
        { now: context.now },
      );
    } catch {
      return intersectionId;
    }
  }

  throw new Error(`No illegal settlement target found for ${playerId}`);
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
      phase: "pre_roll_devcard_window",
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

  it("builds a connected road, spends the correct cost, and rejects disconnected edges", () => {
    const primed = toActionPhase(
      withResources(completeSetup(4), "p1", {
        wood: 4,
        brick: 4,
      }),
      "p1",
    );

    const legalEdgeId = findLegalRoadTarget(primed, "p1");
    const illegalEdgeId = findIllegalRoadTarget(primed, "p1");
    const woodBefore = primed.players?.find((player) => player.playerId === "p1")?.resources.wood ?? 0;
    const brickBefore = primed.players?.find((player) => player.playerId === "p1")?.resources.brick ?? 0;

    expect(() => buildRoad(primed, "p1", illegalEdgeId, { now: context.now })).toThrowError(MatchEngineError);

    const built = buildRoad(primed, "p1", legalEdgeId, { now: context.now });

    expect(built.board?.edges[legalEdgeId]?.road?.ownerPlayerId).toBe("p1");
    expect(built.players?.find((player) => player.playerId === "p1")?.resources.wood).toBe(woodBefore - 1);
    expect(built.players?.find((player) => player.playerId === "p1")?.resources.brick).toBe(brickBefore - 1);
  });

  it("builds a legal settlement, spends the correct cost, and enforces road connection", () => {
    let primed = toActionPhase(
      withResources(completeSetup(4), "p1", {
        wood: 10,
        brick: 10,
        sheep: 4,
        wheat: 4,
      }),
      "p1",
    );

    let legalIntersectionId = tryFindLegalSettlementTarget(primed, "p1");
    let roadsBuilt = 0;
    while (!legalIntersectionId && roadsBuilt < 8) {
      primed = buildRoad(primed, "p1", findLegalRoadTarget(primed, "p1"), {
        now: `2026-04-04T10:${roadsBuilt.toString().padStart(2, "0")}:00.000Z`,
      });
      legalIntersectionId = tryFindLegalSettlementTarget(primed, "p1");
      roadsBuilt += 1;
    }

    expect(legalIntersectionId).toBeDefined();
    const illegalIntersectionId = findIllegalSettlementTarget(primed, "p1");
    const playerBefore = primed.players?.find((player) => player.playerId === "p1")!;

    expect(() => buildSettlement(primed, "p1", illegalIntersectionId, { now: context.now })).toThrowError(MatchEngineError);

    const built = buildSettlement(primed, "p1", legalIntersectionId!, { now: context.now });

    expect(built.board?.intersections[legalIntersectionId!]?.building).toMatchObject({
      ownerPlayerId: "p1",
      buildingType: "settlement",
    });
    expect(built.players?.find((player) => player.playerId === "p1")?.resources).toMatchObject({
      wood: playerBefore.resources.wood - 1,
      brick: playerBefore.resources.brick - 1,
      sheep: playerBefore.resources.sheep - 1,
      wheat: playerBefore.resources.wheat - 1,
    });
  });

  it("plays knight before rolling, starts robber flow without discard, and returns to roll pending", () => {
    const match = withDevelopmentCards(
      withResources(completeSetup(4), "p2", {
        wood: 2,
      }),
      "p1",
      { knight: 1 },
    );

    const primed = {
      ...match,
      turn: {
        ...match.turn!,
        activePlayerId: "p1",
        phase: "pre_roll_devcard_window",
        hasPlayedDevCardThisTurn: false,
      },
    };

    const played = playKnight(primed, "p1", {
      now: "2026-04-04T10:00:00.000Z",
    });

    expect(played.turn).toMatchObject({
      phase: "robber_pending",
      pendingRobberReason: "played_knight",
      pendingRobberReturnPhase: "roll_pending",
      hasPlayedDevCardThisTurn: true,
      discardPlayerIds: undefined,
    });
    expect(played.players?.find((player) => player.playerId === "p1")?.playedKnightCount).toBe(1);

    const robberHexId = findRobberTargetForVictim(played, "p1", "p2");
    const moved = moveRobber(played, "p1", robberHexId);
    const resolved = stealResource(moved, "p1", "p2", {
      now: "2026-04-04T10:01:00.000Z",
      forcedResourceType: "wood",
    });

    expect(resolved.turn).toMatchObject({
      phase: "roll_pending",
      hasPlayedDevCardThisTurn: true,
      pendingRobberReason: undefined,
      pendingRobberReturnPhase: undefined,
    });
  });

  it("awards largest army at 3 played knights and transfers it only on a higher count", () => {
    const match = withDevelopmentCards(completeSetup(4), "p2", { knight: 1 });
    const withKnights = {
      ...match,
      players: match.players?.map((player) => {
        if (player.playerId === "p1") {
          return {
            ...player,
            playedKnightCount: 3,
          };
        }

        if (player.playerId === "p2") {
          return {
            ...player,
            playedKnightCount: 3,
          };
        }

        return player;
      }),
      largestArmyHolderPlayerId: "p1",
      largestArmySize: 3,
    };

    expect(calculateLargestArmy(withKnights)).toMatchObject({
      holderPlayerId: "p1",
      size: 3,
    });

    const transferred = playKnight(
      {
        ...withKnights,
        turn: {
          ...withKnights.turn!,
          activePlayerId: "p2",
          phase: "action_phase",
          hasPlayedDevCardThisTurn: false,
        },
      },
      "p2",
      {
        now: "2026-04-04T10:02:00.000Z",
      },
    );

    expect(transferred.players?.find((player) => player.playerId === "p2")?.playedKnightCount).toBe(4);
    expect(transferred.largestArmyHolderPlayerId).toBe("p2");
    expect(transferred.largestArmySize).toBe(4);
  });

  it("finishes the match when knight play awards largest army for the tenth visible point", () => {
    const match = withDevelopmentCards(completeSetup(4), "p1", { knight: 1 });
    const targetUpgradeId = match.players?.find((player) => player.playerId === "p1")?.initialSettlementIntersectionIds[0]!;
    const manualBoard = structuredClone(match.board!);
    const extraIntersectionIds = Object.keys(manualBoard.intersections)
      .filter((intersectionId) => !manualBoard.intersections[intersectionId]!.building)
      .slice(0, 3);

    manualBoard.intersections[targetUpgradeId] = {
      ...manualBoard.intersections[targetUpgradeId]!,
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

    const primed = {
      ...match,
      board: manualBoard,
      players: match.players?.map((player) =>
        player.playerId === "p1"
          ? {
              ...player,
              playedKnightCount: 2,
            }
          : player,
      ),
      turn: {
        ...match.turn!,
        activePlayerId: "p1",
        phase: "action_phase",
        hasPlayedDevCardThisTurn: false,
      },
    };

    expect(calculateVisiblePoints(primed).p1).toBe(8);

    const won = playKnight(primed, "p1", {
      now: "2026-04-04T10:03:00.000Z",
    });

    expect(won.status).toBe("match_finished");
    expect(won.winnerPlayerId).toBe("p1");
    expect(won.largestArmyHolderPlayerId).toBe("p1");
    expect(calculateVisiblePoints(won).p1).toBe(10);
  });

  it("buys a development card, deducts cost, and blocks playing a same-turn knight", () => {
    const match = {
      ...toActionPhase(
        withResources(completeSetup(4), "p1", {
          sheep: 3,
          wheat: 3,
          ore: 3,
        }),
      ),
      developmentDeck: ["knight", "victory_point"],
    };

    const bought = buyDevelopmentCard(match, "p1");

    expect(bought.players?.find((player) => player.playerId === "p1")?.resources).toMatchObject({
      sheep: 2,
      wheat: 2,
      ore: 2,
    });
    expect(bought.players?.find((player) => player.playerId === "p1")?.developmentCards).toMatchObject({
      knight: 1,
    });
    expect(bought.turn?.purchasedDevelopmentCardsThisTurn).toMatchObject({
      knight: 1,
    });
    expect(bought.developmentDeck).toEqual(["victory_point"]);

    expect(() =>
      playKnight(bought, "p1", {
        now: "2026-04-04T10:04:00.000Z",
      }),
    ).toThrowError(MatchEngineError);
  });

  it("resolves year of plenty over two picks and returns to action phase", () => {
    const match = withDevelopmentCards(toActionPhase(completeSetup(4)), "p1", {
      year_of_plenty: 1,
    });

    const played = playYearOfPlenty(match, "p1");
    expect(played.turn).toMatchObject({
      phase: "devcard_resolution",
      developmentCardResolution: "year_of_plenty_pick_1",
      hasPlayedDevCardThisTurn: true,
    });

    const pickedOne = pickYearOfPlentyResource(played, "p1", "ore");
    expect(pickedOne.turn).toMatchObject({
      phase: "devcard_resolution",
      developmentCardResolution: "year_of_plenty_pick_2",
      pendingYearOfPlentyResources: ["ore"],
    });

    const pickedTwo = pickYearOfPlentyResource(pickedOne, "p1", "wheat");
    expect(pickedTwo.turn).toMatchObject({
      phase: "action_phase",
      developmentCardResolution: undefined,
      pendingYearOfPlentyResources: undefined,
    });
    expect(pickedTwo.players?.find((player) => player.playerId === "p1")?.resources).toMatchObject({
      ore: 1,
      wheat: 1,
    });
  });

  it("resolves monopoly and collects the chosen resource from all opponents", () => {
    const match = withDevelopmentCards(
      withResources(
        withResources(completeSetup(4), "p2", { sheep: 2 }),
        "p3",
        { sheep: 1 },
      ),
      "p1",
      { monopoly: 1 },
    );

    const primed = toActionPhase(match);
    const p1SheepBefore = primed.players?.find((player) => player.playerId === "p1")?.resources.sheep ?? 0;
    const opponentSheepBefore = (primed.players ?? [])
      .filter((player) => player.playerId !== "p1")
      .reduce((sum, player) => sum + player.resources.sheep, 0);
    const played = playMonopoly(primed, "p1");
    const resolved = pickMonopolyResourceType(played, "p1", "sheep");

    expect(resolved.turn).toMatchObject({
      phase: "action_phase",
      developmentCardResolution: undefined,
    });
    expect(resolved.players?.find((player) => player.playerId === "p1")?.resources.sheep).toBe(
      p1SheepBefore + opponentSheepBefore,
    );
    expect(resolved.players?.find((player) => player.playerId === "p2")?.resources.sheep).toBe(0);
    expect(resolved.players?.find((player) => player.playerId === "p3")?.resources.sheep).toBe(0);
  });

  it("resolves road building over two placements and ends early when no second road remains", () => {
    const match = withDevelopmentCards(completeSetup(4), "p1", {
      road_building: 1,
    });

    const played = playRoadBuilding(toActionPhase(match), "p1");
    expect(played.turn).toMatchObject({
      phase: "devcard_resolution",
      developmentCardResolution: "road_building_place_1",
    });

    const firstEdgeId = findLegalRoadTarget(played, "p1");
    const builtOne = buildRoad(played, "p1", firstEdgeId, {
      now: "2026-04-04T10:04:30.000Z",
    });

    if (builtOne.turn?.phase === "devcard_resolution") {
      expect(builtOne.turn.developmentCardResolution).toBe("road_building_place_2");
      const secondEdgeId = findLegalRoadTarget(builtOne, "p1");
      const builtTwo = buildRoad(builtOne, "p1", secondEdgeId, {
        now: "2026-04-04T10:04:45.000Z",
      });
      expect(builtTwo.turn).toMatchObject({
        phase: "action_phase",
        developmentCardResolution: undefined,
      });
    } else {
      expect(builtOne.turn).toMatchObject({
        phase: "action_phase",
        developmentCardResolution: undefined,
      });
    }
  });

  it("offers a trade to all, records acceptance, and completes the atomic transfer on confirm", () => {
    const match = toActionPhase(
      withResources(
        withResources(completeSetup(4), "p1", { wood: 1 }),
        "p2",
        { brick: 1 },
      ),
    );

    const p1Before = match.players?.find((player) => player.playerId === "p1")?.resources!;
    const p2Before = match.players?.find((player) => player.playerId === "p2")?.resources!;

    const offered = offerTrade(match, "p1", {
      offeredResources: { wood: 1 },
      requestedResources: { brick: 1 },
    });
    expect(offered.turn?.tradeOffer?.offeredByPlayerId).toBe("p1");

    const accepted = respondTrade(offered, "p2", offered.turn!.tradeOffer!.tradeId, "accept");
    expect(accepted.turn?.tradeOffer?.responses.p2).toBe("accept");

    const completed = confirmTrade(accepted, "p1", accepted.turn!.tradeOffer!.tradeId, "p2");
    expect(completed.turn?.tradeOffer).toBeUndefined();
    expect(completed.players?.find((player) => player.playerId === "p1")?.resources.wood).toBe(p1Before.wood - 1);
    expect(completed.players?.find((player) => player.playerId === "p1")?.resources.brick).toBe(p1Before.brick + 1);
    expect(completed.players?.find((player) => player.playerId === "p2")?.resources.wood).toBe(p2Before.wood + 1);
    expect(completed.players?.find((player) => player.playerId === "p2")?.resources.brick).toBe(p2Before.brick - 1);
  });

  it("closes a trade automatically when all other players reject", () => {
    const match = toActionPhase(withResources(completeSetup(4), "p1", { wood: 1 }));
    const offered = offerTrade(match, "p1", {
      offeredResources: { wood: 1 },
      requestedResources: { brick: 1 },
    });

    const rejectedByP2 = respondTrade(offered, "p2", offered.turn!.tradeOffer!.tradeId, "reject");
    const rejectedByP3 = respondTrade(rejectedByP2, "p3", offered.turn!.tradeOffer!.tradeId, "reject");
    const rejectedByP4 = respondTrade(rejectedByP3, "p4", offered.turn!.tradeOffer!.tradeId, "reject");

    expect(rejectedByP4.turn?.tradeOffer).toBeUndefined();
  });

  it("allows the active player to cancel an open trade", () => {
    const match = toActionPhase(withResources(completeSetup(4), "p1", { wood: 1 }));
    const offered = offerTrade(match, "p1", {
      offeredResources: { wood: 1 },
      requestedResources: { brick: 1 },
    });

    const cancelled = cancelTrade(offered, "p1", offered.turn!.tradeOffer!.tradeId);
    expect(cancelled.turn?.tradeOffer).toBeUndefined();
  });

  it("fails trade confirmation if the active player spent the offered resources after opening the trade", () => {
    const match = toActionPhase(
      withResources(
        withResources(completeSetup(4), "p1", { wood: 1, brick: 1 }),
        "p2",
        { brick: 1 },
      ),
    );

    const offered = offerTrade(match, "p1", {
      offeredResources: { wood: 1 },
      requestedResources: { brick: 1 },
    });
    const accepted = respondTrade(offered, "p2", offered.turn!.tradeOffer!.tradeId, "accept");
    const spentWood = {
      ...accepted,
      players: accepted.players?.map((player) =>
        player.playerId === "p1"
          ? {
              ...player,
              resources: {
                ...player.resources,
                wood: 0,
              },
            }
          : player,
      ),
    };

    expect(() =>
      confirmTrade(spentWood, "p1", accepted.turn!.tradeOffer!.tradeId, "p2"),
    ).toThrowError(MatchEngineError);
  });

  it("supports bank and harbor trade ratios and rejects illegal ratios", () => {
    const match = completeSetup(4);
    const p1SettlementIds = match.players?.find((player) => player.playerId === "p1")?.initialSettlementIntersectionIds ?? [];
    const genericHarborIntersectionId = p1SettlementIds.find(
      (intersectionId) => match.board!.intersections[intersectionId]?.harborAccess === "generic_3_to_1",
    );
    const specificHarborIntersectionId = p1SettlementIds.find(
      (intersectionId) => match.board!.intersections[intersectionId]?.harborAccess === "wood_2_to_1",
    );

    const base = toActionPhase(withResources(match, "p1", { wood: 6, brick: 4, ore: 0 }));
    const bankTraded = tradeWithBank(base, "p1", {
      giveResources: { brick: 4 },
      receiveResources: { ore: 1 },
    });
    expect(bankTraded.players?.find((player) => player.playerId === "p1")?.resources).toMatchObject({
      brick: 0,
      ore: 1,
    });

    if (genericHarborIntersectionId) {
      const genericHarborMatch = toActionPhase(
        withResources(
          {
            ...match,
            board: {
              ...match.board!,
              intersections: {
                ...match.board!.intersections,
                [genericHarborIntersectionId]: {
                  ...match.board!.intersections[genericHarborIntersectionId]!,
                  building: {
                    ownerPlayerId: "p1",
                    buildingType: "settlement",
                  },
                },
              },
            },
          },
          "p1",
          { wood: 3, ore: 0 },
        ),
      );

      const traded = tradeWithBank(genericHarborMatch, "p1", {
        giveResources: { wood: 3 },
        receiveResources: { ore: 1 },
      });
      expect(traded.players?.find((player) => player.playerId === "p1")?.resources).toMatchObject({
        wood: 0,
        ore: 1,
      });
    }

    if (specificHarborIntersectionId) {
      const specificHarborMatch = toActionPhase(
        withResources(
          {
            ...match,
            board: {
              ...match.board!,
              intersections: {
                ...match.board!.intersections,
                [specificHarborIntersectionId]: {
                  ...match.board!.intersections[specificHarborIntersectionId]!,
                  building: {
                    ownerPlayerId: "p1",
                    buildingType: "settlement",
                  },
                },
              },
            },
          },
          "p1",
          { wood: 2, ore: 0 },
        ),
      );

      const traded = tradeWithBank(specificHarborMatch, "p1", {
        giveResources: { wood: 2 },
        receiveResources: { ore: 1 },
      });
      expect(traded.players?.find((player) => player.playerId === "p1")?.resources).toMatchObject({
        wood: 0,
        ore: 1,
      });
    }

    expect(() =>
      tradeWithBank(base, "p1", {
        giveResources: { wood: 3 },
        receiveResources: { ore: 1 },
      }),
    ).toThrowError(MatchEngineError);
  });

  it("counts victory point development cards as hidden points and total victory", () => {
    const match = completeSetup(4);
    const targetUpgradeId = match.players?.find((player) => player.playerId === "p1")?.initialSettlementIntersectionIds[0]!;
    const manualBoard = structuredClone(match.board!);
    const extraIntersectionIds = Object.keys(manualBoard.intersections)
      .filter((intersectionId) => !manualBoard.intersections[intersectionId]!.building)
      .slice(0, 3);

    manualBoard.intersections[targetUpgradeId] = {
      ...manualBoard.intersections[targetUpgradeId]!,
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

    const primed = withDevelopmentCards(
      {
        ...match,
        board: manualBoard,
        turn: {
          ...match.turn!,
          activePlayerId: "p4",
          phase: "action_phase",
        },
      },
      "p1",
      { victory_point: 2 },
    );

    expect(calculateVisiblePoints(primed).p1).toBe(8);
    expect(calculateHiddenPoints(primed).p1).toBe(2);

    const won = endTurn(primed, "p4", {
      now: "2026-04-04T10:05:00.000Z",
    });

    expect(won.status).toBe("match_finished");
    expect(won.winnerPlayerId).toBe("p1");
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
