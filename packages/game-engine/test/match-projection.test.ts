import { describe, expect, it } from "vitest";

import {
  createRoom,
  getLegalInitialRoadPlacements,
  getLegalInitialSettlementPlacements,
  initializeMatchSetup,
  joinRoom,
  moveRobber,
  offerTrade,
  placeInitialRoad,
  placeInitialSettlement,
  playKnight,
  projectMatchView,
  respondTrade,
  startMatch,
  toggleReady,
} from "../src/index.js";
import type { DevelopmentCardType, MatchState, ResourceCounts } from "../../shared-types/src/index.js";

const context = {
  now: "2026-04-04T09:30:00.000Z",
  roomIdFactory: () => "room-projection",
  roomCodeFactory: () => "PROJ01",
  matchIdFactory: () => "match-projection",
  matchSeedFactory: () => "seed-projection",
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

describe("match projection", () => {
  it("projects required setup placement actions only to the current setup actor", () => {
    const started = startMatch(createReadyRoom(4), context, "p1").match;
    const match = initializeMatchSetup(started);

    expect(projectMatchView(match, "p1")).toMatchObject({
      allowedActions: ["PLACE_INITIAL_SETTLEMENT"],
      requiredAction: "PLACE_INITIAL_SETTLEMENT",
    });
    expect(projectMatchView(match, "p2")).toMatchObject({
      allowedActions: [],
      requiredAction: undefined,
    });
  });

  it("projects roll as required in roll_pending and optional dev cards in pre-roll", () => {
    const base = withDevelopmentCards(completeSetup(4), "p1", { knight: 1 });
    const preRoll = {
      ...base,
      turn: {
        ...base.turn!,
        activePlayerId: "p1",
        phase: "pre_roll_devcard_window",
        hasPlayedDevCardThisTurn: false,
      },
    };
    const rollPending = {
      ...preRoll,
      turn: {
        ...preRoll.turn,
        phase: "roll_pending",
      },
    };

    expect(projectMatchView(preRoll, "p1")).toMatchObject({
      requiredAction: undefined,
    });
    expect(projectMatchView(preRoll, "p1").allowedActions).toEqual(
      expect.arrayContaining(["ROLL_DICE", "PLAY_DEV_CARD_KNIGHT"]),
    );
    expect(projectMatchView(rollPending, "p1")).toMatchObject({
      allowedActions: ["ROLL_DICE"],
      requiredAction: "ROLL_DICE",
    });
  });

  it("projects forced discard and robber actions to the affected player only", () => {
    const discardPending = {
      ...withResources(completeSetup(4), "p2", {
        wood: 3,
        brick: 2,
        sheep: 1,
        wheat: 1,
        ore: 1,
      }),
      turn: {
        activePlayerId: "p1",
        phase: "discard_pending",
        turnNumber: 1,
        discardPlayerIds: ["p2"],
        discardResolvedPlayerIds: [],
      },
    };

    expect(projectMatchView(discardPending, "p2")).toMatchObject({
      allowedActions: ["DISCARD_RESOURCES"],
      requiredAction: "DISCARD_RESOURCES",
      requiredDiscardCount: 4,
    });
    expect(projectMatchView(discardPending, "p1")).toMatchObject({
      allowedActions: [],
      requiredAction: undefined,
    });

    const withKnight = withDevelopmentCards(completeSetup(4), "p1", { knight: 1 });
    const playedKnight = playKnight(
      {
        ...withKnight,
        turn: {
          ...withKnight.turn!,
          activePlayerId: "p1",
          phase: "pre_roll_devcard_window",
          hasPlayedDevCardThisTurn: false,
        },
      },
      "p1",
      { now: "2026-04-04T10:00:00.000Z" },
    );
    const robberTargetHexId = findRobberTargetForVictim(playedKnight, "p1", "p2");
    const movedRobber = moveRobber(playedKnight, "p1", robberTargetHexId);

    expect(projectMatchView(playedKnight, "p1")).toMatchObject({
      allowedActions: ["MOVE_ROBBER"],
      requiredAction: "MOVE_ROBBER",
    });
    expect(projectMatchView(movedRobber, "p1")).toMatchObject({
      allowedActions: ["STEAL_RESOURCE"],
      requiredAction: "STEAL_RESOURCE",
      stealablePlayerIds: movedRobber.turn?.stealablePlayerIds,
    });
  });

  it("projects trade response as required for non-active players and confirm/cancel for the active player", () => {
    const offered = offerTrade(
      toActionPhase(
        withResources(
          withResources(completeSetup(4), "p1", { wood: 1 }),
          "p2",
          { brick: 1 },
        ),
      ),
      "p1",
      {
        offeredResources: { wood: 1 },
        requestedResources: { brick: 1 },
      },
    );
    const accepted = respondTrade(offered, "p2", offered.turn!.tradeOffer!.tradeId, "accept");

    expect(projectMatchView(offered, "p2")).toMatchObject({
      allowedActions: ["RESPOND_TRADE"],
      requiredAction: "RESPOND_TRADE",
    });

    expect(projectMatchView(accepted, "p1").allowedActions).toEqual(
      expect.arrayContaining(["CONFIRM_TRADE", "CANCEL_TRADE", "END_TURN"]),
    );
    expect(projectMatchView(accepted, "p1").requiredAction).toBeUndefined();
  });
});
