# Rule Engine Specification

## Zweck
Dieses Dokument beschreibt die fachliche Engine für das laufende Spiel.

Es definiert:
- welche Inputs die Engine verarbeitet,
- welche Arten von Prüfungen und Zustandsänderungen sie vornimmt,
- wie Derived State berechnet wird,
- wie Commands in State-Transitions übersetzt werden,
- und wie Sieg, Longest Road, Largest Army, Trades und Development Cards ausgewertet werden.

Dieses Dokument beschreibt die **Engine-Logik**, nicht Transport, UI oder Persistenzdetails.

---

## 1. Architekturrolle der Engine

Die Rule Engine ist der fachliche Kern des Spiels.

Sie sitzt zwischen:
- Realtime-Server / Command Intake
- und kanonischem Match State

### Die Engine nimmt entgegen
- aktuellen kanonischen State
- validen oder zumindest prüfbaren Command
- Kontext wie `actorPlayerId`

### Die Engine gibt zurück
- entweder Ablehnung mit Begründung
- oder einen deterministischen neuen State plus abgeleitete Effekte / Events

---

## 2. Grundprinzipien

### 2.1 Pure Domain First
Die Engine sollte so weit wie möglich framework-unabhängig und deterministisch sein.

### 2.2 Command -> Validate -> Apply -> Recalculate -> Check Victory
Jeder mutierende Schritt folgt idealerweise diesem Muster:
1. Command semantisch validieren
2. State-Mutation anwenden
3. Derived State neu berechnen
4. Victory prüfen
5. Ergebnis zurückgeben

### 2.3 Illegal Commands ändern nie den State
Ein ungültiger Command darf keine Teilmutation hinterlassen.

### 2.4 Derived State wird nicht dem Client geglaubt
Longest Road, Largest Army, Harbor Access, Legality und Victory sind serverseitig abgeleitet.

---

## 3. Engine Inputs und Outputs

## 3.1 Engine Input
Empfohlener Funktionsstil:

```md
applyCommand(state, command, context) -> EngineResult
```

### `state`
Kanonischer Full State des Matches / Rooms, soweit für den Command relevant.

### `command`
Fachlicher Intent, z. B.:
- `ROLL_DICE`
- `BUILD_ROAD`
- `DISCARD_RESOURCES`
- `PLAY_DEV_CARD_MONOPOLY`

### `context`
Mindestens:
- `actorPlayerId`
- aktuelle Serverzeit, falls benötigt
- idempotency / request metadata optional

## 3.2 Engine Output

### Erfolgsfall
- neuer State
- Domain Events / Applied Effects
- ggf. Rejection-Warnings nicht nötig

### Fehlerfall
- `rejected = true`
- klarer Rejection Reason
- unveränderter alter State

---

## 4. Schichten innerhalb der Engine

Die Rule Engine sollte intern mindestens folgende fachliche Schichten haben:

### 4.1 State Guards
Prüfen, ob der Command im aktuellen State grundsätzlich zulässig ist.

Beispiele:
- ist der Actor der aktive Spieler?
- ist der Turn State passend?
- ist eine Forced Resolution offen?

### 4.2 Cost / Ownership Checks
Prüfen Ressourcen, Besitz, Zugriffsrechte.

Beispiele:
- genug Ressourcen für Straßenbau?
- gehört das Settlement dem Spieler?
- hat der Spieler die Development Card?

### 4.3 Board Legality Checks
Prüfen Graphregeln.

Beispiele:
- Distanzregel
- Road-Adjacency
- Harbor Access
- Robber-Ziele

### 4.4 State Mutation Layer
Wendet die legale Änderung an.

### 4.5 Derived State Layer
Berechnet neu:
- Harbor Access
- Longest Road
- Largest Army
- sichtbare Punkte / interne Punkte
- legale nächste Aktionen / State Hooks

### 4.6 Victory Layer
Prüft nach relevanten Änderungen, ob das Match endet.

---

## 5. Kanonischer Engine State

Die Engine braucht mindestens Zugriff auf folgende State-Bereiche:

### Room / Session-nah
- room state
- seats / presence
- host

### Match-nah
- match lifecycle state
- setup state
- turn state
- resolution state
- board state

### Player-nah
- resources per player
- dev cards in hand per player
- purchased dev cards this turn
- hasPlayedDevCardThisTurn
- playedKnightCount
- visible and hidden point composition

### Trade-nah
- aktuelles offenes Angebot
- responses

### Meta / Determinism
- RNG seed/state
- draw order for dev deck
- event sequence cursor optional

---

## 6. Command-Familien

## 6.1 Room / Meta Commands
Diese sind fachlich relevant, aber nicht Kern der Match-Rule-Logik:
- `CREATE_ROOM`
- `JOIN_ROOM`
- `TOGGLE_READY`
- `START_MATCH`
- `RECONNECT_SESSION`
- `EXPLICIT_LEAVE`

## 6.2 Setup Commands
- `PLACE_INITIAL_SETTLEMENT`
- `PLACE_INITIAL_ROAD`

## 6.3 Turn Commands
- `ROLL_DICE`
- `END_TURN`

## 6.4 Build Commands
- `BUILD_ROAD`
- `BUILD_SETTLEMENT`
- `UPGRADE_CITY`

## 6.5 Trading Commands
- `OFFER_TRADE`
- `RESPOND_TRADE`
- `TRADE_WITH_BANK`

## 6.6 Development Card Commands
- `BUY_DEV_CARD`
- `PLAY_DEV_CARD_KNIGHT`
- `PLAY_DEV_CARD_YEAR_OF_PLENTY`
- `PLAY_DEV_CARD_MONOPOLY`
- `PLAY_DEV_CARD_ROAD_BUILDING`

## 6.7 Forced Resolution Commands
- `DISCARD_RESOURCES`
- `MOVE_ROBBER`
- `STEAL_RESOURCE`
- resolution-internal picks for dev card effects

---

## 7. Validation Strategy pro Command

Jeder Command sollte mindestens entlang von vier Achsen validiert werden.

## 7.1 State Validity
Ist der Command im aktuellen Lifecycle / Turn State zulässig?

## 7.2 Actor Validity
Darf genau dieser Spieler ihn ausführen?

## 7.3 Resource / Ownership Validity
Hat der Spieler die nötigen Ressourcen / Karten / Besitzrechte?

## 7.4 Board / Rule Validity
Ist die Aktion auf dem Board regelkonform?

---

## 8. Setup-Engine-Regeln

## 8.1 `PLACE_INITIAL_SETTLEMENT`
Checks:
- Match in `match_setup`
- aktueller Setup State passt
- actor ist aktueller Setup-Spieler
- Intersection unbesetzt
- Distanzregel erfüllt

Mutation:
- Settlement platzieren
- Setup Cursor auf `*_road`

## 8.2 `PLACE_INITIAL_ROAD`
Checks:
- passender Setup-Road-State
- actor ist aktueller Setup-Spieler
- Edge unbesetzt
- Edge grenzt an gerade gesetzte Setup-Siedlung

Mutation:
- Road platzieren
- Setup Cursor auf nächsten Spieler / nächsten Setup-State

## 8.3 Startressourcen
Nach vollständigem Reverse Placement:
- jede zweite Setup-Siedlung erzeugt Startressourcen aus angrenzenden Nicht-Desert-Hexes
- Robber blockiert hier nicht, da er initial nur auf Desert steht

---

## 9. Roll Engine

## 9.1 `ROLL_DICE`
Checks:
- aktueller Turn State `roll_pending`
- actor ist aktiver Spieler

Mutation:
- Würfelergebnis serverseitig erzeugen
- Ergebnis speichern
- Übergang nach `resolving_roll`

### Wenn Ergebnis != 7
- Produktionsmenge je betroffenem Gebäude berechnen
- Ressourcen verteilen
- Übergang in `action_phase`

### Wenn Ergebnis == 7
- Discard-Pflichten für alle Spieler mit 8+ Karten ermitteln
- wenn mindestens ein Spieler discarden muss: `discard_pending`
- sonst direkt `robber_pending`

---

## 10. Discard Engine

## 10.1 `DISCARD_RESOURCES`
Checks:
- aktueller State `discard_pending`
- actor ist discard-pflichtig
- genau richtige Anzahl an Karten ausgewählt
- ausgewählte Ressourcen tatsächlich vorhanden

Mutation:
- Ressourcen entfernen
- Player als `discardResolved = true` markieren

Wenn alle Betroffenen discarden abgeschlossen haben:
- Übergang zu `robber_pending`

---

## 11. Robber Engine

## 11.1 `MOVE_ROBBER`
Checks:
- State ist `robber_pending`
- actor ist aktiver Spieler
- Zielhex existiert
- Zielhex ist nicht aktuelles Robber-Hex

Mutation:
- Robber vom alten Hex entfernen
- Robber auf neues Hex setzen
- potenzielle Steal-Ziele aus Board ableiten

Wenn keine legalen Steal-Ziele existieren:
- `robber_pending` abschließen
- zurück in `action_phase`

Wenn genau ein oder mehrere Steal-Ziele existieren:
- Auswahl oder Direktfortsetzung auf `STEAL_RESOURCE` vorbereiten

## 11.2 `STEAL_RESOURCE`
Checks:
- State ist weiterhin `robber_pending`
- gewähltes Opfer ist legales Steal-Ziel
- Opfer hat mindestens 1 Ressource

Mutation:
- zufällige Ressource aus Opferhand wählen
- Transfer an aktiven Spieler
- `robber_pending` abschließen
- zurück `action_phase`

---

## 12. Build Engine

## 12.1 `BUILD_ROAD`
Checks:
- State `action_phase` oder `devcard_road_building_*`
- actor ist aktiver Spieler
- genug Ressourcen, außer im Road-Building-Devcard-Kontext
- Edge legal gemäß Board Graph

Mutation:
- Kosten abziehen, falls normaler Bau
- Road platzieren
- Longest Road neu berechnen
- Victory prüfen

## 12.2 `BUILD_SETTLEMENT`
Checks:
- State `action_phase`
- genug Ressourcen
- Intersection legal

Mutation:
- Kosten abziehen
- Settlement platzieren
- Harbor Access ggf. aktualisieren
- Longest Road neu berechnen, falls Blockadeeffekt relevant wird
- Victory prüfen

## 12.3 `UPGRADE_CITY`
Checks:
- State `action_phase`
- genug Ressourcen
- eigenes Settlement vorhanden

Mutation:
- Kosten abziehen
- Settlement -> City
- Victory prüfen

---

## 13. Development Card Engine

## 13.1 `BUY_DEV_CARD`
Checks:
- State `action_phase`
- genug Ressourcen
- Dev Deck nicht leer

Mutation:
- Kosten abziehen
- oberste Development Card ziehen
- Karte der Spielerhand hinzufügen
- als `boughtThisTurn = true` markieren

## 13.2 Gemeinsame Regeln für `PLAY_DEV_CARD_*`
Checks:
- actor ist aktiver Spieler
- State ist `pre_roll_devcard_window` oder `action_phase`
- `hasPlayedDevCardThisTurn == false`
- gewählte Karte gehört dem Spieler
- Karte wurde nicht in diesem Zug gekauft

Mutation allgemein:
- Karte aus Hand entfernen / in played pile überführen
- `hasPlayedDevCardThisTurn = true`
- passenden Resolution State starten

## 13.3 Knight
Mutation:
- `playedKnightCount++`
- Largest Army neu berechnen
- Robber-Subflow starten
- Victory prüfen nach Largest Army und nach Abschluss der Folgeeffekte

## 13.4 Year of Plenty
Mutation:
- Resolution State `pick_1`
- nach zwei gültigen Picks Ressourcen hinzufügen
- zurück `action_phase`

## 13.5 Monopoly
Mutation:
- Ressourcentyp wählen lassen
- alle Ressourcen dieses Typs von anderen Spielern einsammeln
- zurück `action_phase`
- Victory normalerweise nicht direkt relevant, aber State konsistent fortführen

## 13.6 Road Building
Mutation:
- Resolution States für zwei freie Straßenstarts
- normale Straßenkosten entfallen
- Longest Road nach jeder Platzierung oder spätestens nach Abschluss neu berechnen
- Victory prüfen

## 13.7 Victory Point Cards
Victory Point Cards werden nicht als normale aktive Effect Resolution gespielt.

Engine-seitig wichtig:
- sie bleiben verdeckt in Hand / Hidden State
- ihre Punkte müssen in der internen Victory-Berechnung berücksichtigt werden
- ihre Offenlegung ist primär ein Postgame-/Reveal-Thema, kein normaler Turn Command

---

## 14. Trade Engine

## 14.1 `OFFER_TRADE`
Checks:
- State `action_phase`
- actor ist aktiver Spieler
- angebotene Ressourcen vorhanden
- Trade ist Ressource-gegen-Ressource und nicht leer
- kein anderes offenes Angebot vorhanden

Mutation:
- `trade_offer_open`
- Angebot an alle anderen aktiven Spieler ausspielen

## 14.2 `RESPOND_TRADE`
Checks:
- offenes Angebot vorhanden
- responder ist nicht der aktive Spieler
- responder hat noch nicht final geantwortet

Mutation:
- Response speichern

## 14.3 Trade-Finalisierung
Wenn mindestens eine Annahme vorliegt und aktiver Spieler einen Deal bestätigt:

Checks:
- Angebot noch offen
- beide Seiten besitzen weiterhin die versprochenen Ressourcen

Mutation:
- atomarer Ressourcentransfer
- Trade schließen
- zurück in `action_phase`

## 14.4 `TRADE_WITH_BANK`
Checks:
- `action_phase`
- actor ist aktiver Spieler
- angebotene Ressourcen vorhanden
- angefordertes Verhältnis legal nach Harbor-/Bank-Regeln

Mutation:
- Ressourcentransfer mit Bankmodell
- zurück `action_phase`

---

## 15. Harbor Access und Trade Ratio Evaluation

## 15.1 `getBestTradeRatio(playerId, resourceType)`
Die Engine sollte aus dem Board ableiten:
- 2:1 möglich?
- sonst 3:1 möglich?
- sonst 4:1

## 15.2 Wichtig
Harbor Access ist abgeleitet aus Gebäuden auf Harbor-Intersections und darf nicht manuell gepflegt werden, wenn das vermeidbar ist.

---

## 16. Longest Road Engine

## 16.1 Ziel
Die Engine muss nach jeder road-relevanten Änderung korrekt bestimmen:
- längste zusammenhängende Straßenlänge pro Spieler
- aktuellen Holder von Longest Road

## 16.2 Fachregeln
- mindestens 5 Straßenstücke nötig
- gegnerische Siedlung / Stadt unterbricht Pfade
- eigene Gebäude unterbrechen nicht
- Gleichstand entzieht dem aktuellen Holder die Karte nicht zugunsten des Herausforderers

## 16.3 Empfehlung zur Implementierung
Für jeden Spieler:
1. Player-spezifischen Road-Graph ableiten
2. an blockierten Intersections gegnerische Durchgänge entfernen
3. maximale legale Pfadlänge berechnen
4. Holder gemäß Catan-Regeln bestimmen

## 16.4 Mutationsergebnis
Derived State:
- `longestRoadHolderPlayerId | null`
- `longestRoadLength`
- ggf. VP-Anpassung implizit / derived

---

## 17. Largest Army Engine

## 17.1 Ziel
Bestimmen, welcher Spieler Largest Army hält.

## 17.2 Fachregeln
- mindestens 3 gespielte Knights nötig
- nur gespielte Knights zählen
- bei höherer Knight-Zahl wechselt Largest Army

## 17.3 Mutationsergebnis
Derived State:
- `largestArmyHolderPlayerId | null`
- `largestArmySize`

---

## 18. Victory Engine

## 18.1 Interne Punktberechnung
Die Engine sollte die Punkte intern vollständig berechnen aus:
- Siedlungen
- Städten
- Longest Road
- Largest Army
- Victory Point Cards

## 18.2 Öffentliche vs. interne Punkte
Empfohlen:
- `visiblePoints`
- `hiddenPoints`
- `totalPoints`

Damit kann UX korrekt zwischen sichtbarem Zwischenstand und internem Siegzustand unterscheiden.

## 18.3 `evaluateVictory()`
Diese Funktion prüft:
- erreicht aktiver Spieler `totalPoints >= 10`?
- falls ja: Winner bestimmen
- Match beenden

Wichtig:
- Sieg gilt nur auf dem eigenen Zug
- daher muss `evaluateVictory()` den aktiven Spielerbezug kennen

---

## 19. Rejection Reasons

Rejection Reasons sollten fachlich klar sein und idealerweise standardisiert werden.

Beispiele:
- `not_active_player`
- `invalid_turn_state`
- `forced_resolution_pending`
- `insufficient_resources`
- `illegal_board_target`
- `dev_card_already_played_this_turn`
- `dev_card_bought_this_turn`
- `trade_offer_not_open`
- `seat_not_ready`

Diese sind noch kein finales API-Schema, aber eine wichtige Vorstruktur.

---

## 20. Idempotenz und Stale Commands

## 20.1 Idempotenz
Transportseitige Wiederholungen desselben Commands dürfen nach Möglichkeit nicht zu mehrfacher Mutation führen.

## 20.2 Stale Context
Wenn ein Client eine Aktion auf altem State ausführt:
- Command ablehnen
- State unverändert lassen
- neuen relevanten Kontext zurückgeben

---

## 21. Engine Tests

Mindestens erforderlich:

### Setup
- komplette 3-Spieler-Setupfolge
- komplette 4-Spieler-Setupfolge
- Distanzregel im Setup

### Roll / Production
- normale Produktion
- 7er-Discard
- Robber blockiert Produktion

### Builds
- legale / illegale Siedlung
- legale / illegale Straße
- City Upgrade

### Dev Cards
- Kauf und Sperre im selben Zug
- max. 1 gespielte Development Card pro Zug
- Knight -> Largest Army
- Road Building -> 2 Straßen
- Monopoly / Year of Plenty

### Trade
- Offer / accept / reject
- Trade scheitert wegen geänderter Bestände
- Banktrade mit Harbor Ratio

### Derived State
- Harbor Access
- Longest Road mit Blockaden
- Largest Army
- Victory mit verdeckten VP-Karten

### Lifecycle
- Match Start
- Match Finish
- Reconnect in Forced State

---

## 22. Empfohlene Modulaufteilung

Mögliche interne Aufteilung:
- `validateCommand.ts`
- `applySetupCommand.ts`
- `applyTurnCommand.ts`
- `tradeEngine.ts`
- `devCardEngine.ts`
- `roadEngine.ts`
- `victoryEngine.ts`
- `boardQueries.ts`

Das ist nur eine Empfehlung; entscheidend ist die fachliche Trennschärfe.

---

## 23. Kurzform für das Dev-Team
Die Rule Engine soll drei Dinge zuverlässig tun:
- illegale Commands sauber ablehnen,
- legale Commands deterministisch anwenden,
- und danach Derived State plus Victory korrekt neu berechnen.

Wenn diese Reihenfolge stabil ist, werden Realtime, UX und spätere API-Contracts deutlich einfacher.