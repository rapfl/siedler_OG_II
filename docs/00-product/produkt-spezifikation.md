# Produktspezifikation – Siedler-ähnlicher Online-Multiplayer MVP

## 1. Produktziel
Browserbasierte Multiplayer-Webapp im Stil eines modernen Catan-/Colonist-ähnlichen Spiels für kleine private Runden.

Ziel des MVP ist nicht maximale Feature-Breite, sondern eine schlanke, schnell verständliche und mit wenigen Friends zuverlässig spielbare Version.

Der MVP soll:
- in wenigen Klicks ein privates Spiel mit Freund*innen ermöglichen,
- den Kern des Basisspiels sauber digital abbilden,
- auf Desktop gut spielbar sein,
- technisch so geschnitten sein, dass spätere Features ohne Rewrite möglich bleiben.

---

## 2. Produktprinzipien

### 2.1 Für den MVP gilt
- Private Matches first statt öffentlichem Matchmaking
- Desktop first statt Mobile first
- 4 Spieler Standard statt 5–6 Spieler
- Kernspiel zuerst statt Sonderregeln und Erweiterungen
- Geringe Friction beim Joinen
- Klare State-Machine statt impliziter Spiellogik
- Deterministische Game Engine mit serverautoritativem Zustand

### 2.2 Nicht-Ziele des MVP
- keine Erweiterungen
- kein Ranked / ELO / Ladder
- keine Bots
- keine globale Lobby
- keine Freundeslisten / Social Graph
- kein Ingame-Voice
- keine Cosmetics / Shop / Monetization
- kein Mobile-optimiertes Vollerlebnis

---

## 3. Produkt-Definition

### 3.1 Elevator Pitch
Ein schlanker, privater Online-Siedler-Klon für Freundesrunden: Room erstellen, Link teilen, gemeinsam spielen – direkt im Browser.

### 3.2 Zielgruppe
- Freundesgruppen, die das Basisspiel online spielen wollen
- kleine Testgruppen / Bekannte
- early adopters aus dem Umfeld

### 3.3 Primary User Story
Als Host möchte ich in unter 60 Sekunden einen privaten Raum erstellen, meinen Freund*innen einen Join-Link schicken und ein komplettes Spiel störungsfrei starten können.

### 3.4 Secondary User Story
Als Mitspieler möchte ich per Link schnell beitreten, meinen Namen wählen, ready klicken und das Spiel ohne Regelunklarheiten spielen können.

---

## 4. MVP Scope – Funktionsumfang

### 4.1 Im Scope
- privater Raum mit Join-Code / Join-Link
- 3–4 menschliche Spieler
- Host kann Spiel starten
- Namen wählen
- Farbe / Sitzplatzzuweisung automatisch oder hostgesteuert light
- vollständiger Basisspiel-Loop:
  - Initial Placement
  - Würfeln
  - Ressourcenverteilung
  - Bauen
  - Trading zwischen Spielern
  - Bank- und Hafenhandel
  - Räuber / Discard / Steal
  - Entwicklungskarten
  - Longest Road
  - Largest Army
  - Sieg bei 10 Punkten
- Ingame-Log / Event Feed
- Sichtbarkeit eigener Handkarten, fremde Karten nur als Count
- Reconnect innerhalb laufender Session
- Spielende-Screen mit Gewinner und Statistik light

### 4.2 Optional für MVP+
- spectator mode
- emotes / quick chat
- host can kick player
- simple rematch
- friendlier reconnect flow
- tutorial hints

### 4.3 Out of Scope
- Expansion Maps
- Ranked
- Bots
- Achievements
- native mobile app

---

## 5. Kernregeln für den MVP

### 5.1 Basisannahmen
Abgebildet wird das bekannte 4-Spieler-Basisspiel:
- Sieg bei 10 Punkten
- zwei Startplatzierungen in Snake Order
- Ressourcenausschüttung nach Würfelwurf
- 7 aktiviert Räuber + Discard-Regel
- Baukosten nach Standardregeln
- Entwicklungskarten inklusive Knight, Monopoly, Road Building, Year of Plenty, Victory Point
- Longest Road / Largest Army
- Hafenhandel nach anliegenden Häfen

### 5.2 Produktentscheidung: Regeln exakt vs. UX-adaptiert
Die Regeln bleiben weitgehend klassisch, die UX wird aber digital optimiert:
- klar geführte Zugphasen
- nur zulässige Aktionen aktivierbar
- Trade UX explizit mit „du gibst“ / „du erhältst“
- visuelles Preview vor Build-Confirm

### 5.3 Harte Designregel
Der Client schlägt nur Aktionen vor. Der Server validiert jede Aktion und schreibt allein den offiziellen Spielzustand.

---

## 6. Domänenmodell

### 6.1 Entitäten
- UserSession
- Room
- RoomSeat
- Match
- MatchPlayer
- GameState
- Board
- HexTile
- Intersection
- Edge
- PlayerHand
- TradeOffer
- DevelopmentDeck
- EventLogEntry

### 6.2 Wesentliche Relationen
- Ein Room hat 0..1 aktive Matches
- Ein Room hat 2..4 Seats
- Ein Match hat 3..4 Players
- Ein Match hat genau einen aktuellen Turn
- Ein Turn hat Phase und erlaubte Aktionen

---

## 7. High-Level User Flows

### 7.1 Flow A – Host erstellt privaten Raum
1. Landing Page öffnen
2. „Spiel erstellen“ klicken
3. Namen eingeben
4. Raum wird erstellt
5. Host landet im Lobby-Screen
6. Join-Link / Code wird angezeigt
7. Host teilt Link mit Friends
8. Spieler treten bei
9. Alle klicken ready
10. Host startet Spiel

### 7.2 Flow B – Spieler tritt per Link bei
1. Join-Link öffnen
2. Name eingeben
3. Raum beitreten
4. Lobby sehen
5. Ready klicken
6. Auf Spielstart warten

### 7.3 Flow C – Initial Placement
1. Spiel startet
2. Spielerreihenfolge steht fest
3. Spieler setzen Settlement + Road
4. Snake Order für zweite Platzierung
5. Startressourcen aus zweiter Siedlung werden verteilt
6. Übergang in ersten regulären Zug

### 7.4 Flow D – Regulärer Zug
1. Aktiver Spieler würfelt
2. Ressourcen werden verteilt oder 7-Flow startet
3. Spieler kann handeln, bauen, Entwicklungskarten spielen
4. Spieler beendet Zug
5. Nächster Spieler ist dran

### 7.5 Flow E – Trade
1. Aktiver Spieler öffnet Trade-Modal / Trade-Panel
2. Gibt an: offer / want
3. Trade wird an Mitspieler ausgespielt
4. Andere Spieler können ablehnen / annehmen
5. Aktiver Spieler bestätigt einen Deal
6. Server validiert Besitz und führt Transfer atomar aus

### 7.6 Flow F – Robber / Discard
1. 7 wird gewürfelt oder Knight gespielt
2. Betroffene Spieler discarden, falls >7 Karten
3. Aktiver Spieler wählt Robber-Zielhex
4. Falls legal: Zielspieler zum Stehlen auswählbar
5. Zufallsressource wird transferiert
6. Zug geht weiter

### 7.7 Flow G – Spielende
1. Aktion löst 10. Siegpunkt aus
2. Server prüft Win-Condition
3. Match wird geschlossen
4. Victory Screen mit Stats
5. Rematch / Zur Lobby

---

## 8. Screen-Liste
- Landing / Home
- Create Room Modal / Page
- Join Room Page
- Room Lobby
- Game Screen
- Trade Modal / Panel
- Robber Modal
- Discard Modal
- Development Card Resolution Modal
- Endgame Screen
- Reconnect / Resume Overlay
- Error / Room not found / Match full Screen

---

## 9. Screen-Spezifikation – Übersicht

### 9.1 Landing / Home
**Ziel:** schneller Einstieg

**Primary CTA:**
- Spiel erstellen
- Spiel beitreten

**Inhalte:**
- Produktname / kurze Beschreibung
- zwei dominante CTAs
- optional Feld für Join-Code

**States:**
- default
- join code invalid
- loading

### 9.2 Create Room
**Ziel:** privaten Raum in einem Schritt anlegen

**Inputs:**
- Player Name
- optional Room Name
- optional Max Players (default 4)

**Output:**
- room id
- join code
- host token/session

### 9.3 Join Room
**Ziel:** per Code/Link beitreten

**Inputs:**
- Player Name
- Room Code (falls nicht im Link)

**Validierungen:**
- room exists
- room not full
- room joinable
- name length

### 9.4 Lobby
**Ziel:** vor Spielstart organisieren

**Elemente:**
- Room Code / Copy Link
- Player List mit Ready Status
- Host Badge
- optional Color Selection
- Start Button für Host
- Leave Room

### 9.5 Haupt-Spielscreen
**Hauptbereiche:**
1. Board Area
2. Top Bar / Status Bar
3. Right Sidebar / Action Panel
4. Bottom Hand / Resources / Dev Cards
5. Event Log

**Board enthält:**
- Hexfelder
- Zahlentoken
- Robber
- Straßen
- Siedlungen/Städte
- Hafenmarker

**Action Panel enthält kontextabhängig:**
- Würfeln
- Zug beenden
- Bauen
- Trade öffnen
- Bankhandel
- Entwicklungskarte spielen

---

## 10. Detaillierte Modals / Sonderflows

### 10.1 Trade Modal
**Tabs / Modi:**
- Mit Spielern handeln
- Mit Bank handeln

**MVP-Entscheidung empfohlen:**
- Erstmal nur Offer → accept/reject
- Keine Counteroffers in V1

### 10.2 Discard Modal
**Trigger:** Spieler mit >7 Karten bei Würfel 7

**UX:**
- nicht schließbar
- zeigt Handkarten und benötigte Discard-Anzahl
- Confirm erst möglich, wenn exakt richtige Anzahl gewählt

### 10.3 Robber Modal
**Steps:**
1. Zielhex wählen
2. falls möglich: Zielspieler wählen
3. Steal bestätigen

### 10.4 Development Card Flow
- Knight: robber flow starten
- Road Building: zwei Straßen nacheinander setzen
- Year of Plenty: zwei Ressourcen wählen
- Monopoly: Ressourcentyp wählen
- Victory Point: passiv, auto-counted

---

## 11. State Machine – Spielphasen

### 11.1 Match Lifecycle
- room_lobby
- game_starting
- setup_phase
- in_progress
- finished
- aborted

### 11.2 Turn Lifecycle
- turn_start
- roll_pending
- resolving_roll
- discard_pending
- robber_pending
- action_phase
- trade_resolution
- build_resolution
- end_turn

### 11.3 Setup Lifecycle
- place_settlement_road_forward
- place_settlement_road_reverse
- distribute_start_resources
- first_turn

### 11.4 Wichtig
Der Server kennt jederzeit:
- active player
- current phase
- pending forced actions
- legal actions set

---

## 12. Game Engine – Command-Modell

### 12.1 Beispiel-Commands
- CREATE_ROOM
- JOIN_ROOM
- TOGGLE_READY
- START_MATCH
- PLACE_INITIAL_SETTLEMENT
- PLACE_INITIAL_ROAD
- ROLL_DICE
- OFFER_TRADE
- RESPOND_TRADE
- TRADE_WITH_BANK
- BUILD_ROAD
- BUILD_SETTLEMENT
- UPGRADE_CITY
- BUY_DEV_CARD
- PLAY_DEV_CARD_KNIGHT
- PLAY_DEV_CARD_MONOPOLY
- PLAY_DEV_CARD_YEAR_OF_PLENTY
- PLAY_DEV_CARD_ROAD_BUILDING
- MOVE_ROBBER
- STEAL_RESOURCE
- DISCARD_RESOURCES
- END_TURN

### 12.2 Beispiel-Events
- ROOM_CREATED
- PLAYER_JOINED
- PLAYER_READY_CHANGED
- MATCH_STARTED
- BOARD_GENERATED
- DICE_ROLLED
- RESOURCES_DISTRIBUTED
- PLAYER_DISCARDED
- ROBBER_MOVED
- RESOURCE_STOLEN
- ROAD_BUILT
- SETTLEMENT_BUILT
- CITY_BUILT
- TRADE_OFFERED
- TRADE_ACCEPTED
- DEV_CARD_BOUGHT
- DEV_CARD_PLAYED
- LONGEST_ROAD_CHANGED
- LARGEST_ARMY_CHANGED
- GAME_WON

---

## 13. Datenmodell – erste Tabellen

### 13.1 rooms
- id
- code
- host_player_id
- status
- max_players
- created_at

### 13.2 room_players
- id
- room_id
- session_id
- display_name
- seat_index
- color
- is_host
- is_ready
- joined_at
- disconnected_at nullable

### 13.3 matches
- id
- room_id
- status
- seed
- started_at
- finished_at
- winner_player_id nullable

### 13.4 match_players
- id
- match_id
- player_id
- turn_order
- final_points
- stats_json

### 13.5 game_snapshots
- id
- match_id
- version
- state_json
- created_at

### 13.6 game_events
- id
- match_id
- sequence
- type
- payload_json
- created_at

---

## 14. Nicht-funktionale Anforderungen

### 14.1 Performance
- Join-to-interactive < 2 Sekunden unter Normalbedingungen
- Broadcast-Latenz < 300 ms anzustreben

### 14.2 Reliability
- Reconnect bei kurzem Tab-Refresh
- idempotente Command-Verarbeitung soweit sinnvoll

### 14.3 UX
- klare Informationen statt maximaler Informationsdichte
- wenige, gut lesbare Modals
- Desktop bei 1440px optimiert, brauchbar ab ca. 1024px

### 14.4 Accessibility light
- farbunabhängige Markierungen ergänzen
- Tastaturfokus für zentrale CTAs
- ausreichend Kontrast

---

## 15. MVP-Risiken
- WebSocket-/Realtime-Setup auf Vercel falsch geschnitten
- Game Engine und UI zu eng gekoppelt
- Trade UX wird unnötig komplex
- Longest-Road-Logik fehleranfällig
- Reconnect-State unsauber
- Hidden-Information-Leaks im Client

---

## 16. Empfohlene MVP-Milestones

### Milestone 1 – Lobby Slice
- Landing
- Create/Join Room
- Realtime Lobby
- Ready / Start

### Milestone 2 – Board Slice
- Board render
- Setup phase
- Turn order
- Dice + resource distribution

### Milestone 3 – Core Gameplay
- Build road/settlement/city
- robber
- bank trade
- longest road / largest army
- win condition

### Milestone 4 – Full Playability
- player trade
- dev cards
- reconnect
- endgame
- polish

---

## 17. Offene Produktentscheidungen
1. Guest-only oder Light-Account?
2. 3 Spieler für MVP zulassen oder strikt 4?
3. Host darf Farben / Seats manuell setzen?
4. Turn Timer ja/nein?
5. Chat im MVP oder nur Event Log?
6. Counteroffers im Trade-System ja/nein? Empfehlung: nein.
7. Rejoin nach Disconnect nur mit gleichem Gerät oder per Magic Link/Token?
8. Observer Mode früh mitdenken oder vollständig später?

---

## 18. Entscheidungsempfehlung für den Start
Für einen realistisch lieferbaren MVP:
- 4 Spieler
- private Räume
- guest sessions
- Desktop first
- keine Counteroffers
- kein Chat, nur Event Log
- Next.js auf Vercel + separater Realtime-Server + Neon Postgres
- deterministische serverautoritativ getestete Engine
