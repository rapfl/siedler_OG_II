# State Machine Specification

## Zweck
Dieses Dokument definiert die formale Zustandslogik für `siedler_OG_II`.

Es beschreibt:
- welche Zustände das System kennt,
- welche Übergänge legal sind,
- welche Aktionen in welchem Zustand erlaubt sind,
- welche Forced States andere Aktionen blockieren,
- und an welchen Stellen Sieg, Reconnect und Room-Lifecycle eingreifen.

Dieses Dokument ist die zentrale Regelbasis für:
- die Game Engine,
- den Realtime-Server,
- die UX-Aktionsführung,
- spätere Command-/Event-Contracts.

---

## 1. Grundprinzipien

### 1.1 Serverautoritativ
Die State Machine lebt vollständig serverseitig.

Der Client darf:
- Zustand darstellen,
- Intents / Commands senden,
- lokale Preview-States halten.

Der Client darf nicht:
- den kanonischen Match-Zustand selbst fortschreiben,
- Forced States auflösen,
- Siegbedingungen bestimmen,
- Legality final beurteilen.

### 1.2 Explizite Zustände statt impliziter Regeln
Jeder regelrelevante Zustand muss als expliziter Machine State oder Substate modelliert werden.

Das betrifft besonders:
- Setup-Reihenfolge
- Pre-roll Dev-Card-Fenster
- 7er-Auflösung
- Robber-Auflösung
- Development-Card-Resolutions
- Postgame-Rückkehr in den Room-Kontext

### 1.3 Forced States sind exklusiv
Sobald ein Forced State aktiv ist, sind alle nicht dazugehörigen normalen Aktionen gesperrt.

### 1.4 Room und Match sind getrennte Zustandsmaschinen
- **Room State Machine** beschreibt soziale / organisatorische Zustände.
- **Match State Machine** beschreibt die eigentliche Partie.

Ein Room kann ohne Match existieren.
Ein Match existiert nie ohne Room.

---

## 2. Überblick über die Maschinen

Es gibt drei relevante Ebenen:

1. **Room Lifecycle Machine**
2. **Match Lifecycle Machine**
3. **Turn / Resolution Machine** innerhalb eines laufenden Matches

Zusätzlich gibt es querschnittlich:
- Presence / Session States
- Visibility Projection
- Victory Evaluation Hooks

---

## 3. Room Lifecycle Machine

## 3.1 Room States

### `room_open_prematch`
Der Room existiert, aber es läuft kein Match.

### `room_match_starting`
Ein Match wird aus dem Room heraus initialisiert.

### `room_match_in_progress`
Genau ein aktives Match läuft in diesem Room.

### `room_postgame`
Das Match ist beendet, der Room existiert weiter und kann eine neue Partie vorbereiten.

### `room_closed`
Der Room ist beendet oder nicht mehr zugänglich.

---

## 3.2 Room-Übergänge

### `room_open_prematch -> room_match_starting`
Trigger:
- Host startet Match
- Mindestspielerzahl erfüllt
- alle belegten Seats ready

### `room_match_starting -> room_match_in_progress`
Trigger:
- Match erfolgreich erzeugt
- Board erzeugt
- MatchPlayer zugewiesen
- Setup-Phase initialisiert

### `room_match_starting -> room_open_prematch`
Trigger:
- Match-Start scheitert
- Initialisierung wird zurückgerollt

### `room_match_in_progress -> room_postgame`
Trigger:
- Match endet regulär durch Sieg
- Match wird sauber finalisiert

### `room_postgame -> room_match_starting`
Trigger:
- neuer Match-Start aus demselben Room
- Ready-Reset und Startbedingungen erfüllt

### `room_open_prematch -> room_closed`
Trigger:
- Room bewusst geschlossen
- alle Nutzer weg und TTL / Cleanup greift

### `room_postgame -> room_closed`
Trigger:
- Room bewusst geschlossen
- alle Nutzer weg und TTL / Cleanup greift

---

## 3.3 Room-Invarianten
- In `room_match_in_progress` existiert genau ein aktives Match.
- In `room_open_prematch` und `room_postgame` existiert kein aktives Match.
- `room_match_starting` darf nicht parallel für zwei Matches aktiv sein.
- Host ist eine Room-Rolle, keine Match-Regelautorität.

---

## 4. Presence / Session States

Diese States sind nicht die Haupt-State-Machine, aber essenziell für die Laufzeitlogik.

## 4.1 Seat Presence States
Für jeden Room-Seat bzw. Match-Player:
- `connected`
- `disconnected_grace`
- `expired`
- `explicitly_left`

## 4.2 Grundregeln
- Disconnect führt zunächst zu `disconnected_grace`.
- Seat bleibt während Grace reserviert.
- Nach Ablauf kann Seat in Pre-match/Postgame freigegeben werden.
- Während laufender Partie bleibt der Player logisch Teil des Matches; es gibt kein Match-Reshaping.

---

## 5. Match Lifecycle Machine

## 5.1 Match States

### `match_initializing`
Das Match wird erzeugt, Board/Players/Decks werden vorbereitet.

### `match_setup`
Initiale Platzierungsphase.

### `match_in_progress`
Reguläres Spiel mit Turn- und Resolution-States.

### `match_finished`
Sieg wurde festgestellt, Match ist final.

### `match_aborted`
Technisch oder administrativ abgebrochen; nicht regulärer Sieg.

---

## 5.2 Match-Übergänge

### `match_initializing -> match_setup`
Trigger:
- Board generiert
- Turn Order steht
- Setup-Cursor initialisiert
- Dev Deck vorbereitet
- Robber auf Desert gesetzt

### `match_setup -> match_in_progress`
Trigger:
- alle Start-Siedlungen und Start-Straßen gesetzt
- Startressourcen aus zweiter Siedlung verteilt
- erster aktiver Spieler bestimmt
- Turn State initialisiert

### `match_in_progress -> match_finished`
Trigger:
- `evaluateVictory()` liefert Winner

### `match_* -> match_aborted`
Trigger:
- administrativer Abbruch
- irreparabler technischer Fehler

---

## 5.3 Match-Invarianten
- Es gibt genau einen aktiven Spieler, sobald `match_in_progress` erreicht ist.
- Es existiert genau ein kanonischer Board State.
- Robber ist immer auf genau einem Hex.
- Jeder MatchPlayer hat genau einen Turn Order Slot.
- Der Development Deck Zustand ist total geordnet und serverseitig kontrolliert.

---

## 6. Setup State Machine

Die Setup-Phase ist keine lose Sonderregel, sondern ein eigener deterministischer Ablauf.

## 6.1 Setup States

### `setup_forward_settlement`
Aktueller Setup-Spieler muss eine Siedlung setzen.

### `setup_forward_road`
Aktueller Setup-Spieler muss die zugehörige Straße setzen.

### `setup_reverse_settlement`
In umgekehrter Reihenfolge: zweite Siedlung setzen.

### `setup_reverse_road`
Zu dieser Siedlung die Straße setzen.

### `setup_distribute_start_resources`
Startressourcen aus den zweiten Siedlungen werden vergeben.

### `setup_complete`
Setup ist vollständig; Übergang in reguläres Spiel.

---

## 6.2 Setup-Übergangslogik

### Forward Round
Für jeden Spieler in Turn Order:
1. `setup_forward_settlement`
2. `setup_forward_road`
3. nächster Spieler oder Wechsel in Reverse Round

### Reverse Round
Für jeden Spieler in umgekehrter Turn Order:
1. `setup_reverse_settlement`
2. `setup_reverse_road`
3. nächster Spieler oder Wechsel in Ressourcenverteilung

### Completion
Nach der letzten Reverse Road:
- `setup_distribute_start_resources`
- danach `setup_complete`
- danach `match_in_progress`

---

## 6.3 Setup-Invarianten
- Während Setup sind normale Turn-Aktionen gesperrt.
- Setup-Straßen müssen an die gerade gesetzte Setup-Siedlung angrenzen.
- Distanzregel gilt bereits im Setup.
- Kosten werden im Setup nicht aus Ressourcen bezahlt.

---

## 7. Match-In-Progress: Turn Machine

## 7.1 Turn Superstates
Während `match_in_progress` läuft der aktive Turn durch eine Untermaschine.

### `turn_start`
Kontextwechsel auf neuen aktiven Spieler.

### `pre_roll_devcard_window`
Optionales Fenster für genau eine legal spielbare Development Card vor dem Würfeln.

### `roll_pending`
Aktiver Spieler muss würfeln, sofern kein sofortiger Sieg bereits festgestellt wurde.

### `resolving_roll`
Würfelergebnis wird verarbeitet.

### `discard_pending`
Falls 7 gewürfelt wurde: betroffene Spieler müssen discarden.

### `robber_pending`
Aktiver Spieler muss Robber bewegen und ggf. stehlen.

### `action_phase`
Offener legaler Aktionsraum nach Würfeln / 7-Auflösung.

### `devcard_resolution`
Subflow für Development Card Effect Resolution innerhalb des Zugs.

### `turn_end_pending`
Aktiver Spieler beendet den Zug; Engine finalisiert Übergang.

---

## 7.2 Turn-Standardfluss ohne 7
1. `turn_start`
2. `pre_roll_devcard_window`
3. `roll_pending`
4. `resolving_roll`
5. `action_phase`
6. optional `devcard_resolution`
7. zurück `action_phase`
8. `turn_end_pending`
9. nächster Spieler -> `turn_start`

## 7.3 Turn-Fluss mit 7
1. `turn_start`
2. `pre_roll_devcard_window`
3. `roll_pending`
4. `resolving_roll`
5. `discard_pending`
6. `robber_pending`
7. `action_phase`
8. optional `devcard_resolution`
9. zurück `action_phase`
10. `turn_end_pending`
11. nächster Spieler -> `turn_start`

---

## 7.4 Turn-State-Regeln

### In `turn_start`
Erlaubt:
- kein normales Bauen / Handeln
- nur serverseitige Turn-Initialisierung
- `evaluateVictory()` auf vorhandene Punkte

### In `pre_roll_devcard_window`
Erlaubt:
- genau eine legal spielbare Development Card zu beginnen
- direkt zu `roll_pending` weiterzugehen

Nicht erlaubt:
- bauen
- handeln
- Development Card kaufen
- Zug beenden

### In `roll_pending`
Erlaubt:
- `ROLL_DICE`

### In `resolving_roll`
Erlaubt:
- keine Client-Aktionen außer passives Warten

### In `discard_pending`
Erlaubt:
- nur `DISCARD_RESOURCES` für betroffene Spieler

### In `robber_pending`
Erlaubt:
- `MOVE_ROBBER`
- falls nötig / möglich: `STEAL_RESOURCE`

### In `action_phase`
Erlaubt:
- `BUILD_ROAD`
- `BUILD_SETTLEMENT`
- `UPGRADE_CITY`
- `OFFER_TRADE`
- `RESPOND_TRADE`
- `TRADE_WITH_BANK`
- `BUY_DEV_CARD`
- Start einer Development-Card-Resolution, falls legal
- `END_TURN`

### In `devcard_resolution`
Erlaubt:
- nur die zur laufenden Karte gehörenden Commands

### In `turn_end_pending`
Erlaubt:
- keine normalen Client-Aktionen
- nur serverseitiger Übergang zum nächsten Turn

---

## 8. Development Card Resolution Submachine

## 8.1 Allgemeine Regeln
- Pro Zug darf maximal **eine** Development Card gespielt werden.
- Eine in diesem Zug gekaufte Development Card darf nicht gespielt werden.
- Victory Point Cards erzeugen keinen normalen aktiven Resolution Flow.

## 8.2 Devcard Resolution States

### `devcard_knight_robber`
Robber-Flow ohne 7er-Discard.

### `devcard_year_of_plenty_pick_1`
Erste Ressource wählen.

### `devcard_year_of_plenty_pick_2`
Zweite Ressource wählen.

### `devcard_monopoly_pick_resource`
Ressourcentyp wählen.

### `devcard_road_building_place_1`
Erste freie Straße setzen.

### `devcard_road_building_place_2`
Zweite freie Straße setzen.

### `devcard_resolution_complete`
Subflow wird abgeschlossen, Rückkehr in `action_phase`.

---

## 8.3 Subflow-Regeln

### Knight
- Übergang nach `robber_pending`-artiger Spezialauflösung
- keine `discard_pending`

### Year of Plenty
- zwei aufeinanderfolgende Picks
- nach Pick 2 direkte Ressourcenvergabe und Abschluss

### Monopoly
- Ressourcentyp wählen
- alle legalen Ressourcen anderer Spieler einsammeln
- Abschluss

### Road Building
- zwei separate Platzierungen
- wenn zweite Platzierung regelbedingt unmöglich ist, Subflow darf kontrolliert vorzeitig enden

---

## 9. Trade State Logic

Trade ist im MVP kein eigener globaler Turn-Superstate, sondern ein temporärer Zustand innerhalb der `action_phase`.

## 9.1 Trade States
- `trade_idle`
- `trade_offer_open`
- `trade_offer_resolved`
- `trade_offer_cancelled`

## 9.2 Regeln
- Nur der aktive Spieler eröffnet Trades.
- Trade geht an alle anderen aktiven Spieler.
- Responses sind `accept` oder `reject`.
- Kein Counteroffer in V1.
- Nach erfolgreicher finaler Bestätigung wird in `action_phase` fortgesetzt.

---

## 10. Victory Evaluation Hooks

Sieg darf nicht nur am Zugende geprüft werden.

## 10.1 `evaluateVictory()` muss aufgerufen werden nach:
- Turn Start
- Siedlungsbau
- Stadt-Upgrade
- Longest Road Neuberechnung
- Largest Army Neuberechnung
- relevanter VP-Reveal-Logik

## 10.2 Siegregel
Wenn ein Spieler auf seinem eigenen Zug 10 oder mehr Punkte erreicht:
- Winner bestimmen
- `match_finished`
- `room_postgame`

---

## 11. Longest Road / Largest Army Recalculation Hooks

## 11.1 Longest Road recalculation nach:
- `BUILD_ROAD`
- `BUILD_SETTLEMENT`
- `UPGRADE_CITY` nur falls Gebäudezustand Einfluss auf Blockadeprüfung hat
- `PLAY_DEV_CARD_ROAD_BUILDING`

## 11.2 Largest Army recalculation nach:
- `PLAY_DEV_CARD_KNIGHT`

Diese Recalculations sind serverseitige Derived-State-Updates, keine freien Client-Aktionen.

---

## 12. Global Invariants

- Pro Match genau ein kanonischer Full State
- Pro Client genau eine Visibility Projection aus dem Full State
- Kein normaler Turn-Command während Forced States
- Kein End Turn mit offener Forced Resolution
- Kein Match-Start ohne vollständige Ready-Bedingung
- Kein zweites aktives Match im selben Room

---

## 13. Error Handling in der Machine

## 13.1 Invalid Command
Wenn ein Command im aktuellen State nicht legal ist:
- State bleibt unverändert
- Command wird abgelehnt
- erklärbare Fehlerursache zurückgeben

## 13.2 Stale Command
Wenn ein Command auf veraltetem Client-Kontext basiert:
- keine Zustandsmutation
- State unchanged
- Client erhält Hinweis auf geänderten Zustand

## 13.3 Recovery
Reconnect rekonstruiert:
- aktuellen Room State
- aktuellen Match State
- aktuellen Turn/Resolution State
- player-specific visibility

---

## 14. Empfohlene technische Repräsentation

Der Gesamtzustand kann intern beispielsweise so modelliert werden:

```md
roomState:
  kind: room_open_prematch | room_match_starting | room_match_in_progress | room_postgame | room_closed

matchState:
  kind: match_initializing | match_setup | match_in_progress | match_finished | match_aborted

setupState:
  kind: ...

turnState:
  kind: turn_start | pre_roll_devcard_window | roll_pending | resolving_roll | discard_pending | robber_pending | action_phase | devcard_resolution | turn_end_pending

resolutionState:
  kind: none | knight | year_of_plenty_pick_1 | year_of_plenty_pick_2 | monopoly_pick_resource | road_building_place_1 | road_building_place_2
```

Die konkrete Implementierung kann hiervon abweichen, aber die semantische Trennung sollte erhalten bleiben.

---

## 15. Kurzform für das Dev-Team
Block 03 baut auf drei Kernideen:
- Room und Match sind getrennte Maschinen.
- Forced States sind exklusiv.
- Siegprüfung ist ein zentraler Hook, kein finales Zug-Afterthought.