import { describe, expect, it, vi } from "vitest";

import { ensurePlayableSandboxMatch } from "../lib/realtime/demo-bootstrap";
import type { MatchSnapshotState } from "../lib/realtime/local-client";
import type { MatchView, RoomView } from "@siedler/shared-types";

function createRoomSnapshot(ready: boolean, playerCount: number, canStartMatch: boolean): MatchSnapshotState {
  return {
    eventLog: [],
    room: {
      roomId: "room-1",
      roomCode: "ABCD12",
      invitePath: "/room/ABCD12",
      roomStatus: "room_open_prematch",
      roomVersion: 1,
      maxPlayers: 4,
      hostPlayerId: "p1",
      selfPlayerId: "p1",
      canStartMatch,
      startBlockers: [],
      playerSummaries: Array.from({ length: playerCount }, (_, index) => ({
        playerId: `p${index + 1}`,
        displayName: `P${index + 1}`,
        ready: index === 0 ? ready : true,
        presence: "online",
        color: index === 0 ? "red" : index === 1 ? "blue" : index === 2 ? "white" : "orange",
        isHost: index === 0,
      })),
      seatStates: [],
    } as unknown as RoomView,
  };
}

function createMatchSnapshot(matchId: string): MatchSnapshotState {
  return {
    eventLog: [],
    match: {
      matchId,
    } as unknown as MatchView,
  };
}

describe("ensurePlayableSandboxMatch", () => {
  it("reuses an existing match snapshot without mutating room state", async () => {
    const snapshot = createMatchSnapshot("match-live");

    const client = {
      createRoom: vi.fn(),
      fillRoomWithMockPlayers: vi.fn(),
      toggleReady: vi.fn(),
      startMatch: vi.fn(),
      reattachSession: vi.fn(),
      supportsSandboxTools: vi.fn(() => true),
      getSnapshot: vi.fn(() => snapshot),
    };

    const result = await ensurePlayableSandboxMatch(client, snapshot, {
      sessionId: "s1",
      playerId: "p1",
      displayName: "Sir Alistair",
      matchId: "match-live",
    });

    expect(result.matchId).toBe("match-live");
    expect(client.createRoom).not.toHaveBeenCalled();
    expect(client.startMatch).not.toHaveBeenCalled();
  });

  it("creates, fills, readies, and starts a fresh sandbox room", async () => {
    const createdRoom = createRoomSnapshot(false, 1, false);
    const filledRoom = createRoomSnapshot(false, 4, true);
    const readiedRoom = createRoomSnapshot(true, 4, true);
    const startedMatch = {
      ...readiedRoom,
      match: {
        matchId: "match-setup",
      } as unknown as MatchView,
    };

    const client = {
      createRoom: vi.fn(async () => createdRoom),
      fillRoomWithMockPlayers: vi.fn(async () => filledRoom),
      toggleReady: vi.fn(async () => readiedRoom),
      startMatch: vi.fn(async () => startedMatch),
      reattachSession: vi.fn(async () => startedMatch),
      supportsSandboxTools: vi.fn(() => true),
      getSnapshot: vi.fn(() => createdRoom),
    };

    const result = await ensurePlayableSandboxMatch(client, { eventLog: [] }, undefined);

    expect(client.createRoom).toHaveBeenCalledWith({
      displayName: "Sir Alistair",
      maxPlayers: 4,
    });
    expect(client.fillRoomWithMockPlayers).toHaveBeenCalledWith(4);
    expect(client.toggleReady).toHaveBeenCalledWith(true);
    expect(client.startMatch).toHaveBeenCalled();
    expect(result.matchId).toBe("match-setup");
  });

  it("reattaches an existing session before creating a new room", async () => {
    const reattached = createMatchSnapshot("match-reattached");

    const client = {
      createRoom: vi.fn(),
      fillRoomWithMockPlayers: vi.fn(),
      toggleReady: vi.fn(),
      startMatch: vi.fn(),
      reattachSession: vi.fn(async () => reattached),
      supportsSandboxTools: vi.fn(() => true),
      getSnapshot: vi.fn(() => reattached),
    };

    const result = await ensurePlayableSandboxMatch(client, { eventLog: [] }, {
      sessionId: "s1",
      playerId: "p1",
      displayName: "Sir Alistair",
      matchId: "match-reattached",
    });

    expect(client.reattachSession).toHaveBeenCalled();
    expect(client.createRoom).not.toHaveBeenCalled();
    expect(result.matchId).toBe("match-reattached");
  });

  it("does not refill a room that already has the target sandbox seats on a later bootstrap pass", async () => {
    const filledRoom = createRoomSnapshot(false, 4, true);
    const startedMatch = {
      ...filledRoom,
      match: {
        matchId: "match-later-pass",
      } as unknown as MatchView,
    };

    const client = {
      createRoom: vi.fn(),
      fillRoomWithMockPlayers: vi.fn(),
      toggleReady: vi.fn(async () => filledRoom),
      startMatch: vi.fn(async () => startedMatch),
      reattachSession: vi.fn(async () => startedMatch),
      supportsSandboxTools: vi.fn(() => true),
      getSnapshot: vi.fn(() => filledRoom),
    };

    const result = await ensurePlayableSandboxMatch(client, filledRoom, {
      sessionId: "s1",
      playerId: "p1",
      displayName: "Sir Alistair",
    });

    expect(client.fillRoomWithMockPlayers).not.toHaveBeenCalled();
    expect(result.matchId).toBe("match-later-pass");
  });
});
