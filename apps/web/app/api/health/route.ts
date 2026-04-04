import { checkDatabaseHealth } from "../../../lib/server/neon-realtime-store";
import { jsonNoStore, toErrorResponse } from "../../../lib/server/api-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const health = await checkDatabaseHealth();
    return jsonNoStore({
      ok: true,
      ...health,
    });
  } catch (error) {
    return toErrorResponse(error, "Health check failed.", { route: "/api/health", method: "GET" });
  }
}
