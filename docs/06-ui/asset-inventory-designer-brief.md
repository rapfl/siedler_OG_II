# Asset Inventory – Designer Brief

## Zweck
Dieses Dokument definiert das konkrete Asset-Inventar für den aktuellen Produktumfang und beschreibt die Assets so, dass ein*e Designer*in direkt mit der Gestaltung beginnen kann.

Es beschreibt nur visuelle Dateien und Asset-Sets. Es beschreibt nicht das vollständige UI-System, keine Screen-Layouts und keine Code-Komponenten.

Dieses Inventar ist an der Repo-UX-Struktur ausgerichtet:
- Entry
- Lobby
- Game Screen
- Forced Flows
- Leave / Exit
- Room Lifecycle
- Endgame / Postgame

---

## 1. Arbeitsprinzipien

### 1.1 Ziel des Asset-Systems
Die Assets sollen:
- den Spielzustand schnell lesbar machen,
- zentrale Spielobjekte klar unterscheiden,
- in verschiedenen Screen-Kontexten wiederverwendbar sein,
- technisch sauber in ein modernes Web-Frontend integrierbar sein.

### 1.2 Was hier kein Asset ist
Nicht Teil dieses Dokuments sind:
- Buttons
- Panels
- Modals
- Tabs
- Listen
- generische UI-Flächen
- komplette Screen-Layouts
- reine Textlabels
- Standard-Formelemente

Diese Elemente entstehen später als UI-Komponenten im Frontend bzw. im Design-System.

### 1.3 Gestalterische Leitplanken
Die Assets sollen:
- klar, lesbar, modular und systematisch sein,
- eher produktorientiert als illustrativ-chaotisch wirken,
- im Spielkontext auch in kleiner Größe funktionieren,
- nicht überdekoriert sein,
- sich für einen Desktop-first Strategy / Board-Game-Hybrid eignen.

Noch nicht festgelegt in diesem Dokument:
- finale Farbpalette
- finale Typografie
- vollständiger Stilentscheid zwischen sehr flach vs. materialhaft
- Motion-Verhalten

Darum soll der*die Designer*in zunächst mit stilistisch kontrollierten Master-Assets arbeiten, nicht mit finalen Marketing-Illustrationen.

---

## 2. Produktionsvorgaben

### 2.1 Primäre Dateiformate
Primärformat:
- SVG

Nur falls später nötig:
- PNG für Fallbacks oder texturierte Spezialfälle

### 2.2 Master-Dateien
Für jedes Asset soll es geben:
- 1 Master-Version
- 1 kleine UI-taugliche Version bzw. skalierbare saubere Vektorversion
- falls nötig: 1 monochrome / reduced version

### 2.3 Technische Anforderungen
Assets müssen:
- auf hellem und dunklem Untergrund funktionieren,
- in kleinen Größen lesbar bleiben,
- ohne feine unnötige Details auskommen,
- in monochrom oder per Theme-Farbe adaptierbar sein, wo sinnvoll.

### 2.4 Benennungslogik
Dateinamen immer:
- klein geschrieben
- snake_case
- ohne Leerzeichen
- ohne Versionsnummer im finalen Working Set

Beispiele:
- `resource_wood.svg`
- `badge_longest_road.svg`
- `log_trade_offer.svg`

---

## 3. Priorisierung

### P0 – Muss für ersten visuellen Produktaufbau vorhanden sein
Diese Assets werden für den ersten ernsthaften UI-/Screen-Entwurf benötigt.

### P1 – Sehr sinnvoll für vollständigen MVP-Flow
Diese Assets sollten früh mitgedacht werden, können aber nach P0 finalisiert werden.

### P2 – Optional / nur falls im Stilkonzept nötig
Diese Assets sind keine frühe Blockade.

---

## 4. Asset-Gruppen

### 4A. Ressourcen-Assets
Ziel:
Ressourcen müssen im gesamten Produkt schnell unterscheidbar sein: in Hand / Inventory, in Trades, in Discard-Zuständen, im Event Log.

Stilanforderung:
- klare, eigenständige Silhouetten
- gute Unterscheidbarkeit auch ohne Farbe
- eher symbolisch als realistisch

Assets:

P0
- `resource_wood.svg` – Holz
- `resource_brick.svg` – Lehm / Brick
- `resource_sheep.svg` – Wolle / Sheep
- `resource_wheat.svg` – Getreide / Wheat
- `resource_ore.svg` – Erz / Ore

P1
- `card_back_resource_hidden.svg` – verdeckte Ressourcen- oder Count-Semantik

### 4B. Bau- und Spielfiguren-Assets
Ziel:
Diese Assets repräsentieren die Kernobjekte auf dem Board und in Statusanzeigen.

Stilanforderung:
- extrem klare Grundformen
- in sehr klein noch verständlich
- gut tint- / färbbar für Spielerfarben

Assets:

P0
- `piece_road.svg` – Straße
- `piece_settlement.svg` – Siedlung
- `piece_city.svg` – Stadt
- `piece_robber.svg` – Räuber

### 4C. Hex- und Board-Tile-Assets
Ziel:
Die Board-Tiles definieren die Spiellandschaft und Ressourcenzuordnung.

Stilanforderung:
- konsistente Grundgeometrie
- ressourcentypische Charakteristik
- keine übermäßig detailreiche Illustration

Assets:

P0
- `tile_forest.svg`
- `tile_hills.svg`
- `tile_pasture.svg`
- `tile_fields.svg`
- `tile_mountains.svg`
- `tile_desert.svg`

P1
- `tile_back_generic.svg`

### 4D. Number-Chip-Assets
Ziel:
Produktionszahlen müssen auf dem Board gut lesbar und eindeutig sein.

Stilanforderung:
- hohe Lesbarkeit
- ruhiger, funktionaler Stil
- geeignet als Overlay auf Tiles

Assets:

P0
- `number_chip_2.svg`
- `number_chip_3.svg`
- `number_chip_4.svg`
- `number_chip_5.svg`
- `number_chip_6.svg`
- `number_chip_8.svg`
- `number_chip_9.svg`
- `number_chip_10.svg`
- `number_chip_11.svg`
- `number_chip_12.svg`

P1
- `number_chip_back_generic.svg`

Hinweis:
7 wird nicht als Produktionschip benötigt.

### 4E. Würfel-Assets
Ziel:
Würfeln ist Teil des Kernloops und muss im Spielkontext klar lesbar sein.

Assets:

P0
- `dice_face_1.svg`
- `dice_face_2.svg`
- `dice_face_3.svg`
- `dice_face_4.svg`
- `dice_face_5.svg`
- `dice_face_6.svg`

P1
- `dice_pair_generic.svg`

### 4F. Entwicklungskarten-Assets
Ziel:
Development-Card-Typen müssen schnell identifizierbar sein.

Assets:

P0
- `dev_knight.svg`
- `dev_road_building.svg`
- `dev_year_of_plenty.svg`
- `dev_monopoly.svg`
- `dev_victory_point.svg`

P1
- `dev_card_back.svg`

### 4G. Hafen-Assets
Ziel:
Häfen müssen als spezielle Trade-Orte sichtbar und unterscheidbar sein.

Assets:

P0
- `port_generic_3to1.svg`
- `port_wood_2to1.svg`
- `port_brick_2to1.svg`
- `port_sheep_2to1.svg`
- `port_wheat_2to1.svg`
- `port_ore_2to1.svg`

### 4H. Sonderwertungs-Assets
Ziel:
Diese Assets markieren spielrelevante Sonderwertungen und müssen im Game und Endgame funktionieren.

Assets:

P0
- `badge_longest_road.svg`
- `badge_largest_army.svg`

### 4I. Seat-, Player- und Color-Identity-Assets
Ziel:
Lobby und Room-Zustände brauchen klare visuelle Semantik für Identität, Sitzplatz und Farbe.

Assets:

P0
- `seat_empty.svg`
- `seat_marker_generic.svg`
- `seat_marker_host.svg`
- `seat_color_slot_generic.svg`

P1
- `player_color_chip_generic.svg`
- `state_seat_recovered.svg`
- `state_seat_lost.svg`

### 4J. Lobby-, Presence- und Room-State-Assets
Ziel:
Diese Assets unterstützen Entry, Lobby, Room-Status, Präsenz und Reconnect.

Assets:

P0
- `status_ready.svg`
- `status_not_ready.svg`
- `role_host.svg`
- `action_share.svg`
- `presence_joined.svg`
- `presence_connected.svg`
- `presence_disconnected.svg`
- `seat_reserved.svg`
- `state_reconnect.svg`
- `state_room_full.svg`
- `state_invalid_link.svg`

P1
- `state_join_by_code.svg`
- `state_create_room.svg`

### 4K. Leave-, Disconnect- und Room-Lifecycle-Assets
Ziel:
Bewusstes Verlassen, technischer Disconnect, Grace-Zeitraum, Host-Wechsel und Room-Ende müssen semantisch klar unterscheidbar sein.

Assets:

P0
- `action_leave_room.svg`
- `state_disconnect_grace.svg`
- `state_player_abandoned.svg`
- `state_host_reassigned.svg`
- `state_room_closed.svg`

P1
- `state_resume_game.svg`
- `state_return_to_lobby.svg`

### 4L. Spielzustand- und Guidance-Assets
Ziel:
Diese Assets markieren UI-seitig zentrale Zustände und Prioritäten.

Assets:

P0
- `state_active_turn.svg`
- `state_waiting.svg`
- `state_forced_action.svg`
- `state_blocked_action.svg`
- `state_hidden_info.svg`
- `card_count_hidden.svg`
- `card_back_hidden.svg`
- `public_trade_offer.svg`

P1
- `state_connection_warning.svg`

### 4M. Forced-Flow- und Progress-Assets
Ziel:
Mehrschrittige Pflichtauflösungen brauchen kleine, klare Fortschritts- und Schrittsymbole.

Assets:

P0
- `flow_step_select_hex.svg`
- `flow_step_select_target_player.svg`
- `flow_step_select_resource_1.svg`
- `flow_step_select_resource_2.svg`
- `flow_step_place_road_1.svg`
- `flow_step_place_road_2.svg`

P1
- `flow_step_discard_required.svg`
- `flow_step_monopoly_pick_type.svg`

### 4N. Event-Log-Assets
Ziel:
Der Event Log soll wichtige Spielereignisse schnell scannbar machen.

Assets:

P0
- `log_dice_roll.svg`
- `log_resource_production.svg`
- `log_discard.svg`
- `log_robber_move.svg`
- `log_steal.svg`
- `log_build.svg`
- `log_trade_offer.svg`
- `log_trade_accept.svg`
- `log_dev_card_play.svg`
- `log_longest_road.svg`
- `log_largest_army.svg`
- `log_victory.svg`

P1
- `log_player_joined.svg`
- `log_player_left.svg`
- `log_player_reconnected.svg`

### 4O. Endgame- und Postgame-Assets
Ziel:
Endgame und Postgame-Lobby sollen klar und knapp lesbar sein.

Assets:

P0
- `result_winner.svg`
- `result_final_score.svg`
- `result_victory_cause.svg`
- `state_match_complete.svg`
- `state_postgame_lobby.svg`
- `action_return_to_room.svg`

P1
- `action_ready_next_match.svg`
- `action_rematch.svg`
- `result_match_duration.svg`
- `result_special_achievement.svg`

---

## 5. Assets, die zunächst nicht produziert werden sollen

Diese Dinge sind vorerst bewusst ausgeschlossen:
- komplette Button-Sets als Grafiken
- dekorative Frame-Sammlungen
- großformatige Splash-Illustrationen
- Chat-spezifische Asset-Sets
- mobile-spezifische Sonderassets
- marketingartige Character-Illustrationen
- hochkomplexe texturierte Board-Art
- 3D-Render als Produktionspflicht

Hinweis zu Rematch:
Rematch ist nicht Kernpflicht des frühen MVP. Falls Rematch im UI visuell antizipiert wird, reichen zunächst minimale Aktions- oder State-Assets.

---

## 6. Arbeitsreihenfolge für Design

### Phase 1 – Stilproben
Zuerst erstellen:
- 1 Stilrichtung für Ressourcen
- 1 Stilrichtung für Piece-Set
- 1 Stilrichtung für Hex-Tiles
- 1 Stilrichtung für Seat- / Presence- / State-Icons
- 1 Stilrichtung für Log- / Forced-Flow-Icons

### Phase 2 – P0 Master Set
Dann vollständig gestalten:
- Ressourcen
- Bauen / Robber
- Tiles
- Number Chips
- Dice Set
- Development Cards
- Ports
- Badges
- Seat / Lobby / Presence / Lifecycle Icons
- Game-State / Hidden-Info / Guidance Icons
- Forced-Flow Step Icons
- Event Log Icons
- Endgame / Postgame Minimalset

### Phase 3 – Reduktionstest
Alle Assets prüfen in:
- sehr klein
- monochrom
- ohne Farbe
- dunklem Hintergrund
- hellem Hintergrund

### Phase 4 – P1 Ergänzungen
Erst danach:
- Back-Sides
- optionale Recovery- / Entry-Icons
- optionale Statistik-Icons
- optionale Rematch-Erweiterung

---

## 7. Designer Deliverables

Der*die Designer*in soll liefern:

### 7.1 Asset-Files
- alle P0 Assets als SVG
- sauber benannt
- logisch gruppiert

### 7.2 Vorschauübersicht
- ein Board mit allen Ressourcen
- ein Board mit allen Piece-Assets
- ein Board mit Tiles, Number Chips und Dice
- ein Board mit Seat- / Presence- / Room-State-Assets
- ein Board mit Game-State- / Forced-Flow- / Log-Assets
- ein Board mit Ports / Badges / Endgame / Postgame Assets

### 7.3 Stil-Referenz
- kurze visuelle Stilbeschreibung
- 2–3 Leitregeln zur Formensprache
- 2–3 Leitregeln zu Detailgrad und Kontrast

### 7.4 Export-Check
- geprüft auf Lesbarkeit in klein
- geprüft auf Konsistenz im Set
- geprüft auf technische Sauberkeit

---

## 8. Offene Entscheidungen, die parallel geklärt werden können

Diese Punkte dürfen die Asset-Produktion nicht blockieren, sollten aber parallel entschieden werden:
- eher flache Symbolik vs. leicht materieller Look
- ob Hex-Tiles sehr reduziert oder leicht szenisch sein sollen
- ob Resource Icons allein stehen oder in Token- / Badge-Containern gedacht werden
- ob Number Chips typografisch nüchtern oder leicht spielhafter wirken sollen
- wie stark Badges / Endgame celebratory sein dürfen
- wie stark Seat- / Presence-Status technisch vs. warm wirken sollen

---

## 9. Kurzfassung für den Start

Wenn nur ein einziger Sprint beauftragt wird, soll der*die Designer*in zunächst genau diese fünf Pakete entwerfen:
1. Ressourcen-Set
2. Piece-Set inklusive Robber
3. Hex-Tile-Set inklusive Number Chips und Dice
4. Seat- / Presence- / Room-State-Set
5. Game-State- / Forced-Flow- / Log-Set

Wenn diese fünf Pakete sitzen, kann fast das gesamte erste Produkt-UI visuell aufgebaut werden.
