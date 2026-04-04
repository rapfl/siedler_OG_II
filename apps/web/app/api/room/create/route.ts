import { NextResponse } from "next/server";

import { handleCreateRoom } from "../../../../lib/server/realtime-api";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sessionId: string;
      playerId: string;
      displayName: string;
      maxPlayers?: 3 | 4;
    };

    const snapshot = await handleCreateRoom(body);
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create room.",
      },
      { status: 400 },
    );
  }
}
