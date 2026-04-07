"use client";

import { useEffect, useRef, useState } from "react";

import { AppShell } from "../../components/shell";
import { MatchScreen } from "../match/match-screen";
import { ensurePlayableSandboxMatch } from "../../lib/realtime/demo-bootstrap";
import { useRealtimeSnapshot } from "../../lib/realtime/use-realtime";

type DemoStatus = "booting" | "ready" | "error";

export function DemoMatchRoot() {
  const { client, session, snapshot } = useRealtimeSnapshot();
  const [status, setStatus] = useState<DemoStatus>("booting");
  const [matchId, setMatchId] = useState<string>();
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (snapshot.match?.matchId) {
      setMatchId(snapshot.match.matchId);
      setStatus("ready");
      setError(undefined);
      return;
    }

    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setStatus("booting");

    void ensurePlayableSandboxMatch(client, snapshot, session)
      .then((result) => {
        if (result.matchId) {
          setMatchId(result.matchId);
          setStatus("ready");
          setError(undefined);
          return;
        }

        setStatus("error");
        setError("Die Demo-Partie konnte nicht initialisiert werden.");
      })
      .catch((caught) => {
        setStatus("error");
        setError(caught instanceof Error ? caught.message : "Die Demo-Partie konnte nicht initialisiert werden.");
      })
      .finally(() => {
        inFlightRef.current = false;
      });
  }, [attempt, client, session, snapshot]);

  if (status === "ready" && matchId) {
    return <MatchScreen matchId={matchId} />;
  }

  return (
    <AppShell title="Settlers of the Realm" kicker="Playable Sandbox Table" pageClassName="shell-page-demo">
      <div className="empty-state demo-boot-state">
        <p className="eyebrow">Main Game Screen</p>
        <h1 className="display-title">Preparing the table.</h1>
        <p>
          The sandbox room is being assembled, seats are being filled, and the match is being brought to the first
          playable placement.
        </p>
        {error ? <div className="inline-warning">{error}</div> : null}
        <div className="cluster">
          <span className={`badge ${status === "error" ? "status-danger" : "status-warning"}`}>
            {status === "error" ? "Bootstrap failed" : "Autostart active"}
          </span>
          <button type="button" className="action-button" onClick={() => setAttempt((value) => value + 1)}>
            Retry setup
          </button>
        </div>
      </div>
    </AppShell>
  );
}
