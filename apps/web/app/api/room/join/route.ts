import { jsonNoStore, logApiEvent, parseJoinRoomRequest, toErrorResponse } from "../../../../lib/server/api-utils";
import { handleJoinRoom } from "../../../../lib/server/realtime-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await parseJoinRoomRequest(request);
    const snapshot = await handleJoinRoom(body);
    logApiEvent("info", "room_joined", {
      route: "/api/room/join",
      method: "POST",
      sessionId: body.sessionId,
      playerId: body.playerId,
      roomCode: body.roomCode,
    });
    return jsonNoStore(snapshot);
  } catch (error) {
    return toErrorResponse(error, "Unable to join room.", { route: "/api/room/join", method: "POST" });
  }
}
