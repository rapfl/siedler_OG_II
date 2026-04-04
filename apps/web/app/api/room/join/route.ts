import { NextResponse } from "next/server";

import { handleJoinRoom } from "../../../../lib/server/realtime-api";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sessionId: string;
      playerId: string;
      displayName: string;
      roomCode: string;
    };

    const snapshot = await handleJoinRoom(body);
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to join room.",
      },
      { status: 400 },
    );
  }
}
