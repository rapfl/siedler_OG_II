# Game State Visibility and Rules Constraints

## Zweck
Dieses Dokument ergänzt die Architekturübersicht um fachliche Zwangsbedingungen, die direkt aus dem Base Game und dem gewünschten Multiplayer-Modell folgen.

Es ist kein vollständiges API-Dokument, sondern ein Satz von Constraints, die die spätere UX-, Engine- und Socket-Spezifikation einhalten muss.

---

## 1. Hidden Information ist kein UI-Detail, sondern Architekturthema
In einem Siedler-/Catan-ähnlichen Multiplayer-Spiel gibt es mehrere Informationsklassen:

### Öffentlich sichtbar
- Board Layout
- Straßen, Siedlungen, Städte
- Zahlentoken
- Robber-Position
- sichtbare Largest-Army-/Longest-Road-Zustände
- Kartenanzahl pro Spieler
- Event-Log-Einträge, soweit öffentlich

### Spielerindividuell sichtbar
- exakte eigene Handkarten
- exakte eigene Development Cards in der Hand
- eigene legal-action previews

### Server-intern / nicht global broadcastbar
- exakte gegnerische Handkarten
- verdeckte Development Cards anderer Spieler
- Ergebnisse zufälliger Ziehungen vor ihrer zustandsseitigen Auflösung

### Architekturfolge
Der Server darf **nicht** einen einzigen globalen Vollzustand unkritisch an alle Clients broadcasten.

Stattdessen braucht das System:
- einen **kanonischen Full State** auf dem Server
- daraus abgeleitete **Player Views / Visibility Projections** pro Client

---

## 2. Forced Resolution States müssen exklusiv sein
Bestimmte Regelzustände dürfen nicht parallel mit normalen Aktionen koexistieren.

### Exklusive Forced States
- discard_pending nach Würfel 7
- robber_pending nach 7 oder Knight
- road_building_resolution
- year_of_plenty_resolution
- monopoly_resolution
- initial placement decisions

### Architekturfolge
Während eines Forced State gilt:
- andere normale Turn-Aktionen sind gesperrt
- UI darf keine scheinbar legalen Alternativaktionen anbieten
- Socket-Commands außerhalb des erlaubten Sets müssen serverseitig abgewiesen werden

---

## 3. Development Card Timing ist ein First-Class Constraint
Die Engine und spätere UX müssen folgende Timing-Regeln explizit modellieren:
- max. 1 gespielte Development Card pro Zug
- gekaufte Development Card im selben Zug nicht spielbar
- Development Cards dürfen vor dem Würfeln gespielt werden
- Victory Point Cards folgen einer separaten Reveal-Logik

### Architekturfolge
Der Turn State braucht mindestens:
- `hasPlayedDevCardThisTurn`
- `purchasedDevCardIdsThisTurn` oder äquivalente Markierung
- `phase` mit pre-roll und action window

---

## 4. 7er-Auflösung blockiert Handel und reguläre Aktionen
Wenn eine 7 gewürfelt wird:
1. Discard-Auflösung
2. Robber Move
3. ggf. Steal
4. Rückkehr in normale Aktionsphase

### Architekturfolge
Der Server darf in dieser Zeit keine normalen Trade-/Build-/Buy-Commands akzeptieren.

---

## 5. Longest Road braucht eigenständige Auswertungslogik
Longest Road ist keine simple Zählung aller gebauten Straßen.

Zu beachten:
- nur zusammenhängende Straßen zählen
- gegnerische Siedlungen/Städte können unterbrechen
- eigene Siedlungen unterbrechen nicht
- Gleichstand überholt den aktuellen Besitzer nicht
- Karte kann unter Umständen vakant werden, wenn nach einer Unterbrechung niemand die Anforderungen eindeutig erfüllt

### Architekturfolge
Longest Road muss als separate Domain-Berechnung modelliert und nach jeder straßenrelevanten Zustandsänderung neu evaluiert werden.

---

## 6. Largest Army braucht gespielte Knights, nicht Handkarten
Largest Army basiert auf **gespielten** Knight Cards.

### Architekturfolge
Der State darf nicht nur Handkarten kennen, sondern muss auch:
- `playedKnightCount` pro Spieler
- `largestArmyHolderPlayerId`
- `largestArmySize`
modellieren.

---

## 7. Win Check muss an mehreren Stellen greifen
Die Engine darf Sieg nicht nur am Zugende prüfen.

Notwendige Prüfpunkte:
- Turn Start
- nach Build/Upgrade
- nach Longest Road Change
- nach Largest Army Change
- nach Reveal von Victory Point Cards

### Architekturfolge
Es braucht eine zentrale `evaluateVictory()`-Routine, die nach jeder punktrelevanten Zustandsänderung aufgerufen wird.

---

## 8. Reconnect braucht Snapshot plus player-specific view
Ein reconnectender Client darf nach Wiederverbindung nicht einfach einen veralteten UI-State fortsetzen.

Er braucht:
- aktuellen kanonischen Snapshot
- event tail seit Snapshot
- neu berechnete player-specific visibility projection
- aktuelle forced-action-Lage

---

## 9. Konsequenz für kommende Dokumente
Diese Constraints müssen zwingend in folgenden Dateien berücksichtigt werden:
- `docs/02-ux/screen-spec.md`
- `docs/03-game-rules/state-machine.md`
- `docs/03-game-rules/rule-engine.md`
- `docs/04-api/socket-contracts.md`
- `docs/04-api/domain-commands-events.md`

---

## 10. Kurzform für das Dev-Team
Die kritischen Architekturpunkte sind:
- serverautoritativ
- keine globalen Full-State-Broadcasts
- player-specific state projections
- forced states exklusiv modellieren
- Dev-Card-Timing explizit modellieren
- Longest Road separat berechnen
- Siegprüfung zentral und mehrfach triggern