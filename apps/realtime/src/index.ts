import { InMemoryRealtimeService } from "./in-memory-realtime-service.js";

const realtime = new InMemoryRealtimeService();

const bootstrap = realtime.createRoom({
  commandId: "bootstrap-create-room",
  sessionId: "bootstrap-session",
  playerId: "bootstrap-host",
  displayName: "Bootstrap Host",
});

console.log("[realtime] foundation bootstrap ready", {
  roomId: bootstrap.room.roomId,
  roomStatus: bootstrap.room.status,
  dispatches: bootstrap.dispatches.map((dispatch) => dispatch.message.type),
});
