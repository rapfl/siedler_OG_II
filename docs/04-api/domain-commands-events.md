# Domain Commands and Events Specification

## Zweck
Dieses Dokument definiert die fachlichen Commands und Events für `siedler_OG_II`.

Es legt fest:
- welche Commands der Client fachlich auslösen kann,
- welche semantischen Payloads diese Commands haben,
- welche Domain Events daraus entstehen,
- und wie Commands und Events voneinander getrennt werden.

Dieses Dokument ist die Brücke zwischen:
- Rule Engine
- Socket Contracts
- späterer Implementierung von DTOs / Types / Serializern.

---

## 1. Grundprinzip

### 1.1 Commands sind Intents
Commands drücken aus, was ein Akteur tun möchte.

Beispiele:
- „Ich will würfeln“
- „Ich will diese Straße bauen“
- „Ich will dieses Trade-Angebot senden“

### 1.2 Events beschreiben, was fachlich passiert ist
Events sind Resultate erfolgreicher State-Mutationen.

Beispiele:
- `DICE_ROLLED`
- `ROAD_BUILT`
- `TRADE_OFFERED`
- `GAME_WON`

### 1.3 Rejections sind keine Domain Events
Abgelehnte Commands sind Transport-/Application-Ergebnisse, aber keine fachlichen Mutationsereignisse im Spielverlauf.

---

## 2. Command Envelope

Jeder Command sollte in einem stabilen Envelope ankommen.

## 2.1 Minimale Felder
- `commandId`
- `commandType`
- `actorPlayerId` oder aus Session abgeleitet
- `roomId`
- optional `matchId`
- `payload`
- optional `clientStateVersion`
- optional `submittedAt`

## 2.2 Grundregel
Der fachliche Teil liegt in `commandType + payload`.

---

## 3. Command-Familien

## 3.1 Room Commands

### `CREATE_ROOM`
Payload:
- `displayName`
- optional `roomName`
- optional `desiredPlayerCount`

### `JOIN_ROOM`
Payload:
- `displayName`
- `roomCode` oder `roomId`
- optional `resumeToken`

### `TOGGLE_READY`
Payload:
- `isReady`

### `REASSIGN_SEAT`
Payload:
- `targetSeatIndex`
- optional `targetPlayerId`

### `REASSIGN_COLOR`
Payload:
- `color`
- optional `targetPlayerId`

### `START_MATCH`
Payload:
- none oder optional match options

### `EXPLICIT_LEAVE`
Payload:
- optional `reason`

---

## 3.2 Setup Commands

### `PLACE_INITIAL_SETTLEMENT`
Payload:
- `intersectionId`

### `PLACE_INITIAL_ROAD`
Payload:
- `edgeId`

---

## 3.3 Turn Commands

### `ROLL_DICE`
Payload:
- none

### `END_TURN`
Payload:
- none

---

## 3.4 Build Commands

### `BUILD_ROAD`
Payload:
- `edgeId`
- optional `source: normal | road_building_devcard`

### `BUILD_SETTLEMENT`
Payload:
- `intersectionId`

### `UPGRADE_CITY`
Payload:
- `intersectionId`

---

## 3.5 Trade Commands

### `OFFER_TRADE`
Payload:
- `offerResources`
- `requestResources`

`offerResources` / `requestResources` sind normalisierte Ressourcenkartenmengen, z. B.:
- wood
- brick
- sheep
- wheat
- ore

### `RESPOND_TRADE`
Payload:
- `tradeId`
- `response: accept | reject`

### `CONFIRM_TRADE`
Payload:
- `tradeId`
- `counterpartyPlayerId`

### `CANCEL_TRADE`
Payload:
- `tradeId`

### `TRADE_WITH_BANK`
Payload:
- `giveResourceType`
- `giveAmount`
- `receiveResourceType`
- `receiveAmount`

---

## 3.6 Development Card Commands

### `BUY_DEV_CARD`
Payload:
- none

### `PLAY_DEV_CARD_KNIGHT`
Payload:
- none

### `PLAY_DEV_CARD_YEAR_OF_PLENTY`
Payload:
- none (Resolution-Followups separat)

### `PLAY_DEV_CARD_MONOPOLY`
Payload:
- none (Resolution-Followup separat)

### `PLAY_DEV_CARD_ROAD_BUILDING`
Payload:
- none (Resolution-Followups separat)

---

## 3.7 Resolution Commands

### `DISCARD_RESOURCES`
Payload:
- `resourcesToDiscard`

### `MOVE_ROBBER`
Payload:
- `targetHexId`

### `STEAL_RESOURCE`
Payload:
- `victimPlayerId`

### `PICK_YEAR_OF_PLENTY_RESOURCE`
Payload:
- `resourceType`

### `PICK_MONOPOLY_RESOURCE_TYPE`
Payload:
- `resourceType`

---

## 4. Domain Event Envelope

Empfohlene Felder für Events:
- `eventId`
- `sequence`
- `eventType`
- `roomId`
- optional `matchId`
- `payload`
- `createdAt`

Optional:
- `causedByCommandId`
- `actorPlayerId`

---

## 5. Room Events

### `ROOM_CREATED`
Payload:
- `roomId`
- `hostPlayerId`

### `PLAYER_JOINED_ROOM`
Payload:
- `playerId`
- `seatIndex`
- `displayName`

### `PLAYER_LEFT_ROOM`
Payload:
- `playerId`
- `reason: explicit_leave | expired | removed`

### `PLAYER_READY_CHANGED`
Payload:
- `playerId`
- `isReady`

### `HOST_REASSIGNED`
Payload:
- `oldHostPlayerId`
- `newHostPlayerId`

### `PLAYER_SEAT_CHANGED`
Payload:
- `playerId`
- `fromSeatIndex`
- `toSeatIndex`

### `PLAYER_COLOR_CHANGED`
Payload:
- `playerId`
- `color`

### `ROOM_STATE_CHANGED`
Payload:
- `fromState`
- `toState`

---

## 6. Match Lifecycle Events

### `MATCH_CREATED`
Payload:
- `matchId`
- `seed`
- `playerOrder[]`

### `BOARD_GENERATED`
Payload:
- `boardSeed`
- optional `boardSummary`

### `MATCH_SETUP_STARTED`
Payload:
- none

### `MATCH_STARTED`
Payload:
- `firstPlayerId`

### `MATCH_FINISHED`
Payload:
- `winnerPlayerId`
- `winningTotalPoints`
- `victoryCause`

### `MATCH_ABORTED`
Payload:
- `reason`

---

## 7. Setup Events

### `INITIAL_SETTLEMENT_PLACED`
Payload:
- `playerId`
- `intersectionId`
- `round: first | second`

### `INITIAL_ROAD_PLACED`
Payload:
- `playerId`
- `edgeId`
- `round: first | second`

### `START_RESOURCES_DISTRIBUTED`
Payload:
- `resourcesByPlayer`

---

## 8. Turn and Resolution Events

### `TURN_STARTED`
Payload:
- `activePlayerId`
- `turnNumber`

### `DICE_ROLLED`
Payload:
- `activePlayerId`
- `dieA`
- `dieB`
- `total`

### `RESOURCES_DISTRIBUTED`
Payload:
- `byPlayerAndResource`

### `DISCARD_REQUIRED`
Payload:
- `players[]`
- `requiredCountsByPlayer`

### `PLAYER_DISCARDED`
Payload:
- `playerId`
- `count`

### `ROBBER_MOVED`
Payload:
- `fromHexId`
- `toHexId`
- `activePlayerId`

### `RESOURCE_STOLEN`
Payload:
- `fromPlayerId`
- `toPlayerId`
- `resourceType`

### `TURN_ENDED`
Payload:
- `activePlayerId`

---

## 9. Build Events

### `ROAD_BUILT`
Payload:
- `playerId`
- `edgeId`
- `source: normal | road_building_devcard | setup`

### `SETTLEMENT_BUILT`
Payload:
- `playerId`
- `intersectionId`
- `source: normal | setup`

### `CITY_UPGRADED`
Payload:
- `playerId`
- `intersectionId`

---

## 10. Trade Events

### `TRADE_OFFERED`
Payload:
- `tradeId`
- `offeringPlayerId`
- `offerResources`
- `requestResources`

### `TRADE_RESPONDED`
Payload:
- `tradeId`
- `respondingPlayerId`
- `response`

### `TRADE_CONFIRMED`
Payload:
- `tradeId`
- `offeringPlayerId`
- `counterpartyPlayerId`

### `TRADE_COMPLETED`
Payload:
- `tradeId`
- `playerAId`
- `playerBId`
- `transferredResources`

### `TRADE_CANCELLED`
Payload:
- `tradeId`
- `reason`

### `BANK_TRADE_COMPLETED`
Payload:
- `playerId`
- `giveResourceType`
- `giveAmount`
- `receiveResourceType`
- `receiveAmount`
- `ratioApplied`

---

## 11. Development Card Events

### `DEV_CARD_BOUGHT`
Payload:
- `playerId`
- `cardTypeHidden: true`

### `DEV_CARD_PLAYED`
Payload:
- `playerId`
- `cardType`

### `YEAR_OF_PLENTY_RESOLVED`
Payload:
- `playerId`
- `pickedResources[]`

### `MONOPOLY_RESOLVED`
Payload:
- `playerId`
- `resourceType`
- `collectedCount`

### `ROAD_BUILDING_RESOLVED`
Payload:
- `playerId`
- `placedEdgeIds[]`

### `KNIGHT_PLAYED`
Payload:
- `playerId`
- `playedKnightCount`

---

## 12. Derived-State / Title Events

### `LONGEST_ROAD_CHANGED`
Payload:
- `oldHolderPlayerId | null`
- `newHolderPlayerId | null`
- `roadLength`

### `LARGEST_ARMY_CHANGED`
Payload:
- `oldHolderPlayerId | null`
- `newHolderPlayerId | null`
- `armySize`

### `VICTORY_CHECK_TRIGGERED`
Optional internes Event, nicht zwingend für User Log.

### `GAME_WON`
Payload:
- `winnerPlayerId`
- `visiblePoints`
- `hiddenPoints`
- `totalPoints`
- `victoryCause`

Hinweis:
`MATCH_FINISHED` und `GAME_WON` können im finalen System zusammengeführt oder getrennt behandelt werden. Für die Spezifikation bleiben beide semantisch unterscheidbar:
- `GAME_WON` = fachlicher Sieg
- `MATCH_FINISHED` = Lifecycle-Abschluss

---

## 13. Presence / Session Events

### `PLAYER_CONNECTED`
Payload:
- `playerId`

### `PLAYER_DISCONNECTED`
Payload:
- `playerId`
- `graceUntil`

### `PLAYER_EXPIRED`
Payload:
- `playerId`

### `SESSION_REATTACHED`
Payload:
- `playerId`
- `roomId`
- optional `matchId`

---

## 14. Event Visibility

Nicht jedes Event ist in gleicher Tiefe für alle Clients sichtbar.

## 14.1 Öffentlich voll sichtbar
- Road / Settlement / City
- Dice total
- Robber move
- Trade offered / responded / completed
- Longest Road / Largest Army
- Room lifecycle changes

## 14.2 Öffentlich reduziert sichtbar
- `DEV_CARD_BOUGHT` ohne Kartentyp
- `PLAYER_DISCARDED` nur mit Count, nicht exakten Ressourcentypen

## 14.3 Spielerindividuell sichtbar
- exakte eigene Resource-Veränderungen
- exakte gestohlene Ressource für direkt betroffene Spieler
- eigene private Karteninformationen

---

## 15. Rejection Codes als API-nahe Vertragsbasis

Empfohlenes Set:
- `not_active_player`
- `invalid_turn_state`
- `invalid_match_state`
- `forced_resolution_pending`
- `insufficient_resources`
- `illegal_board_target`
- `illegal_trade_payload`
- `trade_offer_not_open`
- `dev_card_already_played_this_turn`
- `dev_card_bought_this_turn`
- `room_not_joinable`
- `all_seats_not_ready`
- `stale_state`
- `session_conflict`

---

## 16. Contract-Design-Empfehlungen

## 16.1 Command Types als String Unions
Gut für TypeScript, Serialisierung und Logging.

## 16.2 Event Payloads klein halten
Nicht jedes Event muss den gesamten State spiegeln.

## 16.3 Snapshots nicht durch Events ersetzen
Events dokumentieren Veränderung; Snapshots liefern rekonstruierbare Sicht.

---

## 17. Kurzform für das Dev-Team
Die wichtigste Unterscheidung lautet:
- Commands sagen, was jemand tun will.
- Events sagen, was fachlich passiert ist.

Wenn diese Trennung sauber bleibt, werden Engine, Transport und Debugging deutlich robuster.