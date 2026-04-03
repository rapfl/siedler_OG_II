# Reconnect Protocol Specification

## Zweck
Dieses Dokument definiert das Verhalten bei Verbindungsverlust, Wiederverbindung und State-Resynchronisierung.

Es beschreibt:
- wie Sessions wieder an Room und Match gebunden werden,
- wann inkrementelle Fortsetzung möglich ist,
- wann ein Full Resync nötig ist,
- wie Player-specific Views nach Reconnect wiederhergestellt werden,
- und wie Disconnect, Grace-Zeitraum und Seat-Continuity technisch zusammenspielen.

Dieses Dokument ist kritisch für:
- Multiplayer-Verlässlichkeit
- UX-Kontinuität
- korrekte Hidden-Information-Projection

---

## 1. Grundprinzipien

### 1.1 Reconnect ist kein Neustart
Nach Wiederverbindung soll der Nutzer in denselben fachlichen Kontext zurückkehren:
- gleicher Room, falls noch existent
- gleiches Match, falls aktiv
- gleicher Seat / Player-Kontext, sofern noch gültig

### 1.2 Disconnect und Leave sind verschieden
- `disconnect` = technischer Zwischenzustand
- `explicit_leave` = bewusster Austritt

Reconnect versucht nur Kontinuität für technische Unterbrechungen.

### 1.3 Reconnect liefert Projektion, nicht Full State
Wie überall gilt:
- Server rekonstruiert den Full State intern
- Client erhält eine aktuelle, erlaubte Projektion

---

## 2. Reconnect-Fälle

## 2.1 Reconnect in Pre-match Lobby
Ziel:
- Nutzer kehrt in denselben Room zurück
- Seat bleibt erhalten, solange Grace aktiv oder Seat nicht freigegeben wurde

## 2.2 Reconnect in laufendes Match
Ziel:
- Nutzer kehrt als derselbe Player in die laufende Partie zurück
- offene Forced Actions bleiben erhalten

## 2.3 Reconnect in Postgame Lobby
Ziel:
- Nutzer kehrt nicht in aktive Turn-Logik zurück,
- sondern in den Postgame-Room-Zustand

## 2.4 Reconnect nach Seat Expiry
Ziel:
- Nutzer erhält klare Rückmeldung, dass der frühere Seat nicht mehr reserviert ist
- keine stillschweigende falsch-positive Wiederaufnahme

## 2.5 Reconnect nach explicit_leave
Ziel:
- keine automatische Rückkehr in denselben Seat / Room-Kontext
- normaler Join-/Resume-Pfad notwendig

---

## 3. Relevante Zustände

## 3.1 Session-Ebene
- `session_active`
- `session_disconnected`
- `session_reattached`
- `session_invalid`

## 3.2 Seat-/Presence-Ebene
- `connected`
- `disconnected_grace`
- `expired`
- `explicitly_left`

## 3.3 Room-/Match-Ebene
Reconnect kann in unterschiedlichen Lifecycle-Zuständen landen:
- `room_open_prematch`
- `room_match_in_progress`
- `room_postgame`

---

## 4. Client-seitige Reconnect-Inputs

Beim Reconnect sollte der Client mindestens senden:
- `sessionId`
- optional `roomId`
- optional `matchId`
- optional `lastKnownRoomVersion`
- optional `lastKnownMatchVersion`
- optional `lastKnownPlayerId`

Optional:
- `lastSeenEventSequence`

---

## 5. Server-seitige Reconnect-Prüfung

Der Server prüft in dieser Reihenfolge:

## 5.1 Ist die Session bekannt?
Wenn nein:
- `session_invalid`
- normaler Entry erforderlich

## 5.2 Gibt es eine gültige Player-/Seat-Zuordnung?
Wenn nein:
- `session_conflict` oder `seat_not_reserved`
- kein stilles Reattach

## 5.3 Existiert der Room noch?
Wenn nein:
- Room Recovery nicht möglich

## 5.4 Existiert ein aktives oder gerade beendetes Match?
Wenn ja:
- Reconnect in Match oder Postgame-Zustand

## 5.5 Sind Versionen nah genug für Incremental Sync?
Wenn nein:
- Full Snapshot / Resync

---

## 6. Reconnect-Ausgänge

## 6.1 `resume_room_only`
Der Nutzer wird in eine aktuelle Room-Projektion zurückgeführt.

## 6.2 `resume_room_and_match`
Der Nutzer wird in Room- und Match-Kontext zurückgeführt.

## 6.3 `resume_postgame`
Der Nutzer wird in Postgame-Lobby / Room-after-match zurückgeführt.

## 6.4 `resume_denied_session_invalid`
Keine gültige Session mehr.

## 6.5 `resume_denied_seat_expired`
Früherer Seat nicht mehr reserviert.

## 6.6 `resume_denied_explicit_leave`
Der Nutzer hat den Room bewusst verlassen; keine automatische Rückkehr.

---

## 7. Snapshot-Strategie bei Reconnect

## 7.1 Grundsatz
Reconnect soll standardmäßig snapshot-first sein.

Warum:
- weniger fragile Event-Lücken
- klare Player-specific Projection
- einfacher nach Forced States und versteckten Informationen

## 7.2 Mindestinhalt eines Reconnect-Snapshots

### Room-Ebene
- `roomId`
- `roomState`
- `roomVersion`
- `seatStates`
- `hostPlayerId`
- `allOccupiedSeatsReady`

### Match-Ebene, falls relevant
- `matchId`
- `matchState`
- `matchVersion`
- `playerView`
- `requiredAction`
- `allowedActions`
- `phaseSummary`

---

## 8. Inkrementelle Fortsetzung

## 8.1 Wann erlaubt
Inkrementelle Sync kann genutzt werden, wenn:
- Session eindeutig ist
- Room/Match noch existieren
- Server den Client-Zustand plausibel fortführen kann
- Event-/Versionsdifferenz klein und vertrauenswürdig ist

## 8.2 Empfehlung
Trotzdem sollte das System pragmatisch snapshot-first bleiben. Inkrementelle Fortsetzung ist Optimierung, nicht Grundannahme.

---

## 9. Forced State Recovery

## 9.1 Grundsatz
Wenn ein Spieler mitten in einer Pflichtauflösung reconnectet, muss genau dieser Kontext priorisiert werden.

Beispiele:
- Discard noch offen
- Robber-Ziel noch nicht gewählt
- Steal-Ziel noch nicht gewählt
- Year of Plenty Pick 2 noch offen
- Trade Response noch offen

## 9.2 Reconnect-Anforderung
Der Snapshot muss explizit enthalten:
- `requiredAction`
- `resolutionState`
- relevante minimale Kontextdaten

Der Nutzer darf nicht erst über Log-Detektivarbeit rekonstruieren müssen, was von ihm erwartet wird.

---

## 10. Stale Client Recovery

## 10.1 Problem
Der Client reconnectet oder sendet nach Reconnect noch Commands auf Basis veralteter Lokaldaten.

## 10.2 Regel
Nach Reconnect ist der frische Snapshot die einzige gültige lokale Basis.

### Konsequenz
- Alle vorherigen lokalen Preview-States des Clients müssen verworfen oder mit frischem State neu aufgebaut werden.

---

## 11. Presence-Events rund um Reconnect

## 11.1 Bei Disconnect
Server kann aussenden:
- `PLAYER_DISCONNECTED`
- mit `graceUntil`

## 11.2 Bei erfolgreichem Reattach
Server kann aussenden:
- `SESSION_REATTACHED`
- `PLAYER_CONNECTED`

Wichtig:
- Presence-Änderungen sind Room-relevant,
- aber nicht automatisch Match-State-Änderungen.

---

## 12. Seat Expiry

## 12.1 Vor Match-Start / Postgame
Wenn Grace abläuft:
- Seat kann freigegeben werden
- späteres Reconnect führt nicht mehr automatisch zur alten Zugehörigkeit

## 12.2 Während laufender Partie
Der Spieler bleibt logisch Teil des Matches.

Für den MVP gilt:
- kein Match-Reshaping
- kein Sitzplatz-Recycling in laufender Partie

Wichtig:
Seat Expiry ist daher vor allem ein Room-/Presence-Thema für nicht laufende Match-Kontexte.

---

## 13. Session Conflict

## 13.1 Problemfall
Eine Session versucht, einen Seat zu übernehmen, der bereits durch:
- eine andere aktive Session,
- oder einen inkonsistenten alten Kontext
gebunden scheint.

## 13.2 Server-Reaktion
Nicht still reattachen.

Stattdessen strukturiert zurückgeben:
- `session_conflict`
- optional Recoverability-Hinweis

## 13.3 UX-Folge
Der Client kann dann einen Seat-Recovery- oder Neu-Join-Flow einleiten.

---

## 14. Reconnect und Postgame

## 14.1 Wichtig
Wenn das Match während der Abwesenheit endete, darf der Nutzer nicht in einen scheinbar laufenden Turn zurückgebracht werden.

## 14.2 Reconnect-Ergebnis
- `resume_postgame`
- room_postgame snapshot
- optional Match-Finish-Zusammenfassung

---

## 15. Fehlerfälle

## 15.1 Room existiert nicht mehr
Ergebnis:
- kein Resume
- klarer terminaler Zustand

## 15.2 Match existiert nicht mehr, Room aber schon
Ergebnis:
- Resume in Room-Kontext
- keine aktive Match-Projektion

## 15.3 Session invalid
Ergebnis:
- keine Reattach-Möglichkeit
- normaler Einstieg erforderlich

## 15.4 Reconnect während Lifecycle-Wechsel
Beispiel:
- Disconnect genau zwischen `room_match_starting` und `match_setup`

Empfehlung:
- lieber Full Snapshot nach Stabilisierung des Zielzustands
- nicht auf fragile Zwischenzustände optimieren

---

## 16. Empfohlene Server-Responses für Reconnect

Beispielhafte Response-Typen:
- `server.session_attached`
- `server.room_snapshot`
- `server.match_snapshot`
- `server.resync_required`
- `server.command_rejected` mit `reasonCode=stale_state`

---

## 17. Logging / Debugging

Für Debugbarkeit sollte der Server Reconnect-seitig intern loggen:
- eingehende Session-ID
- früheren Player-/Seat-Kontext
- Ergebnis der Reconnect-Prüfung
- ob Snapshot oder Incremental Sync gewählt wurde
- Ablehnungsgrund bei Fehlern

---

## 18. Kurzform für das Dev-Team
Die wichtigste Reconnect-Regel lautet:
- Reconnect stellt Kontinuität her,
- aber nur auf Basis serverseitiger Wahrheit.

Deshalb gilt praktisch:
- snapshot-first
- player-specific projection
- forced-action recovery
- leave und disconnect strikt getrennt behandeln.