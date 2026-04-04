"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "../../components/shell";
import { AssetToken } from "../../lib/assets/manifest";
import { useRealtimeSnapshot } from "../../lib/realtime/use-realtime";
import { playerColorToken, roomBlockerCopy, roomStatusBadge } from "../../lib/ui/view-model";
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
  const [copyState, setCopyState] = useState<"idle" | "done">("idle");
  const sandboxIdentities = client.supportsSandboxTools() ? client.getSandboxIdentities() : [];

  useEffect(() => {
    if (room?.currentMatchId && room.roomStatus !== "room_postgame") {
      router.prefetch(`/match/${room.currentMatchId}`);
    }
  }, [room?.currentMatchId, room?.roomStatus, router]);

  const inviteUrl = useMemo(() => {
    if (!room || typeof window === "undefined") {
      return room?.invitePath ?? `/room/${roomCode}`;
    }
    return `${window.location.origin}${room.invitePath}`;
  }, [room, roomCode]);

  if (!room || room.roomCode !== roomCode) {
    return (
      <AppShell title="siedler_OG_II" kicker="Room">
        <div className="empty-state">
          <p className="eyebrow">Room State</p>
          <h1 className="display-title">Kein synchronisierter Raum.</h1>
          <p>Oeffne den Raum ueber Entry oder ueber eine bestehende Session.</p>
          <Link href="/" className="action-button">
            Zur Landing
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`Room ${room.roomCode}`}
      kicker="Private Lobby"
      actions={
        <div className="header-actions">
          {badge ? <span className={`badge status-${badge.tone}`}>{badge.label}</span> : null}
          {room.currentMatchId ? (
            <Link href={`/match/${room.currentMatchId}`} className="action-button secondary-button">
              Match oeffnen
            </Link>
          ) : null}
        </div>
      }
    >
      <div className="room-layout">
        <section className="match-main">
          <div className="hero-panel tone-primary">
            <div>
              <p className="eyebrow">Invite</p>
              <h1 className="display-title hero-title">{room.roomCode}</h1>
              <p className="hero-copy">
                Host erstellt den Tisch, Freunde joinen per Link oder Code, alle setzen Ready und der Host startet das Match.
              </p>
            </div>
            <div className="hero-stats">
              <span className="hero-pill">Spieler: {room.playerSummaries.length}/{room.maxPlayers}</span>
              <span className="hero-pill">Host: {room.playerSummaries.find((player) => player.isHost)?.displayName}</span>
              <span className="hero-pill">Mein Sitz: {selfSeat ? selfSeat.seatIndex + 1 : "noch keiner"}</span>
            </div>
          </div>

          <section className="panel match-subpanel">
            <div className="section-header">
              <div>
                <p className="eyebrow">Join Flow</p>
                <h2 className="section-title">Code und Invite-Link</h2>
              </div>
            </div>
            <div className="invite-row">
              <div className="invite-code-card">
                <p className="invite-label">Room Code</p>
                <p className="invite-code">{room.roomCode}</p>
              </div>
              <div className="invite-link-card">
                <p className="invite-label">Invite Link</p>
                <p className="invite-link-text">{inviteUrl}</p>
              </div>
            </div>
            <div className="cluster">
              <button
                className="action-button"
                onClick={async () => {
                  await navigator.clipboard.writeText(inviteUrl);
                  setCopyState("done");
                  window.setTimeout(() => setCopyState("idle"), 1400);
                }}
              >
                {copyState === "done" ? "Link kopiert" : "Invite kopieren"}
              </button>
              <button className="action-button secondary-button" onClick={() => void client.toggleReady(!(selfSummary?.ready ?? false))}>
                {selfSummary?.ready ? "Ready zuruecknehmen" : "Ready setzen"}
              </button>
              {room.canStartMatch && selfPlayerId === room.hostPlayerId ? (
                <button
                  className="action-button success-button"
                  onClick={async () => {
                    const next = await client.startMatch();
                    if (next.match?.matchId) {
                      router.push(`/match/${next.match.matchId}`);
                    }
                  }}
                >
                  Match starten
                </button>
              ) : null}
            </div>

            {room.startBlockers.length > 0 ? (
              <div className="blocker-list">
                {room.startBlockers.map((blocker: RoomStartBlocker) => (
                  <div key={blocker} className="inline-warning">
                    {roomBlockerCopy(blocker)}
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="panel match-subpanel">
            <div className="section-header">
              <div>
                <p className="eyebrow">Seats</p>
                <h2 className="section-title">Spieler, Farben, Bereitschaft</h2>
              </div>
            </div>
            <div className="seat-grid">
              {room.seatStates.map((seat: RoomSeatState) => (
                <article key={seat.seatIndex} className={`seat-card ${seat.occupantPlayerId === selfPlayerId ? "seat-card-self" : ""}`}>
                  <div className="player-chip-top">
                    <span className={`player-swatch ${playerColorToken(seat.color)}`} />
                    <div>
                      <p className="player-name">
                        {seat.occupantDisplayName ?? `Seat ${seat.seatIndex + 1}`}
                        {seat.isHost ? <span className="micro-tag">HOST</span> : null}
                      </p>
                      <p className="player-meta">Seat {seat.seatIndex + 1}</p>
                    </div>
                  </div>
                  <div className="cost-row">
                    <span className={`badge ${seat.ready ? "status-success" : "status-muted"}`}>{seat.ready ? "Ready" : "Nicht ready"}</span>
                    <span className="badge">{seat.presence}</span>
                  </div>
                  {selfPlayerId === room.hostPlayerId && seat.occupantPlayerId ? (
                    <>
                      <div className="seat-controls">
                        {room.seatStates.map((targetSeat: RoomSeatState) => (
                          <button
                            key={`${seat.occupantPlayerId}-${targetSeat.seatIndex}`}
                            className="secondary-button small-button"
                            onClick={() => void client.reassignSeat(seat.occupantPlayerId!, targetSeat.seatIndex)}
                          >
                            Seat {targetSeat.seatIndex + 1}
                          </button>
                        ))}
                      </div>
                      <div className="seat-controls">
                        {COLORS.map((color) => (
                          <button
                            key={`${seat.occupantPlayerId}-${color}`}
                            className={`color-choice ${playerColorToken(color)} ${seat.color === color ? "color-choice-active" : ""}`}
                            onClick={() => void client.reassignColor(seat.occupantPlayerId!, color)}
                          >
                            {color}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </section>

        <aside className="command-rail">
          <section className="panel rail-panel">
            <p className="eyebrow">Self</p>
            <div className="rail-block">
              <span className="micro-stat">Name: {session?.displayName ?? "Keine Session"}</span>
              {selfSeat ? <span className="micro-stat">Seat: {selfSeat.seatIndex + 1}</span> : null}
              {selfSummary ? <span className="micro-stat">Status: {selfSummary.ready ? "Ready" : "Nicht ready"}</span> : null}
              <div className="cluster">
                <button className="action-button secondary-button" onClick={() => void client.reattachSession()}>
                  Reattach
                </button>
                {room.currentMatchId ? (
                  <button className="action-button" onClick={() => router.push(`/match/${room.currentMatchId}`)}>
                    Zum Match
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          {client.supportsSandboxTools() ? (
            <section className="panel rail-panel">
              <p className="eyebrow">Sandbox</p>
              <div className="rail-block">
                <p className="subtle-copy">Nur lokal: freie Sitze automatisch mit Testspielern fuellen und danach die Perspektive in diesem Browser wechseln.</p>
                <div className="cluster">
                  <button className="action-button secondary-button" onClick={() => void client.fillRoomWithMockPlayers(3)}>
                    Auf 3 Spieler
                  </button>
                  <button className="action-button secondary-button" onClick={() => void client.fillRoomWithMockPlayers(4)}>
                    Auf 4 Spieler
                  </button>
                </div>
                {sandboxIdentities.length > 0 ? (
                  <div className="stack-gap">
                    <p className="editor-title">Perspektive wechseln</p>
                    <div className="seat-controls">
                      {sandboxIdentities.map((identity) => (
                        <button
                          key={identity.sessionId}
                          className={`secondary-button small-button ${identity.isCurrent ? "button-active" : ""}`}
                          onClick={() => void client.switchSandboxIdentity(identity.sessionId)}
                        >
                          {identity.displayName}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {room.roomStatus === "room_postgame" ? (
            <section className="panel rail-panel">
              <p className="eyebrow">Postgame</p>
              <div className="rail-block">
                <span className="micro-stat">Gewinner: {room.postgameSummary?.winnerPlayerId}</span>
                <span className="micro-stat">Punkte: {room.postgameSummary?.winningTotalPoints}</span>
                <span className="micro-stat">Ursache: {room.postgameSummary?.victoryCause}</span>
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </AppShell>
  );
}
