"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="empty-state">
      <p className="eyebrow">Match Error</p>
      <h1 className="display-title">Die Match-Ansicht ist abgestuerzt.</h1>
      <p>Reload die Route oder setze die Ansicht zurueck. Der Tabellenzustand bleibt serverseitig erhalten.</p>
      <button className="action-button" onClick={() => reset()}>
        Match neu laden
      </button>
    </div>
  );
}
