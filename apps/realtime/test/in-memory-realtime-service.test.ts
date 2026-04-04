import { describe, expect, it } from "vitest";

import { InMemoryRealtimeService } from "../src/in-memory-realtime-service.js";

function createClock(...timestamps: string[]) {
  const queue = [...timestamps];
  let last = timestamps[timestamps.length - 1] ?? "2026-04-04T09:30:00.000Z";

  return () => {
    const next = queue.shift();
    if (next) {
      last = next;
    }

    return last;
  };
}

describe("InMemoryRealtimeService", () => {
  it("creates a room and returns an attached session plus room snapshot", () => {
    const service = new InMemoryRealtimeService({
      nowFactory: createClock("2026-04-04T09:30:00.000Z"),
    });

    const result = service.createRoom({
      commandId: "cmd-1",
      sessionId: "s1",
      playerId: "p1",
      displayName: "Host",
    });

    expect(result.room.status).toBe("room_open_prematch");
    expect(result.dispatches.map((dispatch) => dispatch.message.type)).toEqual([
      "server.session_attached",
      "server.command_accepted",
      "server.room_snapshot",
    ]);
    expect(result.dispatches[2]?.message).toMatchObject({
      type: "server.room_snapshot",
      room: {
        selfPlayerId: "p1",
        canStartMatch: false,
        startBlockers: ["MIN_PLAYERS", "UNREADY_PLAYERS"],
      },
    });
  });

  it("broadcasts room updates as players join and toggle ready", () => {
    const service = new InMemoryRealtimeService({
      nowFactory: createClock(
        "2026-04-04T09:30:00.000Z",
        "2026-04-04T09:30:05.000Z",
        "2026-04-04T09:30:10.000Z",
        "2026-04-04T09:30:15.000Z",
        "2026-04-04T09:30:20.000Z",
      ),
    });

    const created = service.createRoom({
      commandId: "cmd-1",
      sessionId: "s1",
      playerId: "p1",
      displayName: "Host",
    });

    const joinedTwo = service.joinRoom({
      commandId: "cmd-2",
      sessionId: "s2",
      playerId: "p2",
      displayName: "P2",
      roomCode: created.room.roomCode,
    });

    const joinedThree = service.joinRoom({
      commandId: "cmd-3",
      sessionId: "s3",
      playerId: "p3",
      displayName: "P3",
      roomCode: created.room.roomCode,
    });

    const readyOne = service.toggleReady({ commandId: "cmd-4", sessionId: "s1", ready: true });
    const readyTwo = service.toggleReady({ commandId: "cmd-5", sessionId: "s2", ready: true });
    const readyThree = service.toggleReady({ commandId: "cmd-6", sessionId: "s3", ready: true });

    expect(joinedTwo.dispatches.some((dispatch) => dispatch.message.type === "server.room_updated")).toBe(true);
    expect(joinedThree.dispatches.some((dispatch) => dispatch.message.type === "server.room_updated")).toBe(true);
    expect(readyThree.room.version).toBeGreaterThan(readyTwo.room.version);
    expect(readyThree.dispatches.filter((dispatch) => dispatch.message.type === "server.room_updated")).toHaveLength(3);
    expect(readyThree.dispatches[1]?.message).toMatchObject({
      type: "server.room_updated",
      room: {
        canStartMatch: true,
        startBlockers: [],
      },
    });
    expect(readyOne.room.version).toBe(4);
  });

  it("starts a match with a room lifecycle transition and per-player match snapshots", () => {
    const service = new InMemoryRealtimeService({
      nowFactory: createClock(
        "2026-04-04T09:30:00.000Z",
        "2026-04-04T09:30:05.000Z",
        "2026-04-04T09:30:10.000Z",
        "2026-04-04T09:30:15.000Z",
        "2026-04-04T09:30:20.000Z",
        "2026-04-04T09:30:25.000Z",
        "2026-04-04T09:30:30.000Z",
      ),
    });

    const created = service.createRoom({
      commandId: "cmd-1",
      sessionId: "s1",
      playerId: "p1",
      displayName: "Host",
    });

    service.joinRoom({ commandId: "cmd-2", sessionId: "s2", playerId: "p2", displayName: "P2", roomCode: created.room.roomCode });
    service.joinRoom({ commandId: "cmd-3", sessionId: "s3", playerId: "p3", displayName: "P3", roomCode: created.room.roomCode });
    service.toggleReady({ commandId: "cmd-4", sessionId: "s1", ready: true });
    service.toggleReady({ commandId: "cmd-5", sessionId: "s2", ready: true });
    service.toggleReady({ commandId: "cmd-6", sessionId: "s3", ready: true });

    const started = service.startMatch({ commandId: "cmd-7", sessionId: "s1" });

    expect(started.room.status).toBe("room_match_starting");
    expect(started.match).toMatchObject({
      status: "match_initializing",
      playerOrder: ["p1", "p2", "p3"],
    });
    expect(started.dispatches.some((dispatch) => dispatch.message.type === "server.lifecycle_transition")).toBe(true);
    expect(started.dispatches.filter((dispatch) => dispatch.message.type === "server.match_snapshot")).toHaveLength(3);
  });

  it("keeps disconnect separate from leave and rebuilds the room snapshot on reattach", () => {
    const service = new InMemoryRealtimeService({
      nowFactory: createClock(
        "2026-04-04T09:30:00.000Z",
        "2026-04-04T09:30:05.000Z",
        "2026-04-04T09:30:10.000Z",
        "2026-04-04T09:30:15.000Z",
      ),
    });

    const created = service.createRoom({
      commandId: "cmd-1",
      sessionId: "s1",
      playerId: "p1",
      displayName: "Host",
    });
    service.joinRoom({ commandId: "cmd-2", sessionId: "s2", playerId: "p2", displayName: "P2", roomCode: created.room.roomCode });

    const disconnected = service.disconnectSession("s2");
    const reattached = service.reattachSession({ sessionId: "s2" });

    expect(disconnected.dispatches.some((dispatch) => dispatch.message.type === "server.presence_updated")).toBe(true);
    expect(reattached.dispatches[0]?.message).toMatchObject({
      type: "server.session_attached",
      resumeContext: "resume_room_only",
    });
    expect(reattached.dispatches.some((dispatch) => dispatch.message.type === "server.room_snapshot")).toBe(true);
  });

  it("removes a player from the room on prematch leave instead of treating it like disconnect", () => {
    const service = new InMemoryRealtimeService({
      nowFactory: createClock(
        "2026-04-04T09:30:00.000Z",
        "2026-04-04T09:30:05.000Z",
        "2026-04-04T09:30:10.000Z",
      ),
    });

    const created = service.createRoom({
      commandId: "cmd-1",
      sessionId: "s1",
      playerId: "p1",
      displayName: "Host",
    });
    service.joinRoom({ commandId: "cmd-2", sessionId: "s2", playerId: "p2", displayName: "P2", roomCode: created.room.roomCode });

    const left = service.leaveRoom({ commandId: "cmd-3", sessionId: "s2" });

    expect(left.room.players).toHaveLength(1);
    expect(left.room.players[0]?.playerId).toBe("p1");
    expect(left.dispatches.filter((dispatch) => dispatch.message.type === "server.room_updated")).toHaveLength(1);
  });
});
