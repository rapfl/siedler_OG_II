import { describe, expect, it } from "vitest";

import { deriveBrowserSessionFromState, getResumeHref, reduceAuthoritativeSessionState } from "../lib/realtime/session-state";
import type { BrowserSessionState } from "../lib/session/storage";

const browserSession: BrowserSessionState = {
  sessionId: "session-1",
  playerId: "player-1",
  displayName: "Host",
  roomCode: "ROOM1001",
  roomId: "room-1",
  matchId: "match-old",
};

describe("session state reducer", () => {
  it("clears stale match and board state when the server returns only a room snapshot", () => {
    const next = reduceAuthoritativeSessionState(
      {
        browserSession,
        roomCode: "ROOM1001",
        room: {
          roomId: "room-1",
          roomCode: "ROOM1001",
          invitePath: "/room/ROOM1001",
          roomStatus: "room_match_in_progress",
          roomVersion: 5,
          maxPlayers: 4,
          hostPlayerId: "player-1",
          selfPlayerId: "player-1",
          currentMatchId: "match-old",
          playerSummaries: [],
          seatStates: [],
          canStartMatch: false,
          startBlockers: ["ROOM_NOT_OPEN"],
        },
        match: {
          matchId: "match-old",
          matchStatus: "match_finished",
          matchVersion: 9,
          playerId: "player-1",
          playerOrder: ["player-1"],
          players: [],
        },
        board: {
          hexOrder: [],
          hexes: {},
          intersections: {},
          edges: {},
          harbors: {},
          robberHexId: "hex-0",
        },
      },
      {
        room: {
          roomId: "room-1",
          roomCode: "ROOM1001",
          invitePath: "/room/ROOM1001",
          roomStatus: "room_postgame",
          roomVersion: 6,
          maxPlayers: 4,
          hostPlayerId: "player-1",
          selfPlayerId: "player-1",
          playerSummaries: [],
          seatStates: [],
          canStartMatch: false,
          startBlockers: ["UNREADY_PLAYERS"],
          postgameSummary: {
            matchId: "match-old",
            finishedAt: "2026-04-04T12:00:00.000Z",
            winnerPlayerId: "player-1",
            winningTotalPoints: 10,
            victoryCause: "score_threshold",
          },
        },
        roomCode: "ROOM1001",
      },
    );

    expect(next.match).toBeUndefined();
    expect(next.board).toBeUndefined();

    expect(deriveBrowserSessionFromState(next)).toEqual({
      sessionId: "session-1",
      playerId: "player-1",
      displayName: "Host",
      roomCode: "ROOM1001",
      roomId: "room-1",
    });
  });

  it("routes resume to the room when no authoritative match snapshot exists", () => {
    expect(getResumeHref(browserSession)).toBe("/room/ROOM1001");
  });

  it("routes resume to the room for postgame even if a match snapshot was cached previously", () => {
    expect(
      getResumeHref(
        browserSession,
        {
          roomId: "room-1",
          roomCode: "ROOM1001",
          invitePath: "/room/ROOM1001",
          roomStatus: "room_postgame",
          roomVersion: 6,
          maxPlayers: 4,
          hostPlayerId: "player-1",
          selfPlayerId: "player-1",
          playerSummaries: [],
          seatStates: [],
          canStartMatch: false,
          startBlockers: [],
        },
        {
          matchId: "match-old",
          matchStatus: "match_finished",
          matchVersion: 9,
          playerId: "player-1",
          playerOrder: ["player-1"],
          players: [],
        },
      ),
    ).toBe("/room/ROOM1001");
  });
});
