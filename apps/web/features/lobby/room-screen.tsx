"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AppShell } from "../../components/shell";
import { AssetToken } from "../../lib/assets/manifest";
import { useRealtimeSnapshot } from "../../lib/realtime/use-realtime";
import { roomBlockerCopy, roomStatusBadge } from "../../lib/ui/view-model";
import type { PlayerColor, RoomPlayerSummary, RoomSeatState, RoomStartBlocker } from "@siedler/shared-types";

const COLORS: PlayerColor[] = ["red", "blue", "white", "orange"];

export function RoomScreen({ roomCode }: { roomCode: string }) {
  const router = useRouter();
  const { client, session, snapshot } = useRealtimeSnapshot();
  const room = snapshot.room;
  const badge = room ? roomStatusBadge(room) : undefined;
  const selfPlayerId = room?.selfPlayerId;
  const selfSeat = room?.seatStates.find((seat: RoomSeatState) => seat.occupantPlayerId === selfPlayerId);
  const selfSummary = room?.playerSummaries.find((player: RoomPlayerSummary) => player.playerId === selfPlayerId);

  useEffect(() => {
    if (room?.currentMatchId && room.roomStatus !== "room_postgame") {
      router.prefetch(`/match/${room.currentMatchId}`);
    }
  }, [room?.currentMatchId, room?.roomStatus, router]);

  if (!room || room.roomCode !== roomCode) {
    return (
      <AppShell title="siedler_OG_II" kicker="Room">
        <div className="panel p-8">
          <p className="eyebrow">Room State</p>
          <h1 className="display-title mt-3 text-4xl">Kein synchronisierter Raum.</h1>
          <p className="mt-4 max-w-2xl text-[var(--text-muted)]">
            Oeffne den Raum ueber den Entry-Flow oder setze die lokale Session via Resume fort.
          </p>
          <Link href="/" className="action-button mt-6 inline-flex">
            Zur Landing
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`Room ${room.roomCode}`}
      kicker="Lobby / Postgame"
      actions={
        <div className="flex flex-wrap items-center gap-3">
          {badge ? <span className={`badge ${badge.tone === "success" ? "status-success" : badge.tone === "warning" ? "status-warning" : badge.tone === "danger" ? "status-danger" : "status-muted"}`}>{badge.label}</span> : null}
          {room.currentMatchId ? (
            <Link href={`/match/${room.currentMatchId}`} className="action-button secondary-button">
              Zum Match
            </Link>
          ) : null}
        </div>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="grid gap-6">
          <div className="panel p-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="eyebrow">Invite</p>
                <h2 className="display-title mt-3 text-4xl">{room.roomCode}</h2>
                <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
                  Private Raum-Koordination mit harter Ready-Validierung. Match und Postgame bleiben im selben Room-Kontext.
                </p>
              </div>
              <div className="card-surface p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[#7a6148]">Invite Link</p>
                <p className="mt-2 text-sm font-medium">/room/{room.roomCode}</p>
              </div>
            </div>

            {room.startBlockers.length > 0 ? (
              <div className="mt-6 grid gap-3">
                {room.startBlockers.map((blocker: RoomStartBlocker) => (
                  <div key={blocker} className="badge status-warning">
                    {roomBlockerCopy(blocker)}
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button className="action-button" onClick={() => void client.toggleReady(!(selfSummary?.ready ?? false))}>
                {selfSummary?.ready ? "Ready zuruecknehmen" : "Ready setzen"}
              </button>
              {room.canStartMatch && selfPlayerId === room.hostPlayerId ? (
                <button className="action-button secondary-button" onClick={async () => {
                  const next = await client.startMatch();
                  if (next.match?.matchId) {
                    router.push(`/match/${next.match.matchId}`);
                  }
                }}>
                  Match starten
                </button>
              ) : null}
            </div>
          </div>

          <div className="panel p-6">
            <p className="eyebrow">Seats</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {room.seatStates.map((seat: RoomSeatState) => (
                <div key={seat.seatIndex} className="inlay p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <AssetToken asset={seat.ready ? "status_ready" : "status_not_ready"} tone={seat.ready ? "success" : "default"} />
                      <div>
                        <p className="text-sm uppercase tracking-[0.2em] text-[var(--text-muted)]">Seat {seat.seatIndex + 1}</p>
                        <p className="mt-1 text-lg text-[var(--text-strong)]">{seat.occupantDisplayName ?? "Leer"}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`badge ${seat.ready ? "status-success" : "status-muted"}`}>
                        {seat.presence}
                      </span>
                      <span className="badge">{seat.color ?? COLORS[seat.seatIndex] ?? "n/a"}</span>
                    </div>
                  </div>
                  {selfPlayerId === room.hostPlayerId && seat.occupantPlayerId ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {room.seatStates.map((targetSeat: RoomSeatState) => (
                        <button
                          key={`${seat.occupantPlayerId}-${targetSeat.seatIndex}`}
                          className="secondary-button rounded-full border border-[var(--line)] px-3 py-1 text-xs tracking-[0.16em] text-[var(--text-muted)]"
                          onClick={() => void client.reassignSeat(seat.occupantPlayerId!, targetSeat.seatIndex)}
                        >
                          Seat {targetSeat.seatIndex + 1}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6">
          <div className="panel p-6">
            <p className="eyebrow">Self / Resume</p>
            <div className="mt-4 grid gap-3">
              <div className="badge">{session?.displayName ?? "Keine Session"}</div>
              {selfSeat ? <div className="badge">Seat {selfSeat.seatIndex + 1}</div> : null}
              {room.currentMatchId ? (
                <button className="action-button" onClick={() => router.push(`/match/${room.currentMatchId}`)}>
                  Aktives Match oeffnen
                </button>
              ) : null}
            </div>
          </div>

          <div className="panel p-6">
            <p className="eyebrow">Local Sandbox</p>
            <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
              Da die erste UI gegen den lokalen In-Memory-Adapter laeuft, kannst du Gaeste automatisch auffuellen und ready setzen.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button className="action-button secondary-button" onClick={() => void client.fillRoomWithMockPlayers(3)}>
                Auf 3 Spieler auffuellen
              </button>
              <button className="action-button secondary-button" onClick={() => void client.fillRoomWithMockPlayers(4)}>
                Auf 4 Spieler auffuellen
              </button>
            </div>
          </div>

          {room.roomStatus === "room_postgame" ? (
            <div className="panel p-6">
              <p className="eyebrow">Postgame</p>
              <h2 className="display-title mt-3 text-3xl">Match beendet, Room bleibt bestehen.</h2>
              <div className="mt-5 grid gap-3">
                <div className="badge">Winner: {room.postgameSummary?.winnerPlayerId}</div>
                <div className="badge">Punkte: {room.postgameSummary?.winningTotalPoints}</div>
                <div className="badge">Cause: {room.postgameSummary?.victoryCause}</div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
