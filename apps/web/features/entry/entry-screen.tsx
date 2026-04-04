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
      title="siedler_OG_II"
      kicker="Private Table / Box Edition"
      actions={resumeHref ? <button className="action-button secondary-button" onClick={() => router.push(resumeHref)}>Resume Session</button> : null}
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="panel p-7">
          <p className="eyebrow">Visual Direction</p>
          <h1 className="display-title mt-3 text-5xl">Digitale Holzkiste statt generischer Spiel-Lobby.</h1>
          <p className="mt-5 max-w-2xl text-[1.05rem] leading-7 text-[var(--text-muted)]">
            Die Web-App priorisiert schnelle private Friends-Runden, klare Forced Actions und eine ruhige,
            materialbewusste Board-Game-Anmutung. Room und Match bleiben getrennt, Resume bleibt snapshot-first.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="inlay p-4">
              <AssetToken asset="piece_settlement" tone="wood" />
              <h2 className="mt-3 text-lg text-[var(--text-strong)]">Create Room</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Minimaler Einstieg fuer den Host mit sofortigem Invite-Code.</p>
            </div>
            <div className="inlay p-4">
              <AssetToken asset="presence_connected" tone="felt" />
              <h2 className="mt-3 text-lg text-[var(--text-strong)]">Realtime Lobby</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Ready- und Presence-Zustaende sind sichtbar, bevor das Match startet.</p>
            </div>
            <div className="inlay p-4">
              <AssetToken asset="state_forced_action" tone="danger" />
              <h2 className="mt-3 text-lg text-[var(--text-strong)]">Forced Flows</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Action Guidance priorisiert Pflichtschritte wie Setup, Discard und Robber.</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6">
          <div className="panel p-6">
            <p className="eyebrow">Create Room</p>
            <div className="mt-4 grid gap-4">
              <input className="text-input" value={createName} onChange={(event) => setCreateName(event.target.value)} placeholder="Display Name" />
              <select className="select-input" value={playerCount} onChange={(event) => setPlayerCount(Number(event.target.value) as 3 | 4)}>
                <option value={4}>4 Spieler (Default)</option>
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
                    setError(caught instanceof Error ? caught.message : "Create Room fehlgeschlagen.");
                  }
                }}
              >
                Raum erstellen
              </button>
            </div>
          </div>

          <div className="panel p-6">
            <p className="eyebrow">Join by Code</p>
            <div className="mt-4 grid gap-4">
              <input className="text-input" value={joinName} onChange={(event) => setJoinName(event.target.value)} placeholder="Display Name" />
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
                    setError(caught instanceof Error ? caught.message : "Join fehlgeschlagen.");
                  }
                }}
              >
                Raum beitreten
              </button>
            </div>
          </div>

          <div className="panel p-6">
            <p className="eyebrow">Resume</p>
            <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
              Die Browser-Session speichert Display Name, Session-ID und letzte Raum-/Match-Zuordnung fuer snapshot-first Reattach.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {resumeHref ? (
                <button className="action-button" onClick={() => router.push(resumeHref)}>
                  Fortsetzen
                </button>
              ) : (
                <span className="badge status-muted">Keine verwertbare Session gefunden</span>
              )}
            </div>
          </div>

          {error ? <div className="badge status-danger">{error}</div> : null}
        </section>
      </div>
    </AppShell>
  );
}
