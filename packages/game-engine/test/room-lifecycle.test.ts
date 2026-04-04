import { describe, expect, it } from "vitest";

import {
  RoomLifecycleError,
  canStartMatch,
  createRoom,
  disconnectPlayer,
  expireDisconnectedPlayer,
  finishMatch,
  getStartMatchBlockers,
  joinRoom,
  leaveRoom,
  projectRoomView,
  reassignColor,
  reassignSeat,
  reattachPlayer,
  startMatch,
  toggleReady,
} from "../src/index.js";

const baseContext = {
  now: "2026-04-04T09:30:00.000Z",
  roomIdFactory: () => "room-1",
  roomCodeFactory: () => "ABCD12",
  matchIdFactory: () => "match-1",
  matchSeedFactory: () => "seed-1",
  disconnectGraceMs: 2 * 60 * 1000,
};

function buildReadyRoom() {
  let room = createRoom(baseContext, {
    host: {
      playerId: "p1",
      displayName: "Host",
      sessionId: "s1",
    },
  });

  room = joinRoom(room, baseContext, {
    player: {
      playerId: "p2",
      displayName: "P2",
      sessionId: "s2",
    },
  });
  room = joinRoom(room, baseContext, {
    player: {
      playerId: "p3",
      displayName: "P3",
      sessionId: "s3",
    },
  });

  room = toggleReady(room, baseContext, "p1", true);
  room = toggleReady(room, baseContext, "p2", true);
  room = toggleReady(room, baseContext, "p3", true);

  return room;
}

describe("room lifecycle", () => {
  it("creates a prematch room with the host in seat zero", () => {
    const room = createRoom(baseContext, {
      host: {
        playerId: "p1",
        displayName: "Host",
        sessionId: "s1",
      },
    });

    expect(room.status).toBe("room_open_prematch");
    expect(room.players).toHaveLength(1);
    expect(room.players[0]).toMatchObject({
      playerId: "p1",
      seatIndex: 0,
      color: "red",
      ready: false,
    });
  });

  it("auto-assigns seats and colors as players join", () => {
    const room = joinRoom(
      createRoom(baseContext, {
        host: {
          playerId: "p1",
          displayName: "Host",
          sessionId: "s1",
        },
      }),
      baseContext,
      {
        player: {
          playerId: "p2",
          displayName: "Blue",
          sessionId: "s2",
        },
      },
    );

    expect(room.players[1]).toMatchObject({
      playerId: "p2",
      seatIndex: 1,
      color: "blue",
    });
  });

  it("allows the host to make light seat and color corrections before start", () => {
    const hostRoom = createRoom(baseContext, {
      host: {
        playerId: "p1",
        displayName: "Host",
        sessionId: "s1",
      },
    });
    const withP2 = joinRoom(hostRoom, baseContext, {
      player: {
        playerId: "p2",
        displayName: "Blue",
        sessionId: "s2",
      },
    });

    const seated = reassignSeat(withP2, baseContext, {
      hostPlayerId: "p1",
      targetPlayerId: "p2",
      seatIndex: 3,
    });
    const recolored = reassignColor(seated, baseContext, {
      hostPlayerId: "p1",
      targetPlayerId: "p2",
      color: "orange",
    });

    expect(recolored.players[1]).toMatchObject({
      seatIndex: 3,
      color: "orange",
    });
  });

  it("requires all occupied seats to be ready before match start", () => {
    const room = buildReadyRoom();

    expect(canStartMatch(room)).toBe(true);
    expect(getStartMatchBlockers(room)).toEqual([]);
  });

  it("rejects match start before the room is fully ready", () => {
    const room = createRoom(baseContext, {
      host: {
        playerId: "p1",
        displayName: "Host",
        sessionId: "s1",
      },
    });

    expect(canStartMatch(room)).toBe(false);
    expect(getStartMatchBlockers(room)).toEqual(["MIN_PLAYERS", "UNREADY_PLAYERS"]);
  });

  it("starts a match with a separate match model and seat-ordered turn order", () => {
    const room = buildReadyRoom();
    const result = startMatch(room, baseContext, "p1");

    expect(result.room.status).toBe("room_match_starting");
    expect(result.room.currentMatchId).toBe("match-1");
    expect(result.match).toMatchObject({
      matchId: "match-1",
      roomId: room.roomId,
      status: "match_initializing",
      seed: "seed-1",
      playerOrder: ["p1", "p2", "p3"],
    });
  });

  it("keeps disconnect separate from leave and supports reattach within grace", () => {
    const room = buildReadyRoom();
    const disconnected = disconnectPlayer(room, baseContext, "p2");

    expect(disconnected.players[1]).toMatchObject({
      presence: "disconnected_grace",
      graceUntil: "2026-04-04T09:32:00.000Z",
    });

    const reattached = reattachPlayer(disconnected, { ...baseContext, now: "2026-04-04T09:31:00.000Z" }, "p2", "s2b");

    expect(reattached.players[1]).toMatchObject({
      sessionId: "s2b",
      presence: "connected",
    });
    expect(reattached.players[1]?.graceUntil).toBeUndefined();
  });

  it("frees prematch seats after grace expiry but does not reshape an in-progress match", () => {
    const room = buildReadyRoom();
    const disconnected = disconnectPlayer(room, baseContext, "p3");
    const expired = expireDisconnectedPlayer(disconnected, { ...baseContext, now: "2026-04-04T09:33:00.000Z" }, "p3");

    expect(expired.players).toHaveLength(2);
    expect(expired.players.some((player) => player.playerId === "p3")).toBe(false);

    const started = startMatch(buildReadyRoom(), baseContext, "p1").room;
    const matchDisconnected = disconnectPlayer(started, baseContext, "p3");
    const stillReserved = expireDisconnectedPlayer(
      matchDisconnected,
      { ...baseContext, now: "2026-04-04T09:33:00.000Z" },
      "p3",
    );

    expect(stillReserved.players.some((player) => player.playerId === "p3")).toBe(true);
    expect(stillReserved.players.find((player) => player.playerId === "p3")?.presence).toBe("disconnected_grace");
  });

  it("frees seats immediately on prematch leave and reassigns host", () => {
    let room = createRoom(baseContext, {
      host: {
        playerId: "p1",
        displayName: "Host",
        sessionId: "s1",
      },
    });

    room = joinRoom(room, baseContext, {
      player: {
        playerId: "p2",
        displayName: "P2",
        sessionId: "s2",
      },
    });

    const next = leaveRoom(room, baseContext, "p1");

    expect(next.players).toHaveLength(1);
    expect(next.hostPlayerId).toBe("p2");
    expect(next.players[0]?.playerId).toBe("p2");
  });

  it("marks explicit leave during an active match without removing the player", () => {
    const started = startMatch(buildReadyRoom(), baseContext, "p1").room;
    const left = leaveRoom(started, baseContext, "p2");

    expect(left.players).toHaveLength(3);
    expect(left.players.find((player) => player.playerId === "p2")).toMatchObject({
      presence: "explicitly_left",
      ready: false,
    });
  });

  it("resets ready states and retains room context when a match finishes", () => {
    const started = startMatch(buildReadyRoom(), baseContext, "p1").room;
    const postgame = finishMatch(started, { ...baseContext, now: "2026-04-04T10:00:00.000Z" }, {
      summary: {
        matchId: "match-1",
        finishedAt: "2026-04-04T10:00:00.000Z",
        winnerPlayerId: "p3",
        winningTotalPoints: 10,
        victoryCause: "score_threshold",
      },
    });

    expect(postgame.status).toBe("room_postgame");
    expect(postgame.currentMatchId).toBeUndefined();
    expect(postgame.lastCompletedMatchId).toBe("match-1");
    expect(postgame.players.every((player) => player.ready === false)).toBe(true);
  });

  it("builds room projections with start blockers and self context", () => {
    const room = buildReadyRoom();
    const view = projectRoomView(room, "p2");

    expect(view.selfPlayerId).toBe("p2");
    expect(view.canStartMatch).toBe(true);
    expect(view.seatStates[1]).toMatchObject({
      occupantPlayerId: "p2",
      color: "blue",
      ready: true,
      presence: "connected",
    });
  });

  it("rejects illegal operations with typed errors", () => {
    const room = createRoom(baseContext, {
      host: {
        playerId: "p1",
        displayName: "Host",
        sessionId: "s1",
      },
    });

    expect(() =>
      reattachPlayer(
        {
          ...room,
          players: [
            {
              ...room.players[0]!,
              presence: "explicitly_left",
            },
          ],
        },
        baseContext,
        "p1",
        "s1b",
      ),
    ).toThrowError(RoomLifecycleError);

    expect(() => startMatch(room, baseContext, "p2")).toThrowError(RoomLifecycleError);
  });
});
