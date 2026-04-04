import { parseMatchCommandRequest, toErrorResponse, jsonNoStore, logApiEvent } from "../../../../lib/server/api-utils";
import { handleMatchCommand } from "../../../../lib/server/realtime-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await parseMatchCommandRequest(request);
    const snapshot = await handleMatchCommand(body);
    logApiEvent("info", "match_command_processed", {
      route: "/api/match/command",
      method: "POST",
      sessionId: body.sessionId,
      matchId: body.matchId,
      commandType: body.commandType,
      rejected: Boolean(snapshot.lastRejected),
    });
    return jsonNoStore(snapshot);
  } catch (error) {
    return toErrorResponse(error, "Unable to submit command.", { route: "/api/match/command", method: "POST" });
  }
}
