# Review Block 03 – Game Rules

## Zweck
Dieses Dokument bewertet `docs/03-game-rules` als zusammenhängenden technischen Regelblock.

Geprüft werden:
1. interne Konsistenz
2. Anschlussfähigkeit an Block 02
3. Implementierbarkeit
4. verbleibende Unschärfen vor Block 04
5. konkrete Empfehlungen für die API-/Socket-Spezifikation

---

## 1. Bewertete Dateien

- `state-machine.md`
- `board-model.md`
- `rule-engine.md`
- `derived-state.md`
- `test-scenarios.md`

---

## 2. Gesamtfazit

### 2.1 Kurzurteil
Block 03 ist **stark, zusammenhängend und ausreichend präzise**, um als Grundlage für Block 04 zu dienen.

Er schafft eine belastbare fachliche Kette:
- UX-Zustände aus Block 02
- -> formale State Machine
- -> Board als Regelgraph
- -> Rule Engine
- -> Derived State
- -> Test-Szenarien

### 2.2 Qualitätseinschätzung
Block 03 ist aktuell besonders stark in:
- State-Trennung
- Room-vs-Match-Modell
- Forced-Resolution-Denke
- Derived-State-Logik
- testorientierter Struktur

### 2.3 Freigabestatus
Empfehlung:
- **freigeben für Block 04**
- kein größerer Umbau nötig

---

## 3. Interne Konsistenz

## 3.1 Stärken
Die Dateien greifen gut ineinander:

### `state-machine.md`
- definiert die Zustandsräume sauber
- trennt Room, Match, Turn und Resolution sinnvoll

### `board-model.md`
- liefert das nötige Regelgraph-Modell
- ist konsistent mit Build-, Harbor-, Robber- und Longest-Road-Logik

### `rule-engine.md`
- folgt der State Machine logisch
- bezieht sich korrekt auf Board und Derived State

### `derived-state.md`
- ergänzt die Engine dort, wo UX und Transport eine Projektion brauchen
- schließt die Lücke zu Visibility und späteren Socket Payloads

### `test-scenarios.md`
- deckt die sensiblen Bereiche der übrigen Dokumente gut ab

## 3.2 Keine harten Widersprüche
Es gibt aktuell **keine gravierenden internen Widersprüche**.

Insbesondere konsistent sind:
- Room-Match-Trennung
- Postgame-Rückkehr in denselben Room
- Ready-Bedingung vor Match Start
- 3–4 Spieler, Default 4
- max. 1 gespielte Dev Card pro Zug
- same-turn buy/play-Sperre
- Forced-State-Exklusivität

---

## 4. Anschlussfähigkeit an Block 02

## 4.1 Sehr guter Fit
Block 03 übersetzt die UX-Annahmen aus Block 02 sauber in formale Regelstrukturen.

Besonders gut übernommen wurden:
- Postgame-Lobby als echter Zustand
- Leave ≠ Disconnect
- semi-automatisches Resume
- all seats ready als Startbedingung
- Trade an alle, keine Counteroffers
- Room-Kontinuität über einzelne Matches hinaus

## 4.2 Positive Wirkung
Die Gefahr, dass Block 03 heimlich Produktentscheidungen neu trifft, wurde weitgehend vermieden.

Das ist wichtig, weil die Review von Block 02 genau dieses Risiko identifiziert hatte.

---

## 5. Implementierbarkeit

## 5.1 Stark implementierungsnah
Block 03 ist bereits nah genug an einer umsetzbaren Architektur, weil:
- Zustände explizit sind,
- Validierungslogik klar strukturiert ist,
- Derived State sauber getrennt ist,
- und Test-Szenarien konkrete Prüfpfade vorgeben.

## 5.2 Besonders hilfreich für ein Dev-Team
- klare Recalculation Hooks
- standardisierbare Rejection Reasons
- Full State vs. Player View Trennung
- feste Board-Objekte mit stabilen IDs

---

## 6. Verbleibende Unschärfen

Diese Punkte sind **keine Blocker**, sollten aber in Block 04 bewusst sauber modelliert werden.

## 6.1 Trade-Finalisierung als mehrstufiger Ablauf
`rule-engine.md` beschreibt korrekt:
- Angebot offen
- Responses sammeln
- aktiver Spieler bestätigt final

Für Block 04 muss aber noch präzise entschieden werden, ob der finale Abschluss als:
- separater Command,
- oder als spezielle Form von `RESPOND_TRADE`
modelliert wird.

Empfehlung:
- separater Finalisierungs-Command für Klarheit und Idempotenz.

## 6.2 Robber Pending mit zwei Unterphasen
In Block 03 ist inhaltlich klar:
- Move
- ggf. Steal

Für Block 04 sollte das expliziter als zwei transportierbare Substates erscheinen:
- `robber_select_hex`
- `robber_select_victim`

Das erhöht Reconnect- und UI-Klarheit.

## 6.3 Development-Card-Resolution Commands
Die Resolution States sind sauber, aber die genaue Form der Commands für:
- Year of Plenty picks
- Monopoly pick
- Road Building placements
muss in Block 04 noch finalisiert werden.

## 6.4 Bank-Limit-Modell
`board-model.md` lässt die Bank konzeptionell unbegrenzt oder ausreichend modelliert.

Das ist für MVP pragmatisch.

Wichtig:
- Block 04 sollte diese Annahme explizit übernehmen,
- damit später keine stillschweigende halbe Bank-Logik entsteht.

## 6.5 Match-Abbruch
`match_aborted` existiert korrekt, ist aber bewusst wenig ausmodelliert.

Für Block 04 reicht das, solange klar bleibt:
- regulärer Sieg != technischer Abbruch
- API / Socket brauchen unterschiedliche Abschlussgründe

---

## 7. Spezifische Stärken des Blocks

## 7.1 Room / Match Separation
Das ist eine der stärksten Entscheidungen im gesamten Spezifikationssatz.

## 7.2 Derived State als eigener Block
Das verhindert viele spätere API- und UI-Probleme.

## 7.3 Test-Szenarien bereits vor API-Design
Das ist ungewöhnlich hilfreich, weil so Block 04 nicht losgelöst von fachlicher Prüfrealität entsteht.

## 7.4 Victory Hooks
Dass Sieg nicht nur am Turn-Ende geprüft wird, ist sauber und wichtig.

---

## 8. Empfehlungen für Block 04

## 8.1 Block 04 sollte auf drei Ebenen strukturiert werden

### A. Transport / Socket Layer
- connect
- subscribe
- state sync
- command submit
- server push

### B. Command / Event Semantik
- Commands vom Client
- Events / state updates vom Server
- Rejection- und recovery-Semantik

### C. Reconnect / Projection Layer
- Snapshot + event tail oder snapshot-first sync
- player-specific views
- stale command handling

## 8.2 Wichtige Anforderungen an Block 04
- keine globalen Full-State-Broadcasts
- player-specific projections ausdrücklich modellieren
- Rejection Reasons standardisieren
- idempotency / stale command thinking berücksichtigen
- Room- und Match-Lifecycle auch im Transport trennen

---

## 9. Was vor Block 04 **nicht** mehr nötig ist
- kein weiterer Rewrite von Block 03
- keine zusätzliche UX-Schärfung
- keine neue Regelrecherche

---

## 10. Abschlussbewertung

### Freigabeurteil
**Block 03 ist freigegeben für Block 04.**

### Restaufgabe
Die noch offenen Punkte sind jetzt primär:
- Contract-Design
- Payload-Semantik
- Reconnect-/Projection-Details

Also genau das, was Block 04 leisten soll.