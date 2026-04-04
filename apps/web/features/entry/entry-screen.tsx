"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AppShell } from "../../components/shell";
import { AssetToken } from "../../lib/assets/manifest";
import { useRealtimeSnapshot } from "../../lib/realtime/use-realtime";

export function EntryScreen() {
  const router = useRouter();
  const { client, session } = useRealtimeSnapshot();
  const [createName, setCreateName] = useState(session?.displayName ?? "");
  const [joinName, setJoinName] = useState(session?.displayName ?? "");
  const [joinCode, setJoinCode] = useState(session?.roomCode ?? "");
  const [playerCount, setPlayerCount] = useState<3 | 4>(4);
  const [error, setError] = useState<string>();
  const resumeHref = useMemo(() => {
    if (session?.matchId) {
      return `/match/${session.matchId}`;
    }
    if (session?.roomCode) {
      return `/room/${session.roomCode}`;
    }
    return undefined;
  }, [session]);

  return (
    <AppShell
      title="Siedler OG II"
      kicker="Private Browser Matches"
      actions={
        resumeHref ? (
          <button className="action-button secondary-button" onClick={() => router.push(resumeHref)}>
            Session fortsetzen
          </button>
        ) : null
      }
    >
      <div className="entry-layout">
        <section className="entry-hero">
          <div className="hero-panel tone-primary">
            <p className="eyebrow">Desktop-first Browser Game</p>
            <h1 className="display-title hero-title">Raum erstellen, Link teilen, direkt spielen.</h1>
            <p className="hero-copy">
              Colonist-nahe Lobby- und Match-Flows fuer private Runden: klarer Join, schnelle Ready-Phase, gefuehrte Turns auf einem interaktiven Brett.
            </p>
            <div className="hero-feature-grid">
              <div className="feature-chip">
                <AssetToken asset="piece_settlement" tone="paper" />
                <div>
                  <p className="resource-card-title">Privater Tisch</p>
                  <p className="subtle-copy">Ein Host, ein Link, bis zu vier Spieler.</p>
                </div>
              </div>
              <div className="feature-chip">
                <AssetToken asset="status_ready" tone="success" />
                <div>
                  <p className="resource-card-title">Ready Flow</p>
                  <p className="subtle-copy">Sichtbarer Startzustand statt versteckter Lobbylogik.</p>
                </div>
              </div>
              <div className="feature-chip">
                <AssetToken asset="log_dice_roll" tone="paper" />
                <div>
                  <p className="resource-card-title">Gefuehrte Zuege</p>
                  <p className="subtle-copy">Setup, Raeuber, Handel und Build direkt im Spielbrett.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="entry-actions">
          <div className="panel entry-card">
            <p className="eyebrow">Neuen Raum starten</p>
            <h2 className="section-title">Host Flow</h2>
            <div className="stack-gap">
              <input className="text-input" value={createName} onChange={(event) => setCreateName(event.target.value)} placeholder="Dein Anzeigename" />
              <select className="select-input" value={playerCount} onChange={(event) => setPlayerCount(Number(event.target.value) as 3 | 4)}>
                <option value={4}>4 Spieler</option>
                <option value={3}>3 Spieler</option>
              </select>
              <button
                className="action-button"
                onClick={async () => {
                  try {
                    setError(undefined);
                    const snapshot = await client.createRoom({
                      displayName: createName || "Host",
                      maxPlayers: playerCount,
                    });
                    if (snapshot.roomCode) {
                      router.push(`/room/${snapshot.roomCode}`);
                    }
                  } catch (caught) {
                    setError(caught instanceof Error ? caught.message : "Raum konnte nicht erstellt werden.");
                  }
                }}
              >
                Spiel erstellen
              </button>
            </div>
          </div>

          <div className="panel entry-card">
            <p className="eyebrow">Per Code beitreten</p>
            <h2 className="section-title">Guest Flow</h2>
            <div className="stack-gap">
              <input className="text-input" value={joinName} onChange={(event) => setJoinName(event.target.value)} placeholder="Dein Anzeigename" />
              <input className="text-input uppercase" value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="ROOM CODE" />
              <button
                className="action-button secondary-button"
                onClick={async () => {
                  try {
                    setError(undefined);
                    const snapshot = await client.joinRoom({
                      displayName: joinName || "Spieler",
                      roomCode: joinCode,
                    });
                    if (snapshot.roomCode) {
                      router.push(`/room/${snapshot.roomCode}`);
                    }
                  } catch (caught) {
                    setError(caught instanceof Error ? caught.message : "Beitritt fehlgeschlagen.");
                  }
                }}
              >
                Raum beitreten
              </button>
            </div>
          </div>

          <div className="panel entry-card resume-card">
            <p className="eyebrow">Resume</p>
            <h2 className="section-title">Vorhandene Session</h2>
            <p className="subtle-copy">
              Browser-Session speichert Namen, Raum und letztes Match, damit du nach einem Reload direkt wieder drin bist.
            </p>
            <div className="cluster">
              {resumeHref ? (
                <button className="action-button" onClick={() => router.push(resumeHref)}>
                  Fortsetzen
                </button>
              ) : (
                <span className="badge status-muted">Noch keine Session im Browser</span>
              )}
            </div>
          </div>

          {error ? <div className="inline-warning">{error}</div> : null}
        </section>
      </div>
    </AppShell>
  );
}
