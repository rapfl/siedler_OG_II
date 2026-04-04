import { NextResponse } from "next/server";

import { handleRoomAction } from "../../../../lib/server/realtime-api";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sessionId: string;
      action: "toggle_ready" | "reassign_seat" | "reassign_color" | "start_match" | "reattach";
      ready?: boolean;
      targetPlayerId?: string;
      seatIndex?: number;
      color?: "red" | "blue" | "white" | "orange";
    };

    const snapshot = await handleRoomAction(body);
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to perform room action.",
      },
      { status: 400 },
    );
  }
}
