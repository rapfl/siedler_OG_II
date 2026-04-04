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
      status: "match_setup",
      playerOrder: ["p1", "p2", "p3"],
    });
    expect(started.dispatches.some((dispatch) => dispatch.message.type === "server.lifecycle_transition")).toBe(true);
    expect(started.dispatches.filter((dispatch) => dispatch.message.type === "server.match_snapshot")).toHaveLength(3);
    const hostSnapshot = started.dispatches.find(
      (dispatch) => dispatch.sessionId === "s1" && dispatch.message.type === "server.match_snapshot",
    )?.message;
    expect(hostSnapshot?.type === "server.match_snapshot" ? hostSnapshot.playerView.requiredAction : undefined).toBe(
      "PLACE_INITIAL_SETTLEMENT",
    );
  });

  it("routes setup commands through realtime until the match reaches in progress", () => {
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

    let current = service.startMatch({ commandId: "cmd-7", sessionId: "s1" });
    let match = current.match!;

    while (match.status === "match_setup") {
      const actor = match.setup!.currentPlayerId;
      const sessionId = actor === "p1" ? "s1" : actor === "p2" ? "s2" : "s3";

      if (match.setup!.step === "setup_forward_settlement" || match.setup!.step === "setup_reverse_settlement") {
        const placement = current.dispatches
          .filter((dispatch) => dispatch.sessionId === sessionId && dispatch.message.type === "server.match_snapshot")
          .map((dispatch) => dispatch.message)
          .at(-1);

        const intersectionId = placement?.type === "server.match_snapshot" ? placement.playerView.legalSetupPlacements?.[0] : undefined;
        current = service.submitMatchCommand({
          commandId: `setup-${match.version}-settlement`,
          sessionId,
          matchId: match.matchId,
          commandType: "PLACE_INITIAL_SETTLEMENT",
          payload: {
            intersectionId,
          },
        });
      } else {
        const placement = current.dispatches
          .filter((dispatch) => dispatch.sessionId === sessionId && dispatch.message.type === "server.match_snapshot")
          .map((dispatch) => dispatch.message)
          .at(-1);

        const edgeId = placement?.type === "server.match_snapshot" ? placement.playerView.legalSetupPlacements?.[0] : undefined;
        current = service.submitMatchCommand({
          commandId: `setup-${match.version}-road`,
          sessionId,
          matchId: match.matchId,
          commandType: "PLACE_INITIAL_ROAD",
          payload: {
            edgeId,
          },
        });
      }

      match = current.match!;
    }

    expect(match.status).toBe("match_in_progress");
    expect(current.room.status).toBe("room_match_in_progress");
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

  it("projects match updates into room-in-progress and postgame room continuity", () => {
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

    const inProgress = service.applyMatchUpdate({
      ...started.match!,
      status: "match_in_progress",
      turn: {
        activePlayerId: "p1",
        phase: "pre_roll_devcard_window",
        turnNumber: 1,
      },
      version: 2,
    });

    expect(inProgress.room.status).toBe("room_match_in_progress");
    expect(inProgress.dispatches.some((dispatch) => dispatch.message.type === "server.match_snapshot")).toBe(true);

    const finished = service.applyMatchUpdate({
      ...inProgress.match!,
      status: "match_finished",
      winnerPlayerId: "p1",
      finishedAt: "2026-04-04T09:35:00.000Z",
      victoryCause: "score_threshold",
      version: 3,
    });

    expect(finished.room.status).toBe("room_postgame");
    expect(finished.room.currentMatchId).toBeUndefined();
    expect(finished.room.postgameSummary).toMatchObject({
      matchId: started.match!.matchId,
      winnerPlayerId: "p1",
    });
  });

  it("reattaches into resume_postgame after a finished match transitioned the room", () => {
    const service = new InMemoryRealtimeService({
      nowFactory: createClock(
        "2026-04-04T09:30:00.000Z",
        "2026-04-04T09:30:05.000Z",
        "2026-04-04T09:30:10.000Z",
        "2026-04-04T09:30:15.000Z",
        "2026-04-04T09:30:20.000Z",
        "2026-04-04T09:30:25.000Z",
        "2026-04-04T09:30:30.000Z",
        "2026-04-04T09:30:35.000Z",
        "2026-04-04T09:30:40.000Z",
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
    const inProgress = service.applyMatchUpdate({
      ...started.match!,
      status: "match_in_progress",
      turn: {
        activePlayerId: "p1",
        phase: "pre_roll_devcard_window",
        turnNumber: 1,
      },
      version: 2,
    });
    service.applyMatchUpdate({
      ...inProgress.match!,
      status: "match_finished",
      winnerPlayerId: "p1",
      finishedAt: "2026-04-04T09:35:00.000Z",
      victoryCause: "score_threshold",
      version: 3,
    });

    service.disconnectSession("s2");
    const reattached = service.reattachSession({ sessionId: "s2" });

    expect(reattached.dispatches[0]?.message).toMatchObject({
      type: "server.session_attached",
      resumeContext: "resume_postgame",
    });
  });

  it("submits match commands through the realtime service and returns accepted plus snapshots", () => {
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
    const inProgress = service.applyMatchUpdate({
      ...started.match!,
      status: "match_in_progress",
      turn: {
        activePlayerId: "p1",
        phase: "roll_pending",
        turnNumber: 1,
      },
      players: [
        {
          playerId: "p1",
          resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
          initialSettlementIntersectionIds: [],
          initialRoadEdgeIds: [],
          developmentCards: { knight: 0, victory_point: 0, year_of_plenty: 0, monopoly: 0, road_building: 0 },
        },
        {
          playerId: "p2",
          resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
          initialSettlementIntersectionIds: [],
          initialRoadEdgeIds: [],
          developmentCards: { knight: 0, victory_point: 0, year_of_plenty: 0, monopoly: 0, road_building: 0 },
        },
        {
          playerId: "p3",
          resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
          initialSettlementIntersectionIds: [],
          initialRoadEdgeIds: [],
          developmentCards: { knight: 0, victory_point: 0, year_of_plenty: 0, monopoly: 0, road_building: 0 },
        },
      ],
      board: {
        hexOrder: [],
        hexes: {},
        intersections: {},
        edges: {},
        harbors: {},
        robberHexId: "",
      },
      version: 2,
    });

    const rolled = service.submitMatchCommand({
      commandId: "cmd-8",
      sessionId: "s1",
      matchId: inProgress.match!.matchId,
      commandType: "ROLL_DICE",
      payload: {},
    });

    expect(rolled.dispatches[0]?.message).toMatchObject({
      type: "server.command_accepted",
      commandId: "cmd-8",
    });
    expect(rolled.dispatches.some((dispatch) => dispatch.message.type === "server.match_snapshot")).toBe(true);
  });

  it("returns command_rejected when a realtime match command is illegal", () => {
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
    const inProgress = service.applyMatchUpdate({
      ...started.match!,
      status: "match_in_progress",
      turn: {
        activePlayerId: "p2",
        phase: "action_phase",
        turnNumber: 1,
      },
      players: [
        {
          playerId: "p1",
          resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
          initialSettlementIntersectionIds: [],
          initialRoadEdgeIds: [],
          developmentCards: { knight: 0, victory_point: 0, year_of_plenty: 0, monopoly: 0, road_building: 0 },
        },
        {
          playerId: "p2",
          resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
          initialSettlementIntersectionIds: [],
          initialRoadEdgeIds: [],
          developmentCards: { knight: 0, victory_point: 0, year_of_plenty: 0, monopoly: 0, road_building: 0 },
        },
        {
          playerId: "p3",
          resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
          initialSettlementIntersectionIds: [],
          initialRoadEdgeIds: [],
          developmentCards: { knight: 0, victory_point: 0, year_of_plenty: 0, monopoly: 0, road_building: 0 },
        },
      ],
      board: {
        hexOrder: [],
        hexes: {},
        intersections: {},
        edges: {},
        harbors: {},
        robberHexId: "",
      },
      version: 2,
    });

    const rejected = service.submitMatchCommand({
      commandId: "cmd-8",
      sessionId: "s1",
      matchId: inProgress.match!.matchId,
      commandType: "END_TURN",
      payload: {},
    });

    expect(rejected.dispatches[0]?.message).toMatchObject({
      type: "server.command_rejected",
      commandId: "cmd-8",
    });
  });

  it("replays the known result for duplicate match commands without mutating twice", () => {
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
    const inProgress = service.applyMatchUpdate({
      ...started.match!,
      status: "match_in_progress",
      turn: {
        activePlayerId: "p1",
        phase: "roll_pending",
        turnNumber: 1,
      },
      players: [
        {
          playerId: "p1",
          resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
          initialSettlementIntersectionIds: [],
          initialRoadEdgeIds: [],
          developmentCards: { knight: 0, victory_point: 0, year_of_plenty: 0, monopoly: 0, road_building: 0 },
        },
        {
          playerId: "p2",
          resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
          initialSettlementIntersectionIds: [],
          initialRoadEdgeIds: [],
          developmentCards: { knight: 0, victory_point: 0, year_of_plenty: 0, monopoly: 0, road_building: 0 },
        },
        {
          playerId: "p3",
          resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
          initialSettlementIntersectionIds: [],
          initialRoadEdgeIds: [],
          developmentCards: { knight: 0, victory_point: 0, year_of_plenty: 0, monopoly: 0, road_building: 0 },
        },
      ],
      board: {
        hexOrder: [],
        hexes: {},
        intersections: {},
        edges: {},
        harbors: {},
        robberHexId: "",
      },
      version: 2,
    });

    const first = service.submitMatchCommand({
      commandId: "cmd-8",
      sessionId: "s1",
      matchId: inProgress.match!.matchId,
      commandType: "ROLL_DICE",
      clientStateVersion: 2,
      payload: {},
    });
    const duplicate = service.submitMatchCommand({
      commandId: "cmd-8",
      sessionId: "s1",
      matchId: inProgress.match!.matchId,
      commandType: "ROLL_DICE",
      clientStateVersion: 2,
      payload: {},
    });

    expect(first.match?.version).toBe(3);
    expect(duplicate.match?.version).toBe(3);
    expect(duplicate.dispatches).toEqual(first.dispatches);
    expect(service.getRoom(created.room.roomId)?.currentMatchId).toBe(inProgress.match!.matchId);
  });

  it("rejects stale clientStateVersion with the current match version", () => {
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

    const rejected = service.submitMatchCommand({
      commandId: "cmd-8",
      sessionId: "s1",
      matchId: started.match!.matchId,
      commandType: "PLACE_INITIAL_SETTLEMENT",
      clientStateVersion: started.match!.version - 1,
      payload: {
        intersectionId: started.dispatches
          .find((dispatch) => dispatch.sessionId === "s1" && dispatch.message.type === "server.match_snapshot")
          ?.message.type === "server.match_snapshot"
          ? started.dispatches
              .find((dispatch) => dispatch.sessionId === "s1" && dispatch.message.type === "server.match_snapshot")
              ?.message.playerView.legalSetupPlacements?.[0]
          : undefined,
      },
    });

    expect(rejected.dispatches[0]?.message).toMatchObject({
      type: "server.command_rejected",
      commandId: "cmd-8",
      reasonCode: "stale_state",
      currentRelevantVersion: started.match!.version,
    });
  });

  it("rejects commands when the requested match does not belong to the caller room", () => {
    const service = new InMemoryRealtimeService({
      nowFactory: createClock(
        "2026-04-04T09:30:00.000Z",
        "2026-04-04T09:30:05.000Z",
        "2026-04-04T09:30:10.000Z",
        "2026-04-04T09:30:15.000Z",
        "2026-04-04T09:30:20.000Z",
        "2026-04-04T09:30:25.000Z",
        "2026-04-04T09:30:30.000Z",
        "2026-04-04T09:30:35.000Z",
        "2026-04-04T09:30:40.000Z",
        "2026-04-04T09:30:45.000Z",
        "2026-04-04T09:30:50.000Z",
        "2026-04-04T09:30:55.000Z",
      ),
    });

    const roomOne = service.createRoom({
      commandId: "cmd-1",
      sessionId: "s1",
      playerId: "p1",
      displayName: "Host-1",
    });
    service.joinRoom({ commandId: "cmd-2", sessionId: "s2", playerId: "p2", displayName: "P2", roomCode: roomOne.room.roomCode });
    service.joinRoom({ commandId: "cmd-3", sessionId: "s3", playerId: "p3", displayName: "P3", roomCode: roomOne.room.roomCode });
    service.toggleReady({ commandId: "cmd-4", sessionId: "s1", ready: true });
    service.toggleReady({ commandId: "cmd-5", sessionId: "s2", ready: true });
    service.toggleReady({ commandId: "cmd-6", sessionId: "s3", ready: true });
    const startedOne = service.startMatch({ commandId: "cmd-7", sessionId: "s1" });

    const roomTwo = service.createRoom({
      commandId: "cmd-9",
      sessionId: "s9",
      playerId: "p9",
      displayName: "Host-2",
    });

    const rejected = service.submitMatchCommand({
      commandId: "cmd-10",
      sessionId: "s9",
      matchId: startedOne.match!.matchId,
      commandType: "PLACE_INITIAL_SETTLEMENT",
      payload: {},
    });

    expect(roomTwo.room.roomId).not.toBe(roomOne.room.roomId);
    expect(rejected.dispatches[0]?.message).toMatchObject({
      type: "server.command_rejected",
      commandId: "cmd-10",
      reasonCode: "match_not_in_room",
    });
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
