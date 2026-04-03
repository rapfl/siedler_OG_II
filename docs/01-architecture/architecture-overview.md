# Architecture Overview – Siedler Online MVP

## 1. Zielarchitektur
Die App besteht aus drei klar getrennten Schichten:

1. **Web-Frontend auf Vercel**
2. **Serverautoritativem Realtime-Game-Server**
3. **Neon Postgres als persistenter Datenbank-Layer**

Diese Trennung ist für ein Multiplayer-Spiel zentral. Vercel eignet sich sehr gut für die Webapp und API-Endpunkte mit kurzer Laufzeit, ist aber nicht der richtige Ort für langlebige, zustandsbehaftete WebSocket-Game-Loops.

---

## 2. Technischer Ziel-Stack

### Frontend
- Next.js
- TypeScript
- React
- Tailwind CSS
- optional shadcn/ui für UI-Primitives

### Backend / Realtime
- Node.js / TypeScript
- separater Realtime-Service mit WebSocket-Verbindungen
- serverautoritative Game Engine
- command/event-basierter Spielfluss

### Datenbank
- Neon Postgres
- persistente Ablage von Rooms, Sessions, Matches, Snapshots, Events und Meta-Daten

### Infra
- Vercel für Webapp
- separater Hosting-Provider für Realtime-Server, z. B. Fly.io, Railway oder vergleichbar
- Neon als gemanagte Postgres-Instanz

---

## 3. Warum Neon hier sinnvoll ist
Neon passt gut zum Projekt, weil:
- Postgres für Spielzustand, Event-Logs und relationale Daten sehr gut geeignet ist
- die Entwicklungs- und Preview-Story gut zu einem modernen Webstack passt
- Branching und isolierte Datenbankumgebungen für Staging/Preview hilfreich sein können
- sich Neon gut mit TypeScript-ORMs wie Drizzle oder Prisma kombinieren lässt

### Empfehlung
- **DB:** Neon Postgres
- **ORM:** Drizzle
- **Migrations:** Drizzle Kit

Drizzle ist hier attraktiv, weil das Projekt voraussichtlich stark typisiert, zustandsorientiert und domänennah modelliert wird.

---

## 4. Kernprinzipien der Architektur

### 4.1 Server ist Source of Truth
Der Client darf nie den offiziellen Spielzustand definieren.

Der Client:
- rendert UI
- sendet Commands
- zeigt nur vom Server bestätigte Zustände an

Der Server:
- validiert Regeln
- würfelt serverseitig
- erzeugt Events
- aktualisiert State
- broadcastet offiziellen State an alle Clients

### 4.2 Deterministische Game Engine
Die Regeln-Engine soll unabhängig vom Webframework testbar sein.

Ziel:
- pure domain logic
- Commands rein
- validierter neuer State + Events raus
- reproduzierbare Spiele via Seed

### 4.3 Trennung von Produktlogik und Infrastruktur
Es soll drei getrennte Ebenen geben:
- **UI Layer**
- **Application / Transport Layer**
- **Domain / Rules Engine**

So bleibt die Game-Logik unabhängig von React, Socket-Implementierung und Datenbankdetails.

---

## 5. High-Level-Systembild

```md
Browser Client (Next.js auf Vercel)
  -> HTTPS für initiale Room-/Session-Endpunkte
  -> WebSocket für Realtime Match Updates

Realtime Game Server
  -> Command Intake
  -> Rule Validation
  -> Event Emission
  -> Broadcast an Room / Match Channel
  -> Persistenz in Neon

Neon Postgres
  -> rooms
  -> room_players
  -> matches
  -> match_players
  -> game_snapshots
  -> game_events
```

---

## 6. Verantwortlichkeiten pro Schicht

## 6.1 Frontend
Verantwortlich für:
- Landing / Lobby / Ingame UI
- lokale UI-States
- Rendern des Boards
- Auswahl- und Preview-Interaktionen
- Session-Wiederaufnahme auf Client-Seite

Nicht verantwortlich für:
- Regelvalidierung
- RNG
- endgültige Resource Counts
- Hidden Information als Source of Truth

## 6.2 Realtime-Game-Server
Verantwortlich für:
- Room Presence
- Match Lifecycle
- Spiellogik und Phasensteuerung
- Validierung aller Commands
- Event-Erzeugung
- Conflict Resolution
- Reconnect Handling
- Persistenz relevanter Zustände in Neon

## 6.3 Neon Postgres
Verantwortlich für:
- dauerhafte Speicherung von Metadaten und Spielverlauf
- Rebuild / Resume via Snapshots + Event-Tail
- Debugging und spätere Replay-Fähigkeit
- Analyse von Spielverläufen

---

## 7. Persistenzstrategie

## 7.1 Was persistiert wird
### Rooms
- room id
- code
- status
- created_at
- host player

### Room Players
- player session
- display name
- seat
- ready state
- connected/disconnected info

### Matches
- match id
- seed
- started_at / finished_at
- status
- winner

### Game Snapshots
- versionierter Spielzustand
- zur schnellen Wiederaufnahme

### Game Events
- sequenzielle Domain-Events
- vollständige Historie des Spiels

## 7.2 Empfohlener Ansatz
Nicht jeden UI-Klick persistieren, sondern:
- wichtige Commands verarbeiten
- Domain-Events speichern
- periodisch oder bei kritischen Punkten Snapshots schreiben

Beispiel:
- bei Match Start
- nach Setup Phase
- alle X Events
- bei Turn-Ende
- bei Finish

---

## 8. Realtime-Modell

## 8.1 Channels
Empfohlen:
- ein Room-Channel für Lobby-Presence
- ein Match-Channel für das laufende Spiel

## 8.2 Nachrichten-Typen
### Client -> Server
- create_room
- join_room
- toggle_ready
- start_match
- submit_command
- reconnect_session

### Server -> Client
- room_state_updated
- match_started
- game_state_patch
- event_log_entry
- command_rejected
- reconnect_successful
- match_finished

## 8.3 Prinzip
Der Client sendet keine direkten State-Änderungen, sondern immer nur Intents / Commands.

---

## 9. Reconnect-Strategie

## 9.1 MVP-Ziel
Bei kurzem Disconnect oder Refresh soll ein Spieler sauber in seine laufende Partie zurückkehren können.

## 9.2 Mechanik
- temporäre Session-ID im Cookie oder Local Storage
- Room-/Match-Zuordnung serverseitig gespeichert
- bei Reconnect bekommt der Client:
  - aktuellen Snapshot
  - ausstehende Events seit Snapshot
  - aktuelle Presence-Information

## 9.3 Nicht-Ziel im MVP
Kein beliebig langes asynchrones Wiederaufnehmen über Tage hinweg.

---

## 10. Sicherheits- und Integritätsprinzipien

### Niemals client-trusted:
- Würfelergebnis
- Resource Counts
- Development Card Draw
- Longest Road Berechnung
- Largest Army Berechnung
- Win Condition

### Immer serverseitig:
- RNG
- Legal Move Check
- Card Transfer
- Forced Discard
- Steal Resolution

---

## 11. Empfohlene Repo-Struktur

```md
/docs
  /00-product
    produkt-spezifikation.md
  /01-architecture
    architecture-overview.md
  /02-ux
  /03-game-rules
  /04-api
  /05-delivery

/apps
  /web
  /realtime

/packages
  /game-engine
  /shared-types
  /ui

/infrastructure
  /db
  /migrations
```

Diese Struktur trennt Spezifikation, Apps und wiederverwendbare Domain-Pakete sauber.

---

## 12. Entscheidungsempfehlungen

### Empfehlung A – Architektur
- **Frontend:** Next.js auf Vercel
- **Realtime:** separater WebSocket-Server
- **DB:** Neon Postgres
- **ORM:** Drizzle

### Empfehlung B – Entwicklungslogik
- shared TypeScript types zwischen web, realtime und engine
- Game Engine als eigenständiges Package
- Event-Sourcing light: Events + Snapshots

### Empfehlung C – MVP-Scope
- private rooms
- guest sessions
- 4 players first
- no bots
- no ranked
- no counteroffers

---

## 13. Risiken
- zu viel Logik im Frontend
- Realtime-Server und Game Engine nicht sauber getrennt
- Persistenz zu spät mitgedacht
- Event-Modell nicht stabil genug für Reconnect
- Hidden Information wird versehentlich an alle Clients geleakt

---

## 14. Nächste technische Dokumente
Als Nächstes sollten diese Markdown-Dateien folgen:

1. `docs/02-ux/screen-spec.md`
2. `docs/03-game-rules/state-machine.md`
3. `docs/03-game-rules/board-model.md`
4. `docs/04-api/socket-contracts.md`
5. `docs/04-api/domain-commands-events.md`
6. `docs/05-delivery/mvp-roadmap.md`
