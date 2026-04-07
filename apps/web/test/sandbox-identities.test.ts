import { describe, expect, it } from "vitest";

import { reconcileSandboxIdentities } from "../lib/realtime/sandbox-identities";
import type { RoomView } from "@siedler/shared-types";

function createRoom(playerIds: Array<{ playerId: string; displayName: string }>): RoomView {
  return {
    roomId: "room-1",
    roomCode: "ROOM1001",
    invitePath: "/room/ROOM1001",
    roomStatus: "room_open_prematch",
    roomVersion: 1,
    maxPlayers: 4,
    hostPlayerId: "p1",
    selfPlayerId: "p1",
    canStartMatch: false,
    startBlockers: [],
    playerSummaries: playerIds.map((player, index) => ({
      playerId: player.playerId,
      displayName: player.displayName,
      ready: true,
      presence: "online",
      color: index === 0 ? "red" : index === 1 ? "blue" : index === 2 ? "white" : "orange",
      isHost: index === 0,
    })),
    seatStates: [],
  } as unknown as RoomView;
}

describe("sandbox identity reconciliation", () => {
  it("drops stale identities that are no longer present in the active room", () => {
    const identities = [
      { sessionId: "s1", playerId: "p1", displayName: "Host" },
      { sessionId: "s2", playerId: "p2", displayName: "Guest 2" },
      { sessionId: "stale", playerId: "p9", displayName: "Guest 9" },
    ];

    const next = reconcileSandboxIdentities(identities, createRoom([{ playerId: "p1", displayName: "Host" }, { playerId: "p2", displayName: "Guest 2" }]), {
      sessionId: "s1",
      playerId: "p1",
      displayName: "Host",
    });

    expect(next).toHaveLength(2);
    expect(next.some((identity) => identity.playerId === "p9")).toBe(false);
  });

  it("coalesces duplicate logical players and prefers the current session", () => {
    const identities = [
      { sessionId: "old-session", playerId: "p2", displayName: "Guest 2" },
      { sessionId: "current-session", playerId: "p2", displayName: "Guest 2" },
      { sessionId: "host-session", playerId: "p1", displayName: "Host" },
    ];

    const next = reconcileSandboxIdentities(
      identities,
      createRoom([
        { playerId: "p1", displayName: "Host" },
        { playerId: "p2", displayName: "Guest 2" },
      ]),
      {
        sessionId: "current-session",
        playerId: "p2",
        displayName: "Guest 2",
      },
    );

    expect(next).toHaveLength(2);
    expect(next.find((identity) => identity.playerId === "p2")?.sessionId).toBe("current-session");
    expect(next[0]?.sessionId).toBe("current-session");
  });
});
