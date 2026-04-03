# START HERE

## Zweck
Dieses Dokument ist der aktuelle Einstiegspunkt für Menschen und Codex.

Es ersetzt nicht die bestehenden Fachdokumente, bündelt aber:
- die empfohlene Lesereihenfolge,
- die kanonischen Dateien,
- und die wichtigsten Arbeitsregeln für die Umsetzung.

---

## 1. Empfohlene Lesereihenfolge

### 1. Produkt und Architektur
1. `00-product/produkt-spezifikation-reviewed.md`
2. `01-architecture/architecture-overview.md`
3. `01-architecture/game-state-visibility-and-rules-constraints.md`

### 2. UX
4. `02-ux/screen-spec.md`
5. `02-ux/decision-register.md`
6. `02-ux/entry-flows.md`
7. `02-ux/lobby-screen.md`
8. `02-ux/game-screen.md`
9. `02-ux/modal-flows.md`
10. `02-ux/endgame-and-rematch.md`
11. `02-ux/room-lifecycle.md`
12. `02-ux/leave-and-exit-flows.md`
13. `02-ux/review-block-02.md`

### 3. Regeln und Engine
14. `03-game-rules/state-machine.md`
15. `03-game-rules/board-model.md`
16. `03-game-rules/rule-engine.md`
17. `03-game-rules/derived-state.md`
18. `03-game-rules/test-scenarios.md`
19. `03-game-rules/review-block-03.md`

### 4. API / Realtime
20. `04-api/socket-contracts.md`
21. `04-api/domain-commands-events.md`
22. `04-api/reconnect-protocol.md`

### 5. Delivery
23. `05-delivery/mvp-roadmap.md`
24. `05-delivery/backlog-structure.md`
25. `05-delivery/qa-test-strategy.md`

---

## 2. Kanonische Arbeitsregeln

### 2.1 Produktgrundlage
Die kanonische Produktdatei ist:
- `00-product/produkt-spezifikation-reviewed.md`

Die Datei `00-product/produkt-spezifikation.md` bleibt nur als historische Erstfassung im Repo.

### 2.2 Room und Match sind getrennt
Die gesamte Umsetzung muss die Trennung zwischen:
- Room Lifecycle
- Match Lifecycle
- Turn / Resolution State
beibehalten.

### 2.3 Keine globalen Full-State-Broadcasts
Clients bekommen projektionierte Zustände, keine unkritisch globalen Vollzustände.

### 2.4 Leave ist nicht Disconnect
Expliziter Austritt und technischer Verbindungsverlust müssen in Logik und UX getrennt bleiben.

### 2.5 Postgame bleibt im selben Room-Kontext
Nach Match-Ende geht die Gruppe in den Room-Postgame-Zustand zurück und nicht in einen komplett neuen Produktfluss.

---

## 3. Was bereits entschieden ist
Die wichtigsten verbindlichen Entscheidungen stehen in:
- `02-ux/decision-register.md`

Dazu gehören u. a.:
- 3–4 Spieler, Default 4
- alle belegten Seats müssen ready sein
- Auto-Zuweisung plus leichte Host-Korrektur
- semi-automatisches Resume
- Trades an alle, keine Counteroffers
- Postgame im selben Room-Kontext

---

## 4. Was Codex nicht neu entscheiden soll
Codex soll **nicht** ohne Rücksprung in die Spezifikation neu entscheiden:
- ob Ready eine harte Startbedingung ist
- wie Trade-Adressierung funktioniert
- ob Room und Match zusammenfallen
- wie Reconnect grundsätzlich funktioniert
- ob Postgame einen neuen Room erzeugt
- wie Hidden Information verteilt wird

---

## 5. Empfehlte Umsetzungsreihenfolge
Für den Bau gilt weiterhin die Delivery-Reihenfolge aus:
- `05-delivery/mvp-roadmap.md`

Kurzform:
1. Foundations
2. Room/Lobby
3. Match Setup + Board
4. Core Turn Loop
5. Forced States
6. Trade + Dev Cards
7. Reconnect + Postgame + Hardening

---

## 6. Wenn Widersprüche vermutet werden
Dann gilt diese Priorität:
1. spätere technische Spezifikation vor früherer grober Spezifikation
2. reviewed Produktdatei vor historischer Erstfassung
3. Decision Register vor offenen Formulierungen in UX-Dokumenten
4. State Machine / Rule Engine vor impliziten UI-Annahmen

---

## 7. Zielbild für Codex
Nach dem Lesen dieses Dokuments und der referenzierten Dateien sollte Codex in der Lage sein:
- die Implementierung sauber aufzusetzen,
- Tickets / Arbeitspakete entlang der Specs zu schneiden,
- und keine stillschweigenden Produktentscheidungen neu einzuführen.