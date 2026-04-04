import { NextResponse } from "next/server";

import { handleMatchCommand } from "../../../../lib/server/realtime-api";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sessionId: string;
      commandId: string;
      matchId: string;
      commandType: string;
      payload?: Record<string, unknown>;
      clientStateVersion?: number;
    };

    const snapshot = await handleMatchCommand(body as never);
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to submit command.",
      },
      { status: 400 },
    );
  }
}
