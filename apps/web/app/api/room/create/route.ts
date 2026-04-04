import { jsonNoStore, logApiEvent, parseCreateRoomRequest, toErrorResponse } from "../../../../lib/server/api-utils";
import { handleCreateRoom } from "../../../../lib/server/realtime-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await parseCreateRoomRequest(request);
    const snapshot = await handleCreateRoom(body);
    logApiEvent("info", "room_created", {
      route: "/api/room/create",
      method: "POST",
      sessionId: body.sessionId,
      playerId: body.playerId,
      roomCode: snapshot.roomCode,
    });
    return jsonNoStore(snapshot);
  } catch (error) {
    return toErrorResponse(error, "Unable to create room.", { route: "/api/room/create", method: "POST" });
  }
}
