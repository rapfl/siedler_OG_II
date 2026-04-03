# QA and Test Strategy

## Zweck
Dieses Dokument beschreibt die QA- und Teststrategie für den MVP von `siedler_OG_II`.

Es übersetzt die Spezifikationen aus den Blöcken 02–04 in eine konkrete Qualitätslogik für:
- Engine-Tests
- Integrations- und Realtime-Tests
- Playtests
- Regression-Schutz
- Release-Freigaben

---

## 1. Grundprinzipien

### 1.1 Regelkorrektheit vor Schönheitsfehlern
Der größte Qualitätshebel liegt im MVP nicht in Pixelperfektion, sondern in:
- korrekter State Machine
- Hidden-Information-Schutz
- Reconnect-Stabilität
- deterministischen Regelauflösungen

### 1.2 Testpyramide mit Domänenfokus
Die Teststrategie sollte nicht UI-heavy, sondern engine- und zustandsorientiert sein.

Empfohlene Schichtung:
1. Unit-/Rule-Tests
2. Scenario-/Engine-Tests
3. Projection-/Realtime-Tests
4. manuelle Multiplayer-Playtests

### 1.3 Regressionsschutz für die kritischen Regelkerne
Besonders regressionsanfällig sind:
- Setup-Reihenfolge
- 7er-Flow
- Robber / Steal
- Development Cards
- Longest Road
- Largest Army
- Victory Checks
- Reconnect

---

## 2. Testarten

## 2.1 Unit Tests
Für kleine fachliche Funktionen.

Beispiele:
- Distanzregel
- Harbor Access
- Trade Ratio
- visiblePoints / hiddenPoints / totalPoints
- Rejection Reason Mapping

## 2.2 Scenario Tests
Mehrschrittige deterministische Abläufe.

Referenz:
- `docs/03-game-rules/test-scenarios.md`

Diese Tests sind für das Projekt zentral.

## 2.3 Projection Tests
Prüfen, dass verschiedene Spieler unterschiedliche, aber korrekte Sichten auf denselben Full State erhalten.

## 2.4 Realtime Integration Tests
Prüfen:
- Room/Match-Versionen
- Command Acks / Rejections
- Snapshot-/Update-Verhalten
- Reconnect und Resync

## 2.5 Manual Playtests
Echte Multiplayer-Durchläufe mit Menschen.

---

## 3. Testziele nach Ebene

## 3.1 Engine-Ebene
Muss sicherstellen:
- Legality korrekt
- Mutations korrekt
- Derived State korrekt
- Victory korrekt

## 3.2 Projection-Ebene
Muss sicherstellen:
- keine Hidden-Information-Leaks
- allowedActions / requiredAction korrekt
- Room- und Match-Projektion konsistent

## 3.3 Realtime-Ebene
Muss sicherstellen:
- keine Doppelverarbeitung von Commands
- Stale Commands sauber abgelehnt
- Snapshots und Updates logisch konsistent
- Reconnect robust

## 3.4 UX-/Playtest-Ebene
Muss sicherstellen:
- Spieler verstehen, was sie tun sollen
- Forced States werden nicht übersehen
- Lobby und Postgame erzeugen keine Verwirrung

---

## 4. P0-Testabdeckung vor externem MVP-Test

Vor einem externen Friends-Playtest müssen mindestens diese Bereiche stabil sein:

### Room / Lobby
- Create / Join / Ready / Start
- Host-Reassignment vor Match-Start
- Leave vs. Disconnect in Lobby

### Setup
- 3- und 4-Spieler-Setup vollständig
- Distanzregel
- Setup-Road-Adjoining

### Core Turn Loop
- Roll
- Production
- Build Road / Settlement / City
- End Turn

### Forced States
- 7 -> discard -> robber
- Knight -> robber ohne discard
- Forced-State-Blocking

### Dev Cards
- buy / same-turn lock
- max one played per turn
- Monopoly / Year of Plenty / Road Building

### Titles / Victory
- Longest Road
- Largest Army
- hidden VP handling
- turn-start victory

### Transport / Projection
- no hidden-info leaks
- stale command rejection
- snapshot-first reconnect
- reconnect in forced state
- reconnect in postgame

---

## 5. Regression-Buckets

Zur besseren Pflege sollte jede Regression einem klaren Bucket zugeordnet werden.

## 5.1 `setup`
Alles rund um initial placements.

## 5.2 `turn-loop`
Roll, production, build, turn progression.

## 5.3 `forced-state`
Discard, robber, dev-card resolutions.

## 5.4 `titles-victory`
Longest Road, Largest Army, scoring, win checks.

## 5.5 `projection`
player-specific views, allowed actions, required actions.

## 5.6 `reconnect`
session attach, snapshot, stale state, room/match recovery.

## 5.7 `room-lifecycle`
lobby, postgame, ready reset, host reassignment.

---

## 6. Manual Playtest-Stufen

## 6.1 Playtest A – Internal Technical Walkthrough
Teilnehmer:
- Kernteam

Ziel:
- technische Brüche schnell finden
- grobe UX-Verwirrung erkennen

## 6.2 Playtest B – Full Internal Match
Teilnehmer:
- 3–4 interne Testspieler

Ziel:
- vollständige Partie
- Trade, Dev Cards, Robber, Sieg

## 6.3 Playtest C – External Friends MVP
Teilnehmer:
- kleine echte Freundesrunde ohne tägliche Projektkenntnis

Ziel:
- ehrliche Reibung entdecken
- Entry / Lobby / Reconnect / Postgame unter Realbedingungen testen

---

## 7. Playtest-Protokoll

Jeder strukturierte Playtest sollte mindestens erfassen:
- Datum
- Build / Commit / Environment
- Spieleranzahl
- Seed, falls bekannt
- Spiel komplett oder vorzeitig abgebrochen?
- technische Fehler
- Regelirritationen
- UX-Verwirrungen
- Disconnect-/Reconnect-Ereignisse
- Sieger / Siegursache

---

## 8. Manuelle QA-Checklisten

## 8.1 Lobby Checklist
- Room erstellen funktioniert
- Link/Code funktioniert
- Ready in Echtzeit sichtbar
- Start nur wenn alle belegten Seats ready
- Host-Wechsel verständlich

## 8.2 Match Checklist
- Setup komplett
- erster Zug korrekt
- Produktion korrekt
- illegale Builds abgewiesen
- Turn wechselt korrekt

## 8.3 Forced-State Checklist
- 7 sperrt normale Aktionen
- Discard korrekt
- Robber korrekt
- Steal korrekt
- Devcard-Resolutions korrekt

## 8.4 Projection Checklist
- eigene Hand sichtbar
- fremde Hände nicht sichtbar
- VP-Karten nicht geleakt
- allowedActions plausibel

## 8.5 Postgame Checklist
- Sieg klar erklärt
- Match beendet wirklich Interaktionen
- Room bleibt erhalten
- Ready-Reset für neue Partie funktioniert

---

## 9. Release Gates

## Gate 1 – Room/Lobby Gate
Muss bestanden sein, bevor echtes Multiplayer-Setup-Testen sinnvoll ist.

## Gate 2 – First Full Match Gate
Muss bestanden sein, bevor externe Testspieler eingeladen werden.

## Gate 3 – External MVP Gate
Muss bestanden sein, bevor der MVP als „spielbar mit Friends“ gelten kann.

### Kriterien für Gate 3
- vollständige Partien mehrfach erfolgreich gespielt
- keine kritischen Hidden-Info-Leaks
- keine reproduzierbaren Hard-Blocks im Turn Flow
- Reconnect in häufigen Fällen stabil
- Postgame / erneuter Start im selben Room funktioniert

---

## 10. Bugs: Priorisierung

## P0 Bug
Blockiert Spielbarkeit oder zerstört Vertrauen massiv.

Beispiele:
- falsche Ressourcenverteilung
- illegale Actions möglich
- Hidden-Information-Leak
- Match softlocks
- Reconnect zerstört Player Context

## P1 Bug
Spielbar, aber störend oder regelunklar.

Beispiele:
- falsche Event-Log-Darstellung
- missverständliche Fehlermeldung
- inkonsistente Presence-Anzeige

## P2 Bug
Kosmetisch oder Randfall.

---

## 11. Testdaten und Seeds

Empfehlung:
- feste Referenz-Seeds für Regression nutzen
- zusätzlich einige Zufallsseeds für explorative Tests

Wichtig:
- Mindestens ein Seed sollte gezielt gute 7er-/Robber-/Harbor-/Longest-Road-Situationen erzeugen

---

## 12. Telemetrie für QA-Zwecke

Auch ohne große Produktanalytics sollten einige Signale intern mitprotokolliert werden:
- command rejections nach reason code
- reconnect attempts
- resync_required counts
- match aborts
- duration until first full completed match
- turn duration anomalies

Diese Signale helfen, Probleme früh systematisch zu erkennen.

---

## 13. Empfohlene Tooling-Richtung

- Unit + scenario tests in TypeScript-Teststack
- deterministic engine harness
- simulated multiplayer integration tests
- manuelle Playtest-Templates als Markdown oder Sheet

Die konkrete Toolwahl ist offen; wichtiger ist die Testarchitektur.

---

## 14. Done-Kriterien für QA-Sicht

Der MVP ist aus QA-Sicht done, wenn:
- P0-Szenarien aus Block 03 stabil bestehen
- externe Friends-Runden ohne Hard-Block durchspielbar sind
- Reconnect in üblichen Fällen funktioniert
- Postgame und Room-Continuity stabil sind
- Hidden Information nicht leakt

---

## 15. Kurzform für das Dev-Team
Die QA-Strategie ist einfach:
- zuerst Engine und State Machine absichern,
- dann Projection und Reconnect,
- dann echte Multiplayer-Runden,
- und erst danach UI-Feinschliff priorisieren.