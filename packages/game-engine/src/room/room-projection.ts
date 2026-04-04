import type {
  RoomPlayerSummary,
  RoomSeatState,
  RoomView,
  PlayerColor,
  RoomState,
} from "../../../shared-types/src/index.js";

import { PLAYER_COLORS, canStartMatch, getStartMatchBlockers } from "./room-lifecycle.js";

export function projectRoomView(room: RoomState, viewerPlayerId?: string): RoomView {
  return {
    roomId: room.roomId,
    roomCode: room.roomCode,
    invitePath: `/room/${room.roomCode}`,
    roomStatus: room.status,
    roomVersion: room.version,
    maxPlayers: room.maxPlayers,
    hostPlayerId: room.hostPlayerId,
    selfPlayerId: viewerPlayerId,
    currentMatchId: room.currentMatchId,
    playerSummaries: buildPlayerSummaries(room),
    seatStates: buildSeatStates(room),
    canStartMatch: canStartMatch(room),
    startBlockers: getStartMatchBlockers(room),
    postgameSummary: room.postgameSummary,
  };
}

export function buildPlayerSummaries(room: RoomState): RoomPlayerSummary[] {
  return [...room.players]
    .sort((left, right) => left.seatIndex - right.seatIndex)
    .map((player) => ({
      playerId: player.playerId,
      displayName: player.displayName,
      seatIndex: player.seatIndex,
      color: player.color,
      ready: player.ready,
      presence: player.presence,
      isHost: player.playerId === room.hostPlayerId,
    }));
}

export function buildSeatStates(room: RoomState): RoomSeatState[] {
  return Array.from({ length: room.maxPlayers }, (_, seatIndex) => {
    const occupant = room.players.find((player) => player.seatIndex === seatIndex);
    const fallbackColor = PLAYER_COLORS[seatIndex] as PlayerColor | undefined;

    if (!occupant) {
      return {
        seatIndex,
        color: fallbackColor,
        ready: false,
        presence: "empty",
        isHost: false,
      };
    }

    return {
      seatIndex,
      occupantPlayerId: occupant.playerId,
      occupantDisplayName: occupant.displayName,
      color: occupant.color,
      ready: occupant.ready,
      presence: occupant.presence,
      isHost: occupant.playerId === room.hostPlayerId,
    };
  });
}
