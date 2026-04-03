# Codex Handoff

## Zweck
Dieses Dokument ist das operative Übergabedokument für Codex.

Es sagt Codex:
- welche Dateien kanonisch sind,
- in welcher Reihenfolge gelesen werden soll,
- welche Entscheidungen als fix gelten,
- was implementiert werden soll,
- und was ausdrücklich **nicht** stillschweigend neu entschieden werden darf.

---

## 1. Startpunkt

Lies zuerst:
1. `docs/START-HERE.md`
2. `docs/CODEX-READINESS-REVIEW.md`
3. `docs/00-product/README.md`
4. `docs/00-product/produkt-spezifikation-reviewed.md`

Danach entlang der in `docs/START-HERE.md` definierten Reihenfolge weiterlesen.

---

## 2. Kanonische Produkt- und Systemannahmen

Für die Implementierung gelten als verbindlich:
- reviewed Produktspezifikation statt historischer Erstfassung
- Room und Match sind getrennte Konzepte
- Postgame verbleibt im selben Room-Kontext
- Leave ist nicht Disconnect
- kein globaler Full-State-Broadcast an Clients
- serverautoritatives Regelmodell
- player-specific projections
- 3–4 Spieler im MVP, Default 4
- alle belegten Seats müssen ready sein
- Trades gehen im MVP an alle anderen Spieler, keine Counteroffers
- Chat ist nicht Teil des initialen MVP-Kerns

Die gebündelten verbindlichen Entscheidungen stehen in:
- `docs/02-ux/decision-register.md`

---

## 3. Was implementiert werden soll

Codex soll auf Basis der bestehenden Spezifikationen den MVP technisch vorbereiten bzw. bauen.

Die Spezifikationen decken bereits ab:
- Produktziel und Scope
- UX-Logik
- Room/Match/Turn-State-Machines
- Board-Modell
- Rule Engine
- Derived State
- Test-Szenarien
- Socket-/Reconnect-Verträge
- Delivery-/Backlog-/QA-Logik

Das reicht für:
- Repo-/App-Struktur
- Engine-Basis
- Realtime-Basis
- erste vertikale Slices

---

## 4. Empfohlene Umsetzungsreihenfolge für Codex

Arbeite entlang von:
- `docs/05-delivery/mvp-roadmap.md`
- `docs/05-delivery/backlog-structure.md`
- `docs/05-delivery/qa-test-strategy.md`

Kurzform:
1. Foundations / shared types / repo structure
2. Room + Lobby
3. Board + Setup
4. Core Turn Loop
5. Forced States
6. Trading + Dev Cards
7. Reconnect + Postgame + Hardening

---

## 5. Dateien mit besonderer Verbindlichkeit

### Für Produkt- und Scope-Entscheidungen
- `docs/00-product/produkt-spezifikation-reviewed.md`
- `docs/02-ux/decision-register.md`

### Für Lebenszyklus- und Zustandslogik
- `docs/02-ux/room-lifecycle.md`
- `docs/02-ux/leave-and-exit-flows.md`
- `docs/03-game-rules/state-machine.md`

### Für Spiellogik
- `docs/03-game-rules/board-model.md`
- `docs/03-game-rules/rule-engine.md`
- `docs/03-game-rules/derived-state.md`

### Für Transport und Projektion
- `docs/04-api/socket-contracts.md`
- `docs/04-api/domain-commands-events.md`
- `docs/04-api/reconnect-protocol.md`

### Für Test- und Delivery-Prioritäten
- `docs/03-game-rules/test-scenarios.md`
- `docs/05-delivery/mvp-roadmap.md`
- `docs/05-delivery/qa-test-strategy.md`

---

## 6. Was Codex nicht neu entscheiden soll

Codex soll ohne expliziten Rücksprung in die Spezifikation nicht eigenständig neu festlegen:
- dass ein Match einen neuen Room erzeugt
- dass Ready nur optional ist
- dass 4 Spieler der einzige MVP-Fall sind
- dass gezielte Trades statt Broadcast-Trades verwendet werden
- dass Counteroffers im MVP enthalten sind
- dass Disconnect wie Leave behandelt wird
- dass Clients globale Full States erhalten
- dass VP-Karten / gegnerische Hände offen modelliert werden
- dass Reconnect nicht snapshot-first gedacht ist

---

## 7. Prioritätsregel bei Widersprüchen

Wenn Codex vermeintliche Widersprüche sieht, gilt diese Reihenfolge:
1. `docs/START-HERE.md`
2. `docs/02-ux/decision-register.md`
3. spätere technische Spezifikationen vor früheren groben Spezifikationen
4. reviewed Produktdatei vor historischer Erstfassung
5. State Machine / Rule Engine / API vor impliziten UX-Interpretationen

---

## 8. Historische Dateien

Folgende Datei ist historisch und nicht mehr primär:
- `docs/00-product/produkt-spezifikation.md`

Sie darf für Kontext gelesen werden, aber nicht als führende Quelle für neue Implementierungsentscheidungen.

---

## 9. Empfohlene Deliverables von Codex als nächster Schritt

Sinnvolle erste konkrete Outputs von Codex wären:
- konkrete Monorepo-/Ordnerstruktur
- Shared TypeScript Types
- Basis-State-Schemas für Room, Match, PlayerView
- Engine-Skeleton
- Realtime-Server-Skeleton
- erste vertikale Slice-Implementierung: Create/Join/Ready/Start
- zugehörige P0-Tests

---

## 10. Übergabezustand

Die Spezifikationsphase ist für diesen MVP-Scope ausreichend abgeschlossen.

Codex übernimmt auf einer Basis, die bereits enthält:
- Produkt
- Architektur
- UX
- Regeln
- API
- Delivery

Die nächste Lücke ist **nicht** fehlende Konzeption, sondern tatsächliche Umsetzung.

---

## 11. Kurzform

Codex soll:
- die reviewed und kanonischen Dateien als Quelle verwenden,
- entlang der Roadmap implementieren,
- keine stillen Produktentscheidungen neu einführen,
- und zuerst Room/Match/Engine/Realtimelogik tragfähig machen, bevor UI-Polish priorisiert wird.