# Socket Contracts Specification

## Zweck
Dieses Dokument definiert die Realtime-Transportverträge zwischen Client und Server.

Es beschreibt:
- welche Verbindungstypen existieren,
- wie Clients Room- und Match-Kontext abonnieren,
- welche Nachrichtentypen über Socket ausgetauscht werden,
- welche Datenklassen serverseitig gepusht werden,
- und wie Transport und fachliche Rule Engine getrennt bleiben.

Dieses Dokument beschreibt **Transportverträge**, nicht die gesamte Fachlogik.

---

## 1. Grundprinzipien

### 1.1 Server pushes views, nicht den globalen Full State
Der Server broadcastet nie unkritisch den kanonischen Full State an alle Clients.

Stattdessen sendet er:
- room-level projections
- player-specific match views
- event / status updates

### 1.2 Commands und State-Updates sind getrennt
Client -> Server:
- Commands / Intents

Server -> Client:
- Acknowledgements
- Rejections
- State Snapshots / Patches / Projections
- Presence / lifecycle updates

### 1.3 Room und Match sind transportseitig getrennte Kontexte
Ein Client kann logisch in:
- einem Room-Kontext,
- einem Match-Kontext,
- oder beiden
synchronisiert sein.

---

## 2. Verbindungsebenen

## 2.1 Primäre Verbindung
Ein aktiver Client hält eine authentifizierte oder session-gebundene WebSocket-Verbindung zum Realtime-Server.

## 2.2 Kontext-Abonnements
Über diese Verbindung kann der Client in folgende Kontexte synchronisiert werden:
- `room:{roomId}`
- `match:{matchId}`

Wichtig:
- Room und Match werden logisch getrennt gedacht,
- auch wenn technisch dieselbe Socket-Verbindung genutzt wird.

---

## 3. Verbindungsphasen

## 3.1 Connect
Client baut Socket-Verbindung auf.

## 3.2 Authenticate / Session Attach
Client sendet Session-/Resume-Information.

## 3.3 Subscribe / Sync
Server ermittelt:
- gehört Client zu Room?
- gehört Client zu aktivem Match?
- muss Lobby-, Match- oder Postgame-Zustand projiziert werden?

## 3.4 Live Updates
Danach laufen normale Realtime-Updates und Command-Submissions.

---

## 4. Client -> Server Nachrichtentypen

## 4.1 `client.connect_session`
Zweck:
- bestehende Session an Socket binden
- Resume-Kontext prüfen

### Payload
- `sessionId`
- optional `roomId`
- optional `matchId`
- optional `lastKnownStateVersion`

---

## 4.2 `client.subscribe_room`
Zweck:
- Room-Projektion abonnieren

### Payload
- `roomId`

---

## 4.3 `client.subscribe_match`
Zweck:
- Match-Projektion abonnieren

### Payload
- `matchId`

---

## 4.4 `client.submit_command`
Zweck:
- fachlichen Command an Server senden

### Payload
- `commandId`
- `roomId`
- optional `matchId`
- `commandType`
- `payload`
- optional `clientStateVersion`

### Wichtige Felder
#### `commandId`
Für Idempotenz / Duplicate Detection.

#### `clientStateVersion`
Hilft bei Stale-Command-Diagnose.

---

## 4.5 `client.unsubscribe_room`
## 4.6 `client.unsubscribe_match`
Optional, wenn explizit nötig.

---

## 5. Server -> Client Nachrichtentypen

## 5.1 `server.session_attached`
Bedeutung:
- Session erkannt / wiederhergestellt
- Server kennt den Client jetzt im Kontext einer bestehenden Zugehörigkeit

### Payload
- `sessionId`
- `playerId | null`
- `resumeContext`

---

## 5.2 `server.room_snapshot`
Voller initialer Room-Zustand für den Client.

### Enthält
- `roomId`
- `roomState`
- `roomVersion`
- `playerSummaries`
- `seatStates`
- `hostPlayerId`
- `canStartMatch`
- `postgameSummary | null`

---

## 5.3 `server.room_updated`
Inkrementelles Room-Update.

### Beispiele
- Player joined
- Ready toggled
- Host reassigned
- Match starting
- Match finished -> room_postgame

---

## 5.4 `server.match_snapshot`
Player-spezifische initiale Match-Sicht.

### Enthält
- `matchId`
- `matchState`
- `matchVersion`
- `playerView`

`playerView` enthält nur die für diesen Empfänger erlaubten Daten.

---

## 5.5 `server.match_updated`
Player-spezifisches inkrementelles Match-Update.

### Kann enthalten
- aktualisierte Phase
- aktualisierte Player View
- aktualisierte allowedActions / requiredAction
- Event-Log-Nachträge

---

## 5.6 `server.command_accepted`
Bedeutung:
- Command wurde angenommen und verarbeitet

### Payload
- `commandId`
- `acceptedAtVersion`
- optional `effectsSummary`

---

## 5.7 `server.command_rejected`
Bedeutung:
- Command wurde fachlich oder zustandsseitig abgelehnt

### Payload
- `commandId`
- `reasonCode`
- `message`
- optional `currentRelevantVersion`

---

## 5.8 `server.presence_updated`
Bedeutung:
- Presence-State eines Spielers / Seats geändert

### Beispiele
- connected
- disconnected_grace
- expired

---

## 5.9 `server.lifecycle_transition`
Bedeutung:
- bedeutender Lifecycle-Wechsel

### Beispiele
- room_open_prematch -> room_match_starting
- match_setup -> match_in_progress
- match_in_progress -> match_finished
- room_match_in_progress -> room_postgame

---

## 5.10 `server.reconnect_required` / `server.resync_required`
Bedeutung:
- Client-Kontext ist zu alt oder inkonsistent
- neuer Snapshot nötig

---

## 6. Snapshot vs. Update

## 6.1 Snapshot-Regel
Snapshots werden genutzt:
- beim ersten Subscribe
- beim Resume
- nach Resync
- nach größeren Zustandswechseln, falls Patches unnötig kompliziert wären

## 6.2 Update-Regel
Inkrementelle Updates werden genutzt:
- für normale laufende Realtime-Änderungen
- wenn der Client bereits auf bekannter Version sitzt

---

## 7. Versionsmodell

## 7.1 Empfehlung
Room und Match haben getrennte monotone Versionszähler.

### `roomVersion`
steigt bei jeder room-relevanten Änderung

### `matchVersion`
steigt bei jeder match-relevanten Änderung

## 7.2 Warum
- bessere Stale-Detection
- Room- und Match-Transport entkoppelt
- einfachere Reconnect-Logik

---

## 8. Player-specific Projection

## 8.1 Room-Projektion
Room-Daten sind weitgehend öffentlich für Room-Mitglieder.

## 8.2 Match-Projektion
Match-Daten sind empfängerabhängig.

Server muss pro Empfänger getrennt projizieren:
- öffentliche Board-/Player-Infos
- eigene private Hand / Dev Cards
- eigene requiredAction
- allowedActions

---

## 9. Command Submission Flow

Standardfluss:
1. Client sendet `client.submit_command`
2. Server prüft Idempotenz
3. Server validiert gegen aktuellen State
4. Bei Erfolg:
   - Engine verarbeitet Command
   - State-Version steigt
   - `server.command_accepted`
   - `server.match_updated` / `server.room_updated`
5. Bei Fehler:
   - `server.command_rejected`

---

## 10. Idempotenz

## 10.1 Grundsatz
`commandId` muss pro Client-Intent eindeutig sein.

## 10.2 Verhalten
Wenn derselbe Command erneut eintrifft:
- Server erkennt Duplicate
- keine doppelte Mutation
- bereits bekanntes Result kann wiederverwendet werden

---

## 11. Stale Command Handling

Wenn `clientStateVersion` hinter dem aktuellen Serverstand liegt und der Command deswegen nicht mehr legal bewertbar ist:
- Command ablehnen
- `server.command_rejected`
- optional `server.match_updated` oder `server.resync_required`

---

## 12. Room-spezifische Transportfälle

## 12.1 Join / Leave / Ready
laufen primär über Room-Updates.

## 12.2 Start Match
löst typischerweise nacheinander aus:
- `server.room_updated` oder `server.lifecycle_transition` -> `room_match_starting`
- `server.match_snapshot`
- `server.lifecycle_transition` -> `match_setup` / `room_match_in_progress`

## 12.3 Match End
löst typischerweise aus:
- `server.match_updated` oder finalen Match-Snapshot
- `server.lifecycle_transition` -> `match_finished`
- `server.room_updated` / `server.lifecycle_transition` -> `room_postgame`

---

## 13. Fehler- und Recovery-Verträge

## 13.1 Socket Drop
Nach Reconnect kann Server entweder:
- inkrementell fortsetzen
- oder `server.resync_required` schicken

## 13.2 Unauthorized / Invalid Session
Server sendet klaren Session-Fehler, nicht nur stilles Schließen.

## 13.3 Room Not Found / Match Not Found
Diese Fälle sollen strukturiert und nicht als generische Transportfehler kommuniziert werden.

---

## 14. Mindestfelder für Reason Codes

`server.command_rejected.reasonCode` sollte standardisiert aus kleinem Set kommen, z. B.:
- `not_active_player`
- `invalid_turn_state`
- `forced_resolution_pending`
- `insufficient_resources`
- `illegal_board_target`
- `stale_state`
- `room_not_joinable`
- `all_seats_not_ready`

Block 04 finalisiert noch nicht das komplette Enum, aber die Richtung ist verbindlich.

---

## 15. Empfohlene Trennung im Code

Transportseitig empfohlen:
- `roomSocketGateway`
- `matchSocketGateway`
- `projectionSerializer`
- `commandSubmissionHandler`
- `reconnectSyncHandler`

---

## 16. Kurzform für das Dev-Team
Der wichtigste Transportgrundsatz lautet:
- Clients senden Commands.
- Der Server sendet projektionierte Zustände.
- Room und Match laufen über getrennte Versionen und getrennte Lifecycle-Semantik.