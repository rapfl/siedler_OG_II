# Backlog Structure

## Zweck
Dieses Dokument definiert, wie der Umsetzungs-Backlog für `siedler_OG_II` strukturiert werden soll.

Ziel ist ein Backlog, der:
- entlang der Architektur und Delivery-Roadmap geschnitten ist,
- echte Abhängigkeiten sichtbar macht,
- vertikale Spielbarkeit priorisiert,
- und technische Risiken früh adressiert.

---

## 1. Grundprinzipien

### 1.1 Kein rein screenbasierter Backlog
Das Projekt ist zu state- und regelintensiv für ein Backlog nach dem Muster:
- Landing fertig
- Lobby fertig
- Game Screen fertig

Das würde die eigentlichen Risiken verdecken.

### 1.2 Backlog entlang von Domänen und Vertikalslices
Der Backlog soll beides sichtbar machen:
- **Domänenmodule** wie Engine, Room Lifecycle, Projection, Realtime
- **spielerische Vertikalslices** wie „Room erstellen bis Match Start“

### 1.3 P0 ist Spielbarkeit, nicht Schönheit
P0-Items müssen immer begründen, wie sie zu realer Spielbarkeit beitragen.

---

## 2. Empfohlene Backlog-Ebenen

## 2.1 Epic
Großer fachlicher oder technischer Block.

Beispiele:
- Room and Lobby
- Match Setup
- Core Turn Loop
- Forced States
- Trading and Dev Cards
- Reconnect and Postgame
- Realtime Infrastructure
- QA and Regression

## 2.2 Feature / Capability
Konkreter Teilbereich innerhalb eines Epics.

Beispiele:
- Ready and Start Validation
- Board Seed Generation
- Longest Road Calculation
- Trade Offer Lifecycle
- Session Reattach

## 2.3 Story / Work Item
Umsetzbare Einheit für ein Team oder eine Person.

Beispiele:
- Implement `START_MATCH` guard for all occupied seats ready
- Build player-specific match projection serializer
- Add discard-required derived state

## 2.4 Technical Task / Subtask
Konkrete Engineering-Arbeit.

Beispiele:
- Add roomVersion increment hook
- Write test for robber desert steal case
- Create Drizzle schema for room_players

---

## 3. Empfohlene Epic-Struktur

## Epic A – Foundations and Infra
Enthält:
- Monorepo setup
- Neon DB integration
- shared types
- environment handling
- base runtime structure for web and realtime

## Epic B – Room Lifecycle and Lobby
Enthält:
- create/join room
- ready toggle
- seat/color assignment
- host reassignment
- room lifecycle states

## Epic C – Match Setup and Board
Enthält:
- board template
- seeded generation
- setup state machine
- start resource distribution

## Epic D – Core Turn Loop
Enthält:
- active player progression
- roll flow
- resource distribution
- basic build actions
- turn end

## Epic E – Forced States and Robber
Enthält:
- discard flow
- robber move
- steal flow
- knight integration

## Epic F – Trading and Development Cards
Enthält:
- player trade
- bank/harbor trade
- dev card purchase/play
- title recalculations

## Epic G – Projection, Reconnect and Postgame
Enthält:
- player-specific projections
- reconnect protocol
- postgame lobby
- room continuity after match

## Epic H – QA, Regression and Playtest Ops
Enthält:
- scenario test suite
- regression checklist
- internal playtests
- external friends playtests

---

## 4. Empfohlene Backlog-Tags

Jedes Item sollte mit wenigen, aber aussagekräftigen Tags markiert werden.

## 4.1 Bereichstags
- `frontend`
- `realtime`
- `engine`
- `db`
- `projection`
- `qa`

## 4.2 Risiko-/Relevanztags
- `p0-core`
- `p1-hardening`
- `state-machine`
- `hidden-info`
- `reconnect`
- `playtest-blocker`

## 4.3 Lifecycle-/Flow-Tags
- `entry`
- `lobby`
- `setup`
- `turn-loop`
- `forced-state`
- `trade`
- `dev-card`
- `postgame`

---

## 5. Story-Schnitt-Regeln

## 5.1 Gute Storys
Gute Storys sind:
- testbar
- klar abgrenzbar
- fachlich kohärent
- nicht zu horizontal

### Gute Beispiele
- „As a room host, I can start a match only when all occupied seats are ready.“
- „As an active player, a rolled 7 transitions the match into discard and robber resolution without allowing normal actions.“
- „As a reconnecting player, I receive a fresh player-specific snapshot including requiredAction.“

## 5.2 Schlechte Storys
- „Implement multiplayer“
- „Build UI for everything“
- „Add complete game logic“

---

## 6. Vertical Slice Definitionen

Damit der Backlog nicht in reine Fachsilos zerfällt, sollten mehrere vertikale Slices explizit geführt werden.

## Slice 1 – Room to Lobby Ready
Umfasst:
- create room
- join room
- ready toggle
- host start validation

## Slice 2 – Lobby to First Turn
Umfasst:
- match creation
- board generation
- setup placements
- start resources
- first active player

## Slice 3 – First Playable Match Loop
Umfasst:
- roll
- produce
- build
- end turn
- next active player

## Slice 4 – Full Rules Playability
Umfasst:
- robber
- discard
- trade
- dev cards
- titles
- victory

## Slice 5 – Stable External Playtest
Umfasst:
- reconnect
- stale command handling
- postgame room continuity
- regression suite

---

## 7. Priorisierungssystem

## 7.1 P0
Ohne dieses Item ist der MVP nicht sinnvoll spielbar oder technisch nicht vertrauenswürdig.

## 7.2 P1
Wichtig für stabile Friends-Testrunden, aber nicht zwingend für den ersten internen Durchstich.

## 7.3 P2
Sinnvolle Verbesserung oder Komfort, aber kein MVP-Blocker.

### Beispiele
- P0: discard_pending blocks all normal actions
- P0: player-specific view projection
- P1: better stale command diagnostics
- P2: richer postgame summary

---

## 8. Definition of Ready für Backlog-Items

Ein Item ist ready, wenn:
- fachlicher Bezug zu Dokumenten 00–04 klar ist
- Akzeptanzkriterien vorhanden sind
- Abhängigkeiten bekannt sind
- Testansatz grob beschrieben ist

---

## 9. Definition of Done für Backlog-Items

Ein Item ist done, wenn:
- Implementierung vorhanden ist
- relevante Tests existieren
- keine dokumentierten offenen Regelbrüche verbleiben
- Realtime-/Projection-Auswirkungen mitgedacht wurden, falls relevant
- Eventualzustände / Fehlerfälle berücksichtigt sind

---

## 10. Empfohlene erste Backlog-Reihenfolge

### Welle 1
- Foundations and Infra
- Room Lifecycle and Lobby

### Welle 2
- Match Setup and Board
- Core Turn Loop

### Welle 3
- Forced States and Robber
- Trading and Development Cards

### Welle 4
- Projection, Reconnect and Postgame
- QA, Regression and Playtest Ops

---

## 11. Beispielhafte Top-P0-Items

- Create and join private room
- Ready validation for all occupied seats
- Room state transitions
- Match initialization from room
- Board seed generation
- Setup placements
- Roll and production
- Road/settlement/city legality
- 7 -> discard -> robber flow
- player-specific projections
- Longest Road and Largest Army recalculation
- victory evaluation hooks
- snapshot-first reconnect
- postgame room continuity

---

## 12. Anti-Patterns im Backlog

Vermeiden:
- UI-only Stories ohne Engine-/State-Bezug
- zu große „mega stories“
- reine technische Tasks ohne fachlichen Kontext
- Reconnect / Projection erst am Ende „irgendwie dazunehmen“
- Trade und Dev Cards vor stabilen Forced States priorisieren

---

## 13. Kurzform für das Dev-Team
Der Backlog soll so geschnitten sein, dass:
- technische Risiken früh sichtbar werden,
- vertikale Spielbarkeit schnell erreicht wird,
- und jedes Item klar auf die Specs 00–04 zurückführbar bleibt.