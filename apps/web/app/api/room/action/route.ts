import { jsonNoStore, logApiEvent, parseRoomActionRequest, toErrorResponse } from "../../../../lib/server/api-utils";
import { handleRoomAction } from "../../../../lib/server/realtime-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await parseRoomActionRequest(request);
    const snapshot = await handleRoomAction(body);
    logApiEvent("info", "room_action_processed", {
      route: "/api/room/action",
      method: "POST",
      sessionId: body.sessionId,
      action: body.action,
      rejected: Boolean(snapshot.lastRejected),
    });
    return jsonNoStore(snapshot);
  } catch (error) {
    return toErrorResponse(error, "Unable to perform room action.", { route: "/api/room/action", method: "POST" });
  }
}
