"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "../../components/shell";
import { createRoomScreenModel } from "../../lib/ui/room-screen-model";
import { playerColorToken, roomBlockerCopy } from "../../lib/ui/view-model";
import { useRealtimeSnapshot } from "../../lib/realtime/use-realtime";
import { useRouteBodyClass } from "../../lib/ui/use-route-body-class";
import type { PlayerColor } from "@siedler/shared-types";

const COLORS: PlayerColor[] = ["red", "blue", "white", "orange"];
type LobbyDrawer = "invite" | "tools" | "postgame" | null;

export function RoomScreen({ roomCode }: { roomCode: string }) {
  useRouteBodyClass("route-room");

  const router = useRouter();
  const { client, session, snapshot } = useRealtimeSnapshot();
  const room = snapshot.room;
  const sandboxIdentities = client.supportsSandboxTools() ? client.getSandboxIdentities() : [];
  const model = createRoomScreenModel(room, session, sandboxIdentities.length);
  const [copyState, setCopyState] = useState<"idle" | "done">("idle");
  const [activeDrawer, setActiveDrawer] = useState<LobbyDrawer>(null);

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
      pageClassName="shell-page-route"
      contentClassName="shell-content-route"
      actions={
        <div className="header-actions">
          <span className={`badge status-${model.badge.tone}`}>{model.badge.label}</span>
          {room.currentMatchId ? (
            <Link href={`/match/${room.currentMatchId}`} className="action-button secondary-button">
              Match oeffnen
            </Link>
          ) : null}
        </div>
      }
    >
      <div className="lobby-surface">
        <section className="lobby-stage">
          <div className="lobby-stage-header">
            <div>
              <p className="eyebrow">Private Table</p>
              <h1 className="display-title match-stage-title">{room.roomCode}</h1>
              <p className="subtle-copy">
                Sitzverteilung, Farben und Ready-Status bleiben auf einer kompakten Tafel. Invite und Sandbox liegen im Drawer.
              </p>
            </div>
            <div className="match-stage-badges">
              <span className="hero-pill">Spieler: {room.playerSummaries.length}/{room.maxPlayers}</span>
              <span className="hero-pill">Host: {room.playerSummaries.find((player) => player.isHost)?.displayName}</span>
              <span className="hero-pill">Mein Sitz: {model.selfSeat ? model.selfSeat.seatIndex + 1 : "noch keiner"}</span>
            </div>
          </div>

          <div className="lobby-seat-grid">
            {room.seatStates.map((seat) => (
              <article key={seat.seatIndex} className={`lobby-seat-card ${seat.occupantPlayerId === model.selfPlayerId ? "lobby-seat-card-self" : ""}`}>
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
                {model.selfPlayerId === room.hostPlayerId && seat.occupantPlayerId ? (
                  <div className="lobby-seat-actions">
                    <div className="seat-controls">
                      {room.seatStates.map((targetSeat) => (
                        <button
                          key={`${seat.occupantPlayerId}-${targetSeat.seatIndex}`}
                          className="secondary-button small-button"
                          onClick={() => void client.reassignSeat(seat.occupantPlayerId!, targetSeat.seatIndex)}
                        >
                          S{targetSeat.seatIndex + 1}
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
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          {room.startBlockers.length > 0 ? (
            <div className="blocker-list">
              {room.startBlockers.map((blocker) => (
                <div key={blocker} className="inline-warning">
                  {roomBlockerCopy(blocker)}
                </div>
              ))}
            </div>
          ) : null}

          {activeDrawer ? (
            <aside className="lobby-drawer">
              <div className="match-drawer-header">
                <p className="eyebrow">Lobby Drawer</p>
                <button className="secondary-button small-button" onClick={() => setActiveDrawer(null)}>
                  Schliessen
                </button>
              </div>
              {activeDrawer === "invite" ? (
                <div className="match-drawer-body">
                  <div className="rail-block">
                    <p className="invite-label">Room Code</p>
                    <p className="invite-code">{room.roomCode}</p>
                  </div>
                  <div className="rail-block">
                    <p className="invite-label">Invite Link</p>
                    <p className="invite-link-text">{inviteUrl}</p>
                  </div>
                </div>
              ) : null}
              {activeDrawer === "tools" ? (
                <div className="match-drawer-body">
                  <div className="rail-block">
                    <span className="micro-stat">Name: {model.sessionName}</span>
                    {model.selfSeat ? <span className="micro-stat">Seat: {model.selfSeat.seatIndex + 1}</span> : null}
                    {model.selfSummary ? <span className="micro-stat">Status: {model.selfSummary.ready ? "Ready" : "Nicht ready"}</span> : null}
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
                  {client.supportsSandboxTools() ? (
                    <div className="rail-block">
                      <p className="subtle-copy">Nur lokal: freie Sitze automatisch mit Testspielern fuellen und die Perspektive in diesem Browser wechseln.</p>
                      <div className="cluster">
                        <button className="action-button secondary-button" onClick={() => void client.fillRoomWithMockPlayers(3)}>
                          Auf 3 Spieler
                        </button>
                        <button className="action-button secondary-button" onClick={() => void client.fillRoomWithMockPlayers(4)}>
                          Auf 4 Spieler
                        </button>
                      </div>
                      {sandboxIdentities.length > 0 ? (
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
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {activeDrawer === "postgame" ? (
                <div className="match-drawer-body">
                  <div className="rail-block">
                    <span className="micro-stat">Gewinner: {room.postgameSummary?.winnerPlayerId}</span>
                    <span className="micro-stat">Punkte: {room.postgameSummary?.winningTotalPoints}</span>
                    <span className="micro-stat">Ursache: {room.postgameSummary?.victoryCause}</span>
                  </div>
                </div>
              ) : null}
            </aside>
          ) : null}
        </section>

        <section className="lobby-dock">
          <div className="lobby-dock-main">
            <button
              className="action-button"
              onClick={async () => {
                if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                  await navigator.clipboard.writeText(inviteUrl);
                  setCopyState("done");
                  window.setTimeout(() => setCopyState("idle"), 1400);
                  return;
                }

                setActiveDrawer("invite");
              }}
            >
              {copyState === "done" ? "Link kopiert" : "Invite kopieren"}
            </button>
            <button className="action-button secondary-button" onClick={() => void client.toggleReady(!(model.selfSummary?.ready ?? false))}>
              {model.selfSummary?.ready ? "Ready zuruecknehmen" : "Ready setzen"}
            </button>
            {room.canStartMatch && model.selfPlayerId === room.hostPlayerId ? (
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
            ) : (
              <span className="micro-stat">Start blockiert, bis alle Sitze bereit sind.</span>
            )}
          </div>

          <div className="match-utility-tabs">
            <button className={`utility-button ${activeDrawer === "invite" ? "utility-button-active" : ""}`} onClick={() => setActiveDrawer((current) => (current === "invite" ? null : "invite"))}>
              Invite
            </button>
            <button className={`utility-button ${activeDrawer === "tools" ? "utility-button-active" : ""}`} onClick={() => setActiveDrawer((current) => (current === "tools" ? null : "tools"))}>
              Tools
            </button>
            {room.roomStatus === "room_postgame" ? (
              <button className={`utility-button ${activeDrawer === "postgame" ? "utility-button-active" : ""}`} onClick={() => setActiveDrawer((current) => (current === "postgame" ? null : "postgame"))}>
                Postgame
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
