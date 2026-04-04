# Asset Inventory

## Zweck
Kompaktes Produktionsinventar für alle frühen UI-Assets im Scope von `siedler_OG_II`.

Dieses Dokument ist die reduzierte Arbeitsfassung zum ausführlichen `asset-inventory-designer-brief.md`.

---

## Regeln
- Primärformat: SVG
- Player-Farben nach Möglichkeit nicht als separate Asset-Dateien, sondern über Theme / Tint im UI
- Highlights, Overlays und einfache Progress-Marker dürfen später code-generated umgesetzt werden, wenn das technisch sauberer ist
- Alles in dieser Liste ist asset-relevant; Layout, Panels und Standard-Komponenten sind nicht Teil dieses Dokuments

---

## P0 – Core Game Assets

### Ressourcen
- `resource_wood.svg`
- `resource_brick.svg`
- `resource_sheep.svg`
- `resource_wheat.svg`
- `resource_ore.svg`

### Pieces
- `piece_road.svg`
- `piece_settlement.svg`
- `piece_city.svg`
- `piece_robber.svg`

### Tiles
- `tile_forest.svg`
- `tile_hills.svg`
- `tile_pasture.svg`
- `tile_fields.svg`
- `tile_mountains.svg`
- `tile_desert.svg`

### Number Chips
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

### Dice
- `dice_face_1.svg`
- `dice_face_2.svg`
- `dice_face_3.svg`
- `dice_face_4.svg`
- `dice_face_5.svg`
- `dice_face_6.svg`

### Development Cards
- `dev_knight.svg`
- `dev_road_building.svg`
- `dev_year_of_plenty.svg`
- `dev_monopoly.svg`
- `dev_victory_point.svg`

### Ports
- `port_generic_3to1.svg`
- `port_wood_2to1.svg`
- `port_brick_2to1.svg`
- `port_sheep_2to1.svg`
- `port_wheat_2to1.svg`
- `port_ore_2to1.svg`

### Special Badges
- `badge_longest_road.svg`
- `badge_largest_army.svg`

---

## P0 – Room, Lobby and Lifecycle Assets

### Seat / Identity
- `seat_empty.svg`
- `seat_marker_generic.svg`
- `seat_marker_host.svg`
- `seat_color_slot_generic.svg`

### Lobby / Presence
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

### Leave / Disconnect / Room Lifecycle
- `action_leave_room.svg`
- `state_disconnect_grace.svg`
- `state_player_abandoned.svg`
- `state_host_reassigned.svg`
- `state_room_closed.svg`

---

## P0 – Game-State, Forced Flow and Visibility Assets

### Game-State / Guidance
- `state_active_turn.svg`
- `state_waiting.svg`
- `state_forced_action.svg`
- `state_blocked_action.svg`
- `state_hidden_info.svg`
- `card_count_hidden.svg`
- `card_back_hidden.svg`
- `public_trade_offer.svg`

### Forced Flow / Progress
- `flow_step_select_hex.svg`
- `flow_step_select_target_player.svg`
- `flow_step_select_resource_1.svg`
- `flow_step_select_resource_2.svg`
- `flow_step_place_road_1.svg`
- `flow_step_place_road_2.svg`

### Event Log
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

---

## P0 – Endgame / Postgame Assets
- `result_winner.svg`
- `result_final_score.svg`
- `result_victory_cause.svg`
- `state_match_complete.svg`
- `state_postgame_lobby.svg`
- `action_return_to_room.svg`

---

## P1 – Erweiterungen

### Hidden / Card Backs / Alternates
- `card_back_resource_hidden.svg`
- `tile_back_generic.svg`
- `number_chip_back_generic.svg`
- `dice_pair_generic.svg`
- `dev_card_back.svg`

### Seat / Recovery
- `player_color_chip_generic.svg`
- `state_seat_recovered.svg`
- `state_seat_lost.svg`

### Entry / Recovery
- `state_join_by_code.svg`
- `state_create_room.svg`
- `state_resume_game.svg`
- `state_return_to_lobby.svg`
- `state_connection_warning.svg`

### Forced Flow Extensions
- `flow_step_discard_required.svg`
- `flow_step_monopoly_pick_type.svg`

### Event Log Extensions
- `log_player_joined.svg`
- `log_player_left.svg`
- `log_player_reconnected.svg`

### Endgame Extensions
- `action_ready_next_match.svg`
- `action_rematch.svg`
- `result_match_duration.svg`
- `result_special_achievement.svg`

---

## Nicht Teil dieses Inventars
- Buttons als Bilder
- Panels, Modals, Tabs, Listen
- dekorative Frame-Systeme
- Chat-Assets
- mobile-spezifische Sonderassets
- große Marketing-Illustrationen
- hochkomplexe 3D-Render als Produktionspflicht

---

## Reihenfolge für Umsetzung
1. Ressourcen, Pieces, Tiles, Number Chips, Dice
2. Lobby / Presence / Lifecycle
3. Game-State / Forced Flow / Event Log
4. Endgame / Postgame
5. P1-Erweiterungen
