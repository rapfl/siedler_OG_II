import { describe, expect, it } from "vitest";

import {
  createRoom,
  getLegalInitialRoadPlacements,
  getLegalInitialSettlementPlacements,
  initializeMatchSetup,
  joinRoom,
  placeInitialRoad,
  placeInitialSettlement,
  projectMatchView,
  projectRoomView,
  startMatch,
  toggleReady,
} from "@siedler/game-engine";

import type { MatchSnapshotState } from "../lib/realtime/local-client";
import { createMatchScreenModel } from "../lib/ui/match-screen-model";

const context = {
  now: "2026-04-04T09:30:00.000Z",
  roomIdFactory: () => "room-web-model",
  roomCodeFactory: () => "WEB001",
  matchIdFactory: () => "match-web-model",
  matchSeedFactory: () => "seed-web-model",
};

function createReadyRoom() {
  let room = createRoom(context, {
    host: {
      playerId: "p1",
      displayName: "Host",
      sessionId: "s1",
    },
    maxPlayers: 3,
  });

  room = joinRoom(room, context, {
    player: {
      playerId: "p2",
      displayName: "Guest 2",
      sessionId: "s2",
    },
  });
  room = joinRoom(room, context, {
    player: {
      playerId: "p3",
      displayName: "Guest 3",
      sessionId: "s3",
    },
  });

  for (const player of room.players) {
    room = toggleReady(room, context, player.playerId, true);
  }

  return room;
}

function createStartedTurnMatch() {
  const room = createReadyRoom();
  let match = initializeMatchSetup(startMatch(room, context, "p1").match);

  while (match.status === "match_setup") {
    const actor = match.setup?.currentPlayerId!;
    if (match.setup?.step === "setup_forward_settlement" || match.setup?.step === "setup_reverse_settlement") {
      match = placeInitialSettlement(match, actor, getLegalInitialSettlementPlacements(match, actor)[0]!);
      continue;
    }

    match = placeInitialRoad(match, actor, getLegalInitialRoadPlacements(match, actor)[0]!);
  }

  return {
    room,
    match,
  };
}

describe("match screen model", () => {
  it("surfaces the current setup actor and marks exactly one player active during setup", () => {
    const room = createReadyRoom();
    const setupMatch = initializeMatchSetup(startMatch(room, context, "p1").match);
    const snapshot: MatchSnapshotState = {
      room: projectRoomView(room, "p2"),
      match: projectMatchView(setupMatch, "p2"),
      roomCode: room.roomCode,
      eventLog: [],
      ...(setupMatch.board ? { board: setupMatch.board } : {}),
    };

    const model = createMatchScreenModel(snapshot, setupMatch.matchId, undefined);

    expect(model?.currentActorId).toBe("p1");
    expect(model?.currentActorDisplayName).toBe("Host");
    expect(model?.players.filter((player) => player.isActive)).toHaveLength(1);
    expect(model?.players.find((player) => player.playerId === "p1")?.isActive).toBe(true);
    expect(model?.primaryAction).toContain("Host");
    expect(model?.primaryAction).not.toContain("Setup laeuft");
  });

  it("keeps the core turn loop readable on the active player's first turn", () => {
    const { room, match: startedMatch } = createStartedTurnMatch();
    const snapshot: MatchSnapshotState = {
      room: projectRoomView(room, "p1"),
      match: projectMatchView(startedMatch, "p1"),
      roomCode: room.roomCode,
      eventLog: [],
      ...(startedMatch.board ? { board: startedMatch.board } : {}),
    };

    const model = createMatchScreenModel(snapshot, startedMatch.matchId, undefined);

    expect(model?.currentActorId).toBe("p1");
    expect(model?.currentActorIsSelf).toBe(true);
    expect(model?.phaseLabel).toBe("Vor dem Wurf");
    expect(model?.primaryAction).toBe("Du bist am Zug");
    expect(model?.primaryDescription).toContain("Brett");
  });
});
