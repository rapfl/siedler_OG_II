# MVP Roadmap

## Zweck
Dieses Dokument beschreibt die empfohlene Lieferreihenfolge für den MVP von `siedler_OG_II`.

Es übersetzt die fachlichen und technischen Spezifikationen aus den Blöcken 00–04 in eine realistische Umsetzungslogik für ein Dev-Team.

Der Fokus liegt auf:
- Abhängigkeitsreihenfolge
- risikominimierender Lieferung
- früher Spielbarkeit
- sauberer technischer Basis statt vorschnellem UI-Polish

---

## 1. Delivery-Prinzipien

### 1.1 Frühe vertikale Spielbarkeit vor Feature-Breite
Das Team soll nicht zuerst alle Randfeatures fertigbauen, sondern früh einen kleinen, aber echten End-to-End-Loop erreichen.

### 1.2 Engine vor schöner Oberfläche
Der größte Projektrisiko-Bereich liegt in:
- State Machine
- Rule Engine
- Realtime-Synchronisierung
- Hidden Information

Nicht im visuellen UI.

### 1.3 Reconnect und Postgame nicht zu spät schieben
Diese Themen wirken oft wie Politur, sind aber architektonisch fundamental.

### 1.4 Kein Scope-Creep in MVP+
Features wie:
- Chat
- Spectator
- Counteroffers
- Bots
- Ranked
- zusätzliche Room-Optionen
werden bewusst nicht in den MVP-Kern gezogen.

---

## 2. Zieldefinition des MVP

Der MVP ist erreicht, wenn eine private Gruppe von 3–4 Spielern:
- einen Room erstellen kann,
- per Link / Code beitreten kann,
- eine vollständige Partie des Base Games spielen kann,
- bei kurzem Disconnect stabil weiterspielen kann,
- und nach dem Match im selben Room-Kontext eine neue Partie vorbereiten kann.

---

## 3. Empfohlene Delivery-Phasen

## Phase 0 – Foundations
Ziel:
- technische Basis schaffen
- Monorepo / Projektstruktur setzen
- Datenbank / Realtime / Engine-Schnitt definieren

Liefergegenstände:
- Repo-Struktur für Apps und Packages
- Neon-Anbindung
- Grundgerüst für Webapp und Realtime-Server
- Shared Types
- Room/Match-State-Schemas
- Seed-/Versionierungsgrundlage

Exit-Kriterium:
- Projekt bootet technisch
- Room- und Match-Daten können strukturiert persistiert werden

---

## Phase 1 – Room and Lobby Slice
Ziel:
- Multiplayer-Zugang und Koordination vor Spielstart funktionsfähig machen

In Scope:
- Landing
- Create Room
- Join Room
- Invite Link / Join Code
- Ready Toggle
- Host Start
- Seat-/Color-Autozuweisung plus leichte Host-Korrektur
- Room Lifecycle bis `room_match_starting`

Nicht in Scope:
- Chat
- Spectator
- komplexe Room-Settings

Exit-Kriterium:
- 3–4 Spieler können denselben Room betreten
- Ready-Status funktioniert in Echtzeit
- Match Start wird korrekt validiert

---

## Phase 2 – Board and Setup Slice
Ziel:
- Match kann wirklich starten und Setup korrekt durchlaufen

In Scope:
- Board-Template
- seedbasierte Board-Generierung
- Setup State Machine
- Initial Settlement / Road Placement
- Startressourcen
- erster regulärer Turn

Exit-Kriterium:
- eine Partie kommt reproduzierbar vom Room in den ersten spielbaren Zug

---

## Phase 3 – Core Turn Loop
Ziel:
- reguläre Partie ohne vollständige Feature-Breite, aber mit echtem Turn-Zyklus

In Scope:
- Turn Start
- pre-roll dev window Grundlogik
- Würfeln
- Ressourcenproduktion
- End Turn
- Build: Road, Settlement, City
- Longest Road Grundlogik
- Victory Check Grundlogik

Exit-Kriterium:
- mehrere Züge hintereinander korrekt spielbar
- Build-Regeln stabil

---

## Phase 4 – Robber and Forced States
Ziel:
- kritische State-Machine-Komplexität absichern

In Scope:
- Roll = 7
- Discard Flow
- Robber Move
- Steal
- Knight -> Robber-Flow
- Largest Army
- Forced-State-Blocking

Exit-Kriterium:
- 7er- und Knight-Szenarien stabil
- keine illegalen Ausweichaktionen während Forced States

---

## Phase 5 – Trade and Dev Cards
Ziel:
- volle spielerische Breite des MVP herstellen

In Scope:
- Player-to-player trade an alle
- accept / reject / confirm / cancel
- Bank- und Harbor-Trade
- Buy Dev Card
- Monopoly
- Year of Plenty
- Road Building
- Victory Point Handling

Exit-Kriterium:
- vollständige Base-Game-Partie regelkonform spielbar

---

## Phase 6 – Reconnect, Postgame, Hardening
Ziel:
- Produkt stabil genug für echte externe Friends-Runden machen

In Scope:
- Reconnect-Protokoll
- snapshot-first resync
- player-specific projections nach reconnect
- Postgame-Lobby
- Ready-Reset für neue Partie
- Leave / Exit / Host-Reassignment-Fälle
- Error Handling / stale commands / duplicate commands

Exit-Kriterium:
- Multiplayer-Runden überleben realistische Browser-/Netzwerkprobleme
- nach Match-Ende kann derselbe Room weiterverwendet werden

---

## 4. Release-Kandidaten

## RC-1 – Internal Technical Playtest
Fokus:
- Room / Lobby / Setup / Grundturns

## RC-2 – Full Rules Playtest
Fokus:
- vollständige Partie mit Robber, Trade, Dev Cards

## RC-3 – External Friends MVP
Fokus:
- echte kleine geschlossene Testrunden außerhalb des Kernteams
- Reconnect und Room-Continuity validieren

---

## 5. Abhängigkeiten zwischen Phasen

### Kritische Abhängigkeiten
- Phase 2 hängt auf Room-/Match-Initialisierung aus Phase 1
- Phase 3 hängt auf Board- und Setup-Korrektheit aus Phase 2
- Phase 4 hängt auf stabiler Turn-State-Machine aus Phase 3
- Phase 5 hängt auf stabilen Forced States und Derived State Hooks auf
- Phase 6 hängt auf allen vorherigen Phasen auf

### Wichtige Regel
Reconnect nicht anfangen, bevor Room/Match/Versionierungsmodell stabil ist.

---

## 6. Definition of Done für den MVP

Der MVP ist done, wenn:
- 3–4 Spieler eine vollständige Base-Game-Partie spielen können
- alle Kernregeln aus Block 03 umgesetzt sind
- Commands sauber validiert werden
- Hidden Information korrekt geschützt ist
- Reconnect für kurze Unterbrechungen funktioniert
- Postgame im selben Room-Kontext möglich ist
- kritische Test-Szenarien aus `test-scenarios.md` auf P0-Niveau bestehen

---

## 7. Nicht-Ziele vor MVP-Release

Nicht vor MVP-Release einplanen:
- umfassender UI-Polish
- Mobile-Full-Experience
- Chat
- Spectator
- Bots
- Matchmaking / Ranked
- Analytics-Perfektion
- Monetarisierung / Accounts / Cosmetics

---

## 8. Größte Delivery-Risiken

- Realtime wird zu eng mit UI gekoppelt
- Engine wird zu spät als eigenständiger Kern stabilisiert
- Hidden Information leakt in Match-Updates
- Reconnect wird als Add-on statt als Vertragslogik gebaut
- Trade und Dev Cards werden zu früh UI-first statt state-machine-first implementiert

---

## 9. Empfohlene Team-Arbeitsweise

### Backend / Engine
- Room/Match lifecycle
- Engine / Derived State
- Realtime / Reconnect

### Frontend / UX-Umsetzung
- Entry / Lobby
- Game Screen
- Forced Flows
- Postgame

### QA / Shared
- Szenario-Tests
- Playtest-Protokolle
- Regression-Checklisten

---

## 10. Kurzform für das Dev-Team
Die Roadmap folgt dieser Reihenfolge:
- zuerst Room und Match tragfähig machen,
- dann Setup und Grundturns,
- dann Forced States und Regelnbreite,
- dann Reconnect und Postgame härten.

Erst danach lohnt sich tieferer UI-Polish.