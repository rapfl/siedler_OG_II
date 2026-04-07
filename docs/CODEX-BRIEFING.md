# Codex Briefing

## Zweck
Dieses Dokument ist das operative Arbeitsbriefing für Codex.

Es ist so formuliert, dass Codex die Spezifikationen nicht nur liest, sondern die Arbeit entlang einer klaren Prioritätslogik umsetzt.

Es ergänzt:
- `docs/START-HERE.md`
- `docs/CODEX-READINESS-REVIEW.md`
- `docs/CODEX-HANDOFF.md`

---

## 1. Deine Rolle

Du arbeitest als umsetzungsorientierter Engineering-Agent für `siedler_OG_II`.

Dein Auftrag ist nicht, die Spezifikation neu zu schreiben, sondern sie:
- korrekt zu lesen,
- in eine tragfähige Codebasis zu übersetzen,
- Abhängigkeiten sauber aufzulösen,
- und den MVP in sinnvoller Reihenfolge voranzubringen.

Du arbeitest entlang der bestehenden Entscheidungen. Du führst keine stillen Produkt-Richtungswechsel ein.

---

## 2. Startreihenfolge

Lies zuerst und behandle als verbindlich:
1. `docs/START-HERE.md`
2. `docs/CODEX-READINESS-REVIEW.md`
3. `docs/CODEX-HANDOFF.md`
4. `docs/00-product/README.md`
5. `docs/00-product/produkt-spezifikation-reviewed.md`
6. `docs/02-ux/decision-register.md`
7. danach die restlichen Dateien gemäß `docs/START-HERE.md`

Wenn du eine Dateireihenfolge abkürzen musst, priorisiere:
- reviewed Produktgrundlage
- Decision Register
- State Machine
- Rule Engine
- Socket Contracts
- Roadmap

---

## 3. Arbeitsmodus

Arbeite wie ein gezielter Umsetzungs-Agent.

Das bedeutet:
- arbeite entlang der Delivery-Roadmap,
- bearbeite die konkret angefragte oder naheliegend priorisierte Aufgabe,
- hinterlasse einen saubereren, testbareren Stand,
- und bewege das Projekt vom Fundament zur Spielbarkeit, nicht umgekehrt.

### Konkrete Regel
Wenn mehrere sinnvolle Aufgaben offen sind, priorisiere die Aufgabe,
- die die meisten nachgelagerten Arbeiten unblockt,
- das meiste technische Risiko reduziert,
- und die Spezifikationen 00–05 am direktesten operationalisiert.

---

## 4. Verbindliche Produktentscheidungen

Diese Entscheidungen gelten als fix und dürfen nicht ohne explizite Rücksprung-Entscheidung verändert werden:
- 3–4 Spieler im MVP, Default 4
- alle belegten Seats müssen ready sein
- Auto-Zuweisung mit leichter Host-Korrektur für Seat/Farbe
- semi-automatisches Resume
- Trades im MVP an alle anderen Spieler, keine Counteroffers
- Postgame im selben Room-Kontext
- Leave ist nicht Disconnect
- keine globalen Full-State-Broadcasts
- player-specific projections
- Chat nicht im initialen MVP-Kern

Referenz:
- `docs/02-ux/decision-register.md`

---

## 5. Was du nicht neu entscheiden sollst

Triff keine stillschweigenden Richtungsentscheidungen zu:
- Room vs. Match als ein gemeinsamer Zustand
- optionaler Ready-Start trotz nicht-ready belegter Seats
- gezielter Trade-Adressierung statt Broadcast-Trade
- Counteroffers im MVP
- Reconnect ohne snapshot-first Grundmodell
- Behandlung von Disconnect wie bewusster Austritt
- Vereinfachung der Hidden-Information-Projektion zu globalen Match-States
- Entfernung der Postgame-Lobby zugunsten eines kompletten Neustarts

Wenn du an solchen Punkten ankommst, halte die bestehende Spezifikation ein.

---

## 6. Implementierungsreihenfolge

Arbeite in dieser Reihenfolge:

### Phase 1 – Foundations
- Repo-/App-Struktur
- shared types
- State-Schemas
- Neon-Anbindung
- Grundgerüst Web + Realtime

### Phase 2 – Room and Lobby
- Create / Join Room
- Ready Toggle
- Host Start Validation
- Seat-/Color-Handling
- Room Lifecycle bis Match Start

### Phase 3 – Board and Setup
- Board Template
- Seeded Generation
- Setup State Machine
- Startressourcen

### Phase 4 – Core Turn Loop
- Turn Start
- Roll
- Produktion
- Build Road / Settlement / City
- End Turn

### Phase 5 – Forced States
- 7 -> discard -> robber
- Knight -> robber
- Forced-State-Blocking
- Longest Road / Largest Army Recalc Hooks

### Phase 6 – Trading and Dev Cards
- Player Trade
- Bank/Hafen-Trade
- Dev Card Buy/Play
- Monopoly / Year of Plenty / Road Building / VP Handling

### Phase 7 – Reconnect and Postgame
- snapshot-first reconnect
- player-specific recovery
- postgame lobby
- room continuity
- leave / disconnect / host reassignment hardening

Referenz:
- `docs/05-delivery/mvp-roadmap.md`

---

## 7. Definition von gutem Fortschritt

Guter Fortschritt bedeutet nicht „viele Dateien verändert“, sondern:
- klarere tragfähige Architektur
- höhere Testbarkeit
- mehr echte End-to-End-Spielbarkeit
- weniger implizite Logik
- stabilere Rule Engine und Realtime-Semantik

Wenn du zwischen UI-Polish und Regellogik entscheiden musst, priorisiere immer:
- State Machine
- Rule Engine
- Projection
- Reconnect
- Testbarkeit

---

## 8. Tests sind Teil der Arbeit, nicht Nacharbeit

Sobald du einen Kernbereich implementierst, ziehe die relevanten Tests mit:
- Unit Tests für Hilfslogik
- Scenario Tests für Spielabläufe
- Projection Tests für Hidden Information
- Integration Tests für Realtime und Reconnect

Referenz:
- `docs/03-game-rules/test-scenarios.md`
- `docs/05-delivery/qa-test-strategy.md`

### Harte Regel
Implementiere keinen größeren Regelblock ohne zugehörige Testabdeckung für dessen kritische Pfade.

---

## 9. Umgang mit Spezifikationswidersprüchen

Wenn du einen scheinbaren Widerspruch findest, nutze diese Priorität:
1. `docs/START-HERE.md`
2. `docs/02-ux/decision-register.md`
3. spätere technische Spezifikationen vor früheren groben Spezifikationen
4. reviewed Produktdatei vor historischer Erstfassung
5. State Machine / Rule Engine / API vor impliziten UX-Interpretationen

Wenn eine alte Datei einer neueren reviewed oder technischen Datei widerspricht, gilt immer die neuere technische bzw. reviewed Quelle.

---

## 10. Praktische Arbeitsregel für zusammenhängendes Abarbeiten

Wenn du einen Block bearbeitest, arbeite innerhalb dieses Blocks in dieser Mikro-Reihenfolge:
1. Datenmodell / Typen
2. State-Übergänge
3. Validierungslogik
4. Mutation / Derived State
5. Projektion / Transport
6. Tests
7. erst dann UX-nahe oder UI-nahe Oberflächenanbindung

So vermeidest du, dass die Oberfläche schneller wächst als die Spiellogik.

---

## 11. Erste sinnvolle Outputs

Wenn du bei null mit der Implementierung startest, sind diese Outputs als Erstes sinnvoll:
- konkrete Monorepo-Struktur
- `apps/web` und `apps/realtime`
- `packages/shared-types`
- `packages/game-engine`
- Basistypen für Room, Match, PlayerView
- Room-/Match-Lifecycle-Schemas
- erste vertikale Slice-Implementierung: Create/Join/Ready/Start
- P0-Tests dafür

---

## 12. Arbeitsstil

Arbeite so, dass dein Output:
- inkrementell integrierbar ist,
- keine stillen Produktentscheidungen versteckt,
- klar begründbar auf Specs 00–05 zurückgeht,
- und jeweils einen robusteren Zwischenstand hinterlässt.

Vermeide:
- große unscharfe Umbauten ohne Rückbindung an die Specs
- UI-first-Implementierung bei ungelöster Regelbasis
- Transportdesign ohne Projection-Konzept
- Room-/Match-Vermischung

---

## 13. Endziel

Das Ziel ist ein MVP, bei dem eine kleine private Gruppe:
- einen Room erstellt,
- gemeinsam beitritt,
- eine vollständige Partie regelkonform spielt,
- kurze Disconnects überlebt,
- und danach im selben Room eine neue Partie vorbereiten kann.

Alles, was diesem Ziel nicht direkt dient, ist nachrangig.
