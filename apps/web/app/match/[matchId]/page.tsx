import { MatchScreen } from "../../../features/match/match-screen";

export default async function Page({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  return <MatchScreen matchId={matchId} />;
}
