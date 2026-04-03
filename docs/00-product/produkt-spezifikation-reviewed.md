# Produktspezifikation – Siedler-ähnlicher Online-Multiplayer MVP (reviewed)

## 0. Status dieses Dokuments
Diese Version ersetzt fachlich die erste Produktspezifikation als **kanonische Referenz für die weitere Ausarbeitung**.

Sie wurde nachträglich gegen öffentlich verfügbare Informationen zu:
- dem Base Game von CATAN,
- den öffentlichen Colonist-Regelseiten,
- sowie den öffentlich sichtbaren Colonist-Room-/Lobby-Flows
abgeglichen.

Ziel ist **keine 1:1-Kopie von Colonist**, sondern:
- **regelnahe Abbildung des klassischen Base Games**,
- kombiniert mit einer **Colonist-inspirierten Room-/Lobby-Struktur**,
- aber mit bewusst eigenem Produktzuschnitt für einen privaten Friends-MVP.

---

## 1. Produktziel
Browserbasierte Multiplayer-Webapp im Stil eines modernen Catan-/Colonist-ähnlichen Spiels für kleine private Runden.

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
- Base Game first statt Erweiterungen
- Geringe Friction beim Joinen
- Klare State-Machine statt impliziter Spiellogik
- Deterministische serverautoritativ validierte Game Engine
- Colonist dient als UX-Referenz, nicht als Voll-Paritätsziel

### 2.2 Nicht-Ziele des MVP
- keine Erweiterungen
- kein Ranked / ELO / Ladder
- keine Bots
- keine globale Lobby mit vollwertigem Open-Room-System
- keine Freundeslisten / Social Graph
- kein Ingame-Voice
- keine Cosmetics / Shop / Monetization
- kein Mobile-optimiertes Vollerlebnis

---

## 3. Produkt-Definition

### 3.1 Elevator Pitch
Ein schlanker, privater Online-Siedler-Klon für Freundesrunden: Raum erstellen, Link teilen, gemeinsam spielen – direkt im Browser.

### 3.2 Zielgruppe
- Freundesgruppen, die das Basisspiel online spielen wollen
- kleine Testgruppen / Bekannte
- early adopters aus dem Umfeld

### 3.3 Primary User Story
Als Host möchte ich in unter 60 Sekunden einen privaten Raum erstellen, meinen Freund*innen einen Join-Link schicken und ein komplettes Spiel störungsfrei starten können.

### 3.4 Secondary User Story
Als Mitspieler möchte ich per Link schnell beitreten, meinen Namen wählen, ready klicken und das Spiel ohne Regelunklarheiten spielen können.

---

## 4. Abgleich mit öffentlichem Referenzmaterial

### 4.1 Was wir aus Colonist als Referenz übernehmen
Für den MVP dient Colonist vor allem als Referenz für:
- Room erstellen / Room beitreten
- Invite-Link / Join-Code
- Ready-Status in der Lobby
- Host startet das Spiel
- Chat/Event-Log-Denke
- konfigurierbare Room-Optionen als späterer Ausbaupfad

### 4.2 Was wir ausdrücklich **nicht** übernehmen müssen
- offene öffentliche Lobbies als Kernprodukt
- Ranked / Casual / Bots / Spectate als MVP-Kern
- sämtliche Colonist-spezifischen Modi, Maps oder Membership-Logik
- Colonist Rush oder andere Nicht-Standard-Modi

### 4.3 Harte Referenzregel
Bei Konflikten zwischen „Colonist-UX“ und „Base-Game-Regellogik“ gilt für dieses Projekt:

**Die Regellogik orientiert sich am klassischen Base Game; Colonist ist primär UX- und Produkt-Flow-Referenz.**

---

## 5. MVP Scope – Funktionsumfang

### 5.1 Im Scope
- privater Raum mit Join-Code / Join-Link
- 3–4 menschliche Spieler
- Host kann Spiel starten
- Namen wählen
- Sitz- und Farbzuweisung entweder automatisch oder hostgesteuert light
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
- Event-Log
- optional einfacher Room-Chat in MVP+ statt im initialen Kern
- Sichtbarkeit eigener Handkarten, fremde Karten nur als Count
- Reconnect innerhalb laufender Session
- Spielende-Screen mit Gewinner und Statistik light

### 5.2 Optional für MVP+
- spectator mode
- emotes / quick chat
- host can kick player
- simple rematch
- friendlier reconnect flow
- tutorial hints
- Room Settings wie Turn Timer, max players, advanced rules toggles

### 5.3 Out of Scope
- Expansion Maps
- Ranked
- Bots
- Achievements
- native mobile app
- Colonist-Rush-artige Parallelspielmodi

---

## 6. Verifizierte Regelbasis für den MVP

### 6.1 Siegbedingung
- Sieg bei 10 Punkten
- Punkte aus:
  - Siedlungen
  - Städten
  - Victory Point Development Cards
  - Longest Road
  - Largest Army

### 6.2 Initial Placement
- Jeder Spieler setzt zwei Siedlungen und zwei Straßen
- Placement erfolgt in Snake Order
- Startressourcen kommen aus den Hexes an der **zweiten** gesetzten Siedlung
- Auch im Setup gilt die Distanzregel für Siedlungen

### 6.3 Produktion
- Siedlung produziert 1 Ressource
- Stadt produziert 2 Ressourcen
- Produktion erfolgt nach dem Würfelwurf gemäß Zahlentoken, sofern der Robber das Hex nicht blockiert

### 6.4 Würfeln und 7er-Regel
Wenn eine 7 gewürfelt wird:
1. Alle Spieler mit **8 oder mehr** Ressourcenkarten discarden die Hälfte, abgerundet bei ungerader Zahl
2. Erst nach vollständiger Discard-Auflösung wird der Robber bewegt
3. Danach wird – falls möglich – genau 1 zufällige Ressource von einem betroffenen Spieler gestohlen
4. Erst danach geht der normale Zug weiter

**Wichtig für die Spezifikation:** Vor der vollständigen Auflösung einer gewürfelten 7 darf nicht gehandelt oder normal weitergebaut werden.

### 6.5 Robber-Regeln
- Der Robber muss auf ein **anderes** Hex bewegt werden als das, auf dem er aktuell steht
- Der Robber darf auf das Desert-Hex bewegt werden
- Wird der Robber wegen einer 7 oder eines Knight auf das Desert gesetzt und es gibt dort angrenzende gegnerische Gebäude, darf trotzdem gestohlen werden
- Der Robber blockiert Produktion, aber nicht das Bauen und nicht die Nutzung eines Hafens als solchen

### 6.6 Entwicklungskarten
Für den MVP gelten explizit diese Regeln:
- Ein Spieler darf pro Zug **beliebig viele** Entwicklungskarten kaufen, sofern er bezahlen kann
- Ein Spieler darf pro Zug **nur 1** Entwicklungskarte spielen
- Eine im aktuellen Zug gekaufte Entwicklungskarte darf **nicht im selben Zug** gespielt werden
- Entwicklungskarten dürfen **vor dem Würfeln** gespielt werden
- Entwicklungskarten dürfen generell jederzeit im eigenen Zug innerhalb der Zuglogik gespielt werden, soweit der Effekt legal ist
- Victory-Point-Karten sind Sonderfall: sie zählen verdeckt und werden bei Bedarf zum Gewinnen offenbart

### 6.7 Knight
- Knight löst Robber-Move + Steal aus
- Knight triggert **keine** 7er-Discard-Regel
- Knight darf auch dann gespielt werden, wenn der Robber das eigene Hex aktuell nicht blockiert

### 6.8 Largest Army
- Minimum 3 **gespielte** Knight Cards erforderlich
- Nicht gespielte Knight Cards zählen nicht
- Bei mehr gespielten Knights wechselt Largest Army zum neuen Führenden

### 6.9 Longest Road
- Minimum 5 zusammenhängende Straßenstücke erforderlich
- Eine gegnerische Siedlung oder Stadt kann eine Straße unterbrechen
- Eigene Siedlungen / Städte unterbrechen die eigene zusammenhängende Straße **nicht**
- Bei Gleichstand bleibt die Karte beim aktuellen Inhaber

### 6.10 Trading
- Player-to-player trades sind nur im Zug des aktiven Spielers erlaubt
- Trades müssen immer Ressourcen gegen Ressourcen sein; kein „etwas für nichts“, kein Kredit, keine Services
- Bank Trade: 4:1 Standard
- Generic Port: 3:1
- Special Port: 2:1 für den angegebenen Ressourcentyp

### 6.11 Siegzeitpunkt
- Das Spiel endet sofort, sobald ein Spieler auf seinem Zug die erforderlichen Siegpunkte erreicht
- Hat ein Spieler zu Beginn seines Zugs bereits genügend Punkte, muss er nicht mehr würfeln
- Victory-Point-Karten dürfen zum Gewinnen offengelegt werden

---

## 7. Produktentscheidung: Regeln exakt vs. UX-adaptiert
Die Regeln bleiben weitgehend klassisch, die UX wird digital optimiert:
- klar geführte Zugphasen
- nur zulässige Aktionen aktivierbar
- Trade UX explizit mit „du gibst“ / „du erhältst“
- visuelles Preview vor Build-Confirm
- forced actions blockieren den restlichen Turn Flow sichtbar und unmissverständlich

### 7.1 Harte Designregel
Der Client schlägt nur Aktionen vor. Der Server validiert jede Aktion und schreibt allein den offiziellen Spielzustand.

---

## 8. High-Level User Flows

### 8.1 Flow A – Host erstellt privaten Raum
1. Landing Page öffnen
2. „Spiel erstellen“ klicken
3. Namen eingeben
4. Raum wird erstellt
5. Host landet im Lobby-Screen
6. Join-Link / Code wird angezeigt
7. Host teilt Link mit Friends
8. Spieler treten bei
9. Spieler markieren sich als ready
10. Host startet das Spiel

### 8.2 Flow B – Spieler tritt per Link bei
1. Join-Link öffnen
2. Name eingeben
3. Raum beitreten
4. Lobby sehen
5. Ready klicken
6. Auf Spielstart warten

### 8.3 Flow C – Initial Placement
1. Spiel startet
2. Spielerreihenfolge steht fest
3. Erste Runde: jeder Spieler setzt Settlement + zugehörige Road
4. Zweite Runde in umgekehrter Reihenfolge: jeder Spieler setzt Settlement + Road
5. Startressourcen aus der zweiten Siedlung werden verteilt
6. Übergang in den ersten regulären Zug

### 8.4 Flow D – Regulärer Zug
1. Turn-Start-Check auf sofortigen Sieg
2. Optional: 1 Development Card spielen, falls legal
3. Würfeln, falls der Zug nicht bereits durch Win-Condition endet
4. Ressourcen verteilen oder 7-Flow vollständig auflösen
5. Aktiver Spieler kann handeln, bauen, weitere Karten kaufen und – falls noch keine gespielt wurde – 1 Development Card spielen
6. Spieler beendet Zug
7. Nächster Spieler ist dran

### 8.5 Flow E – Trade
1. Aktiver Spieler öffnet Trade-Panel
2. Gibt an: offer / want
3. Trade wird an Mitspieler ausgespielt
4. Andere Spieler können annehmen oder ablehnen
5. Aktiver Spieler bestätigt einen Deal
6. Server validiert Besitz und führt Transfer atomar aus

### 8.6 Flow F – Robber / Discard
1. 7 wird gewürfelt oder Knight gespielt
2. Falls 7: betroffene Spieler discarden zuerst
3. Aktiver Spieler wählt ein anderes Robber-Zielhex
4. Falls legal: Zielspieler zum Stehlen auswählbar
5. Zufallsressource wird transferiert
6. Zug kehrt in die normale Aktionsphase zurück

### 8.7 Flow G – Spielende
1. Eine Aktion oder ein Turn-Start-Check löst die erforderliche Punktzahl aus
2. Server prüft Win-Condition sofort
3. Match wird beendet
4. Victory Screen mit Sieger und Stats
5. optional Rematch / Zur Lobby in MVP+

---

## 9. Screen-Liste
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

## 10. Screen-Spezifikation – fachliche Mindestanforderungen

### 10.1 Landing / Home
**Ziel:** schneller Einstieg

**Primary CTA:**
- Spiel erstellen
- Spiel beitreten

**Inhalte:**
- Produktname / kurze Beschreibung
- zwei dominante CTAs
- optional Feld für Join-Code

### 10.2 Create Room
**Ziel:** privaten Raum in einem Schritt anlegen

**Inputs:**
- Player Name
- optional Room Name
- optional Max Players (Default 4, optional 3)

**Output:**
- room id
- join code
- host token/session

### 10.3 Join Room
**Ziel:** per Code/Link beitreten

**Validierungen:**
- room exists
- room not full
- room joinable oder reconnectable
- name length

### 10.4 Lobby
**Ziel:** vor Spielstart organisieren

**Elemente:**
- Room Code / Copy Link
- Player List mit Ready Status
- Host Badge
- optional Color Selection
- Start Button für Host
- Leave Room
- einfacher Chat optional später

**Wichtig:**
Colonist zeigt öffentlich sichtbar eine Room-/Lobby-Struktur mit Ready-State, Start-Button, Invite-Funktion und Chat-Bereich. Das ist ein valider UX-Referenzpunkt für unseren MVP, ohne dass alle Colonist-Optionen übernommen werden müssen.

### 10.5 Haupt-Spielscreen
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
- Development Card spielen
- Würfeln
- Zug beenden
- Bauen
- Trade öffnen
- Bankhandel
- Entwicklungskarte kaufen

**Wichtig:**
Forced States wie Discard oder Robber-Move müssen den Rest der Aktionsphase sperren.

---

## 11. Detaillierte Modals / Sonderflows

### 11.1 Trade Modal
**Tabs / Modi:**
- Mit Spielern handeln
- Mit Bank handeln

**MVP-Entscheidung empfohlen:**
- Offer → accept/reject
- Keine Counteroffers in V1

### 11.2 Discard Modal
**Trigger:** Spieler mit 8+ Karten bei Würfel 7

**UX:**
- nicht schließbar
- zeigt Handkarten und benötigte Discard-Anzahl
- Confirm erst möglich, wenn exakt richtige Anzahl gewählt

### 11.3 Robber Modal
**Steps:**
1. Zielhex wählen
2. falls möglich: Zielspieler wählen
3. Steal bestätigen

**Wichtig:**
Das Zielhex muss sich vom aktuellen Robber-Hex unterscheiden.

### 11.4 Development Card Flow
- Knight: robber flow starten, ohne 7er-Discard
- Road Building: zwei Straßen nacheinander setzen
- Year of Plenty: zwei Ressourcen wählen
- Monopoly: Ressourcentyp wählen
- Victory Point: verdeckt halten, bei Sieg offenlegen

---

## 12. State Machine – Spielphasen

### 12.1 Match Lifecycle
- room_lobby
- game_starting
- setup_phase
- in_progress
- finished
- aborted

### 12.2 Turn Lifecycle
- turn_start
- pre_roll_devcard_window
- roll_pending
- resolving_roll
- discard_pending
- robber_pending
- action_phase
- trade_resolution
- build_resolution
- end_turn

### 12.3 Setup Lifecycle
- place_settlement_road_forward
- place_settlement_road_reverse
- distribute_start_resources
- first_turn

### 12.4 Wichtig
Der Server kennt jederzeit:
- active player
- current phase
- pending forced actions
- legal actions set
- visibility projection je Spieler

---

## 13. Command-Modell – korrigierte Mindestmenge

### 13.1 Room / Session
- CREATE_ROOM
- JOIN_ROOM
- TOGGLE_READY
- START_MATCH
- RECONNECT_SESSION

### 13.2 Setup
- PLACE_INITIAL_SETTLEMENT
- PLACE_INITIAL_ROAD

### 13.3 Turn / Rules
- PLAY_DEV_CARD_KNIGHT
- PLAY_DEV_CARD_MONOPOLY
- PLAY_DEV_CARD_YEAR_OF_PLENTY
- PLAY_DEV_CARD_ROAD_BUILDING
- ROLL_DICE
- DISCARD_RESOURCES
- MOVE_ROBBER
- STEAL_RESOURCE
- OFFER_TRADE
- RESPOND_TRADE
- TRADE_WITH_BANK
- BUILD_ROAD
- BUILD_SETTLEMENT
- UPGRADE_CITY
- BUY_DEV_CARD
- END_TURN

---

## 14. Datenmodell – erste Tabellen

### 14.1 rooms
- id
- code
- host_player_id
- status
- max_players
- created_at

### 14.2 room_players
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

### 14.3 matches
- id
- room_id
- status
- seed
- started_at
- finished_at
- winner_player_id nullable

### 14.4 match_players
- id
- match_id
- player_id
- turn_order
- final_points
- stats_json

### 14.5 game_snapshots
- id
- match_id
- version
- public_state_json
- hidden_state_json
- created_at

### 14.6 game_events
- id
- match_id
- sequence
- type
- payload_json
- created_at

---

## 15. Nicht-funktionale Anforderungen

### 15.1 Performance
- Join-to-interactive < 2 Sekunden unter Normalbedingungen
- Broadcast-Latenz < 300 ms anzustreben

### 15.2 Reliability
- Reconnect bei kurzem Tab-Refresh
- idempotente Command-Verarbeitung soweit sinnvoll

### 15.3 UX
- klare Informationen statt maximaler Informationsdichte
- wenige, gut lesbare Modals
- Desktop bei 1440px optimiert, brauchbar ab ca. 1024px

### 15.4 Accessibility light
- farbunabhängige Markierungen ergänzen
- Tastaturfokus für zentrale CTAs
- ausreichend Kontrast

---

## 16. MVP-Risiken
- WebSocket-/Realtime-Setup auf Vercel falsch geschnitten
- Game Engine und UI zu eng gekoppelt
- Trade UX wird unnötig komplex
- Longest-Road-Logik fehleranfällig
- Reconnect-State unsauber
- Hidden-Information-Leaks im Client
- Dev-Card-Timing wird inkonsistent modelliert

---

## 17. Entscheidungsempfehlung für den Start
Für einen realistisch lieferbaren MVP:
- 3–4 Spieler technisch zulassen, 4 Spieler als Standard
- private Räume
- guest sessions
- Desktop first
- keine Counteroffers
- kein voller Chat im initialen Kern, nur Event Log
- Next.js auf Vercel + separater Realtime-Server + Neon Postgres
- deterministische serverautoritativ getestete Engine

---

## 18. Arbeitsregel ab jetzt
Ab der nächsten Spezifikationsstufe – insbesondere für `02-ux`, `03-game-rules` und `04-api` – ist **dieses reviewed-Dokument** die fachliche Referenz, nicht die erste Version.