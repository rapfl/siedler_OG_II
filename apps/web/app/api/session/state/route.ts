import { NextResponse } from "next/server";

import { getSessionSnapshot } from "../../../../lib/server/realtime-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      {
        error: "sessionId is required.",
      },
      { status: 400 },
    );
  }

  try {
    const snapshot = await getSessionSnapshot(sessionId);
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to read session state.",
      },
      { status: 400 },
    );
  }
}
