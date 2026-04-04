import type { GeneratedBoard, MatchView, RoomView } from "@siedler/shared-types";

import type { BrowserSessionState } from "../session/storage";

export interface AuthoritativeRealtimeSnapshot {
  room?: RoomView;
  match?: MatchView;
  board?: GeneratedBoard;
  roomCode?: string;
}

export interface SessionCacheShape {
  browserSession: BrowserSessionState;
  room?: RoomView;
  match?: MatchView;
  roomCode?: string;
  board?: GeneratedBoard;
}

export function reduceAuthoritativeSessionState(
  state: SessionCacheShape,
  snapshot: AuthoritativeRealtimeSnapshot,
): SessionCacheShape {
  const nextRoom = snapshot.room ?? state.room;
  const nextRoomCode = snapshot.roomCode ?? snapshot.room?.roomCode ?? state.roomCode;
  const nextMatch = snapshot.match ?? (snapshot.room && !snapshot.match ? undefined : state.match);
  const nextBoard =
    snapshot.board ??
    (snapshot.room && !snapshot.match
      ? undefined
      : nextMatch
        ? state.board
        : undefined);

  return {
    browserSession: state.browserSession,
    ...(nextRoom ? { room: nextRoom } : {}),
    ...(nextRoomCode ? { roomCode: nextRoomCode } : {}),
    ...(nextMatch ? { match: nextMatch } : {}),
    ...(nextBoard ? { board: nextBoard } : {}),
  };
}

export function deriveBrowserSessionFromState(state: SessionCacheShape): BrowserSessionState {
  return {
    sessionId: state.browserSession.sessionId,
    playerId: state.browserSession.playerId,
    displayName: state.browserSession.displayName,
    ...(state.roomCode ? { roomCode: state.roomCode } : {}),
    ...(state.room ? { roomId: state.room.roomId } : {}),
    ...(state.match ? { matchId: state.match.matchId } : {}),
  };
}

export function getResumeHref(
  session: BrowserSessionState | undefined,
  room?: RoomView,
  match?: MatchView,
): string | undefined {
  const roomCode = room?.roomCode ?? session?.roomCode;
  const authoritativeMatchId = match?.matchId;

  if (room?.roomStatus === "room_postgame") {
    return roomCode ? `/room/${roomCode}` : undefined;
  }

  if (authoritativeMatchId) {
    return `/match/${authoritativeMatchId}`;
  }

  if (roomCode) {
    return `/room/${roomCode}`;
  }

  return undefined;
}
