import { jsonNoStore, logApiEvent, parseSessionStateRequest, toErrorResponse } from "../../../../lib/server/api-utils";
import { getSessionSnapshot } from "../../../../lib/server/realtime-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { sessionId } = parseSessionStateRequest(request);
    const snapshot = await getSessionSnapshot(sessionId);
    logApiEvent("info", "session_state_read", {
      route: "/api/session/state",
      method: "GET",
      sessionId,
      hasRoom: Boolean(snapshot.room),
      hasMatch: Boolean(snapshot.match),
    });
    return jsonNoStore(snapshot);
  } catch (error) {
    return toErrorResponse(error, "Unable to read session state.", { route: "/api/session/state", method: "GET" });
  }
}
