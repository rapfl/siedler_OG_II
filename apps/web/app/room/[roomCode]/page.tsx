import { RoomScreen } from "../../../features/lobby/room-screen";

export default async function Page({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = await params;
  return <RoomScreen roomCode={roomCode} />;
}
