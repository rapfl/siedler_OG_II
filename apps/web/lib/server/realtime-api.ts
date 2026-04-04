import type { ClientSubmitCommandMessage, CommandRejectedMessage, GeneratedBoard, MatchState, MatchView, RoomView, ServerMessage } from "@siedler/shared-types";
import type { RealtimeDispatch } from "@siedler/realtime";

import { loadRealtimeService, mutateRealtimeState } from "./neon-realtime-store";

export interface ApiRealtimeSnapshot {
  room?: RoomView | undefined;
  match?: MatchView | undefined;
  board?: GeneratedBoard | undefined;
  roomCode?: string | undefined;
  dispatches: RealtimeDispatch[];
  lastRejected?: CommandRejectedMessage | undefined;
}

function buildSnapshotFromDispatches(
  sessionId: string,
  dispatches: RealtimeDispatch[],
  match?: MatchState,
): ApiRealtimeSnapshot {
  let room: RoomView | undefined;
  let playerView: MatchView | undefined;
  let roomCode: string | undefined;
  let lastRejected: CommandRejectedMessage | undefined;

  for (const dispatch of dispatches.filter((entry) => entry.sessionId === sessionId)) {
    if (dispatch.message.type === "server.room_snapshot" || dispatch.message.type === "server.room_updated") {
      room = dispatch.message.room;
      roomCode = dispatch.message.room.roomCode;
    }

    if (dispatch.message.type === "server.match_snapshot") {
      playerView = dispatch.message.playerView;
    }

    if (dispatch.message.type === "server.command_rejected") {
      lastRejected = dispatch.message;
    }
  }

  return {
    ...(room ? { room } : {}),
    ...(playerView ? { match: playerView } : {}),
    ...(match?.board ? { board: match.board } : {}),
    ...(roomCode ? { roomCode } : {}),
    ...(lastRejected ? { lastRejected } : {}),
    dispatches,
  };
}

export async function getSessionSnapshot(sessionId: string): Promise<ApiRealtimeSnapshot> {
  const service = await loadRealtimeService();
  try {
    const snapshot = service.getPlayerSnapshot(sessionId);
    return {
      room: snapshot.roomView,
      ...(snapshot.matchView ? { match: snapshot.matchView } : {}),
      ...(snapshot.match?.board ? { board: snapshot.match.board } : {}),
      roomCode: snapshot.room.roomCode,
      dispatches: [],
    };
  } catch {
    return {
      dispatches: [],
    };
  }
}

export async function mutateRealtime<T>(mutator: (service: Awaited<ReturnType<typeof loadRealtimeService>>) => T | Promise<T>): Promise<T> {
  return mutateRealtimeState(async (service) => mutator(service));
}

export async function handleCreateRoom(input: { sessionId: string; playerId: string; displayName: string; maxPlayers?: 3 | 4 }) {
  return mutateRealtime((service) => {
    const result = service.createRoom({
      commandId: `create-${Date.now()}`,
      sessionId: input.sessionId,
      playerId: input.playerId,
      displayName: input.displayName,
      ...(input.maxPlayers !== undefined ? { maxPlayers: input.maxPlayers } : {}),
    });
    return buildSnapshotFromDispatches(input.sessionId, result.dispatches, result.match);
  });
}

export async function handleJoinRoom(input: { sessionId: string; playerId: string; displayName: string; roomCode: string }) {
  return mutateRealtime((service) => {
    const result = service.joinRoom({
      commandId: `join-${Date.now()}`,
      sessionId: input.sessionId,
      playerId: input.playerId,
      displayName: input.displayName,
      roomCode: input.roomCode,
    });
    return buildSnapshotFromDispatches(input.sessionId, result.dispatches, result.match);
  });
}

export async function handleRoomAction(input: {
  sessionId: string;
  action: "toggle_ready" | "reassign_seat" | "reassign_color" | "start_match" | "reattach";
  ready?: boolean;
  targetPlayerId?: string;
  seatIndex?: number;
  color?: RoomView["seatStates"][number]["color"];
}) {
  return mutateRealtime((service) => {
    let result:
      | ReturnType<typeof service.toggleReady>
      | ReturnType<typeof service.reassignSeat>
      | ReturnType<typeof service.reassignColor>
      | ReturnType<typeof service.startMatch>
      | ReturnType<typeof service.reattachSession>;

    switch (input.action) {
      case "toggle_ready":
        result = service.toggleReady({
          commandId: `ready-${Date.now()}`,
          sessionId: input.sessionId,
          ready: !!input.ready,
        });
        break;
      case "reassign_seat":
        result = service.reassignSeat({
          commandId: `seat-${Date.now()}`,
          sessionId: input.sessionId,
          targetPlayerId: input.targetPlayerId!,
          seatIndex: input.seatIndex!,
        });
        break;
      case "reassign_color":
        result = service.reassignColor({
          commandId: `color-${Date.now()}`,
          sessionId: input.sessionId,
          targetPlayerId: input.targetPlayerId!,
          color: input.color!,
        });
        break;
      case "start_match":
        result = service.startMatch({
          commandId: `start-${Date.now()}`,
          sessionId: input.sessionId,
        });
        break;
      case "reattach":
        result = service.reattachSession({
          sessionId: input.sessionId,
        });
        break;
    }

    return buildSnapshotFromDispatches(input.sessionId, result.dispatches, result.match);
  });
}

export async function handleMatchCommand(
  input: {
    sessionId: string;
  } & Omit<ClientSubmitCommandMessage, "type" | "roomId">,
) {
  return mutateRealtime((service) => {
    const result = service.submitMatchCommand({
      commandId: input.commandId,
      sessionId: input.sessionId,
      matchId: input.matchId!,
      commandType: input.commandType,
      ...(input.payload !== undefined ? { payload: input.payload } : {}),
      ...(input.clientStateVersion !== undefined ? { clientStateVersion: input.clientStateVersion } : {}),
    });
    return buildSnapshotFromDispatches(input.sessionId, result.dispatches, result.match);
  });
}
