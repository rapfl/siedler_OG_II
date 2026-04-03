# Derived State Specification

## Zweck
Dieses Dokument beschreibt alle Spielinformationen, die nicht als primäre Eingabedaten gespeichert werden müssen, sondern aus dem kanonischen State abgeleitet werden.

Es definiert:
- welche Derived States existieren,
- wann sie neu berechnet werden,
- welche davon intern bleiben,
- welche davon pro Spieler unterschiedlich sichtbar sind,
- und welche davon an UX und API weitergereicht werden.

Dieses Dokument schließt die Lücke zwischen:
- Rule Engine
- Visibility Projection
- späteren Socket Payloads
- und UX-Aktionsführung.

---

## 1. Grundprinzip

Der kanonische Full State enthält nur die minimal nötigen Primärdaten.

Alles, was zuverlässig daraus berechnet werden kann, soll als Derived State behandelt werden.

### Vorteile
- weniger inkonsistente Doppelhaltung
- klarere Engine-Logik
- einfachere Reconnect-Rekonstruktion
- bessere Testbarkeit

### Wichtig
Derived State darf aus Performance-Gründen zwischengespeichert werden, bleibt aber fachlich **abgeleitet**.

---

## 2. Arten von Derived State

Es gibt vier relevante Klassen:

1. **Rule-Derived State**
2. **Scoring-Derived State**
3. **Visibility-Derived State**
4. **Action-Derived State**

---

## 3. Rule-Derived State

Diese Werte werden für Regelprüfungen oder Regelauflösung benötigt.

## 3.1 Harbor Access
Pro Spieler ableitbar aus:
- eigenen Gebäuden auf Harbor-Intersections
- Harbor-Konfiguration des Boards

### Ergebnis
- `accessibleHarbors[]`
- `bestTradeRatioByResource`

## 3.2 Steal Target Set
Für ein bestimmtes Robber-Hex und einen aktiven Spieler ableitbar aus:
- angrenzenden gegnerischen Gebäuden
- Ressourcenzustand potenzieller Opfer

### Ergebnis
- `stealablePlayerIds[]`

## 3.3 Discard Obligation Set
Nach einer 7 ableitbar aus:
- Ressourcenkartenanzahl pro Spieler

### Ergebnis
- `discardRequiredByPlayerId`
- `discardResolvedByPlayerId`

## 3.4 Current Setup Actor / Setup Cursor
Ableitbar aus:
- Setup Phase
- Turn Order
- Anzahl bereits gesetzter Startgebäude

### Ergebnis
- `currentSetupPlayerId`
- `currentSetupStep`

---

## 4. Scoring-Derived State

Diese Werte beschreiben Punkte und wertungsrelevante Besitzstände.

## 4.1 Visible Points
Öffentlich sichtbare Punkte eines Spielers aus:
- Settlement Count
- City Count
- Longest Road, falls gehalten
- Largest Army, falls gehalten

### Ergebnis
- `visiblePoints[playerId]`

## 4.2 Hidden Points
Verdeckte Punkte aus:
- Victory Point Development Cards

### Ergebnis
- `hiddenPoints[playerId]`

## 4.3 Total Points
Gesamtpunkte:
- `visiblePoints + hiddenPoints`

### Ergebnis
- `totalPoints[playerId]`

## 4.4 Longest Road Result
Ableitbar aus:
- Straßen-Graph pro Spieler
- gegnerischen Blockaden
- aktuell gehaltenem Titel

### Ergebnis
- `longestRoadHolderPlayerId | null`
- `longestRoadLength`
- optional `roadLengthByPlayerId`

## 4.5 Largest Army Result
Ableitbar aus:
- `playedKnightCount` pro Spieler

### Ergebnis
- `largestArmyHolderPlayerId | null`
- `largestArmySize`

---

## 5. Visibility-Derived State

Diese Werte sind nicht global identisch, sondern werden pro Empfängerprojektion abgeleitet.

## 5.1 Public Projection
Für alle Spieler gleich sichtbar:
- Board Topologie und aktuelles Board Layout
- Gebäude und Straßen
- Robber-Position
- Kartenanzahl pro Spieler
- sichtbare Punkte
- Longest Road / Largest Army Holder
- offener Trade-State
- Event Log, soweit öffentlich

## 5.2 Private Projection für einen Spieler
Zusätzlich sichtbar für genau diesen Spieler:
- exakte eigene Ressourcenhand
- exakte eigene Dev-Card-Hand
- eigene `hiddenPoints`
- eigene legal-action cues
- eigene offenen Pflichtaktionen

## 5.3 Server-only State
Nicht an Clients broadcasten:
- exakte gegnerische Hände
- verdeckte Dev Cards anderer Spieler
- vollständige zufällige Ziehzustände vor ihrer Auflösung
- interne Rejection- oder RNG-Hilfsdaten, soweit nicht nötig

---

## 6. Action-Derived State

Diese Werte dienen der UX-Führung und späteren API-Semantik.

## 6.1 Available Action Set
Ableitbar aus:
- Room State
- Match State
- Turn State
- Resolution State
- Actor Role
- Ressourcen / Karten / Board-Lage

### Ergebnis
- `allowedActionsForPlayer[playerId][]`

Wichtig:
Dies ist ein UX-/API-Hilfswert; die finale Legality-Prüfung erfolgt weiterhin bei Command-Eingang.

## 6.2 Forced Action Set
Ableitbar aus:
- offenen Discard-Pflichten
- offenem Robber-Step
- Devcard-Resolution State
- offenem Trade-Response-State

### Ergebnis
- `requiredActionForPlayer[playerId] | null`

## 6.3 Phase Explanation
Ableitbar aus:
- Lifecycle State
- Turn State
- Resolution State

### Ergebnis
- `phaseLabel`
- `phaseDescription`
- `nextExpectedActorId`

Das ist technisch nicht zwingend, aber für Reconnect und UX-Orientierung sehr hilfreich.

---

## 7. Recalculation Hooks

Nicht jeder Derived State muss nach jedem Command neu berechnet werden.

## 7.1 Immer neu berechnen nach jeder Mutation
- `visiblePoints`
- `hiddenPoints`
- `totalPoints`
- `allowedActions` für relevante Spieler
- `requiredAction` für relevante Spieler

## 7.2 Selektiv neu berechnen

### Nach Road-/Settlement-bezogenen Änderungen
- Harbor Access
- Longest Road
- visiblePoints / totalPoints

### Nach Knight
- Largest Army
- visiblePoints / totalPoints

### Nach 7 / Robber Move
- Discard Pflichtmengen
- Steal Target Set

### Nach Trade oder Produktion
- Ressourcenabhängige `allowedActions`

### Nach Dev Card Kauf / Spiel
- allowedActions
- hiddenPoints ggf. unverändert, aber totalPoints evtl. relevant

---

## 8. Caching-Strategie

## 8.1 Empfehlung
Derived State darf nach erfolgreichem Command einmal zentral aktualisiert und im Match-Result mitgeführt werden.

## 8.2 Aber fachlich gilt weiterhin
- Full State ist die Quelle
- Derived State ist austauschbar rekonstruierbar

---

## 9. Player View Projection

## 9.1 Zweck
Die Engine oder eine nachgelagerte Projection-Layer-Funktion erzeugt aus dem Full State je Client eine Spielansicht.

## 9.2 Empfohlener Stil

```md
projectPlayerView(fullState, playerId) -> PlayerView
```

## 9.3 Inhalt von `PlayerView`
Mindestens:
- room lifecycle status
- match lifecycle status
- turn / resolution phase
- board public state
- public player summaries
- eigene private hand
- eigene private dev cards
- visible and own total point context
- open trade context
- required action
- allowed actions

---

## 10. Derived State für Room-Ebene

Nicht nur das Match, auch der Room hat abgeleitete Zustände.

## 10.1 Room Readiness Summary
Ableitbar aus:
- belegten Seats
- Ready-State pro Seat
- Presence State pro Seat

### Ergebnis
- `occupiedSeatCount`
- `readySeatCount`
- `allOccupiedSeatsReady`
- `canStartMatch`

## 10.2 Host Summary
- `hostPlayerId`
- `hostConnected`
- `hostReassignmentPending`

## 10.3 Room Continuity Summary
- `roomHasActiveMatch`
- `roomIsPostgame`
- `roomCanPrepareNextMatch`

---

## 11. Beispielhafte Derived Fields im Match-State

Beispielhaft könnte ein normalisierter Derived-State-Bereich so aussehen:

```md
derived:
  scoring:
    visiblePointsByPlayer
    hiddenPointsByPlayer
    totalPointsByPlayer
    longestRoadHolderPlayerId
    longestRoadLength
    largestArmyHolderPlayerId
    largestArmySize
  ruleState:
    harborAccessByPlayer
    bestTradeRatioByPlayerAndResource
    discardRequirements
    stealablePlayers
  actionState:
    allowedActionsByPlayer
    requiredActionByPlayer
    nextExpectedActorId
```

Die konkrete Implementierung kann anders aussehen, aber die Semantik sollte erhalten bleiben.

---

## 12. Häufige Fehler, die vermieden werden sollen

- sichtbare und interne Punkte vermischen
- Harbor Access manuell statt graphbasiert pflegen
- globale statt player-spezifische Views broadcasten
- allowedActions als finale Legality statt als Hilfsprojektion missverstehen
- Derived State nicht nach titelrelevanten Änderungen neu berechnen

---

## 13. Tests für Derived State

Mindestens nötig:
- richtige sichtbare Punkte bei Gebäuden
- richtige hidden points bei VP-Karten
- total points korrekt
- Longest Road Wechsel korrekt
- Largest Army Wechsel korrekt
- Harbor Access korrekt
- requiredAction bei Discard / Robber / Devcard korrekt
- allowedActions korrekt für aktiven vs. nicht-aktiven Spieler
- player-specific visibility ohne Leaks

---

## 14. Kurzform für das Dev-Team
Der wichtigste Grundsatz lautet:
- Full State ist die Wahrheit.
- Derived State macht diese Wahrheit für Regeln, UX und Transport nutzbar.
- Player Views sind daraus abgeleitete, empfängerspezifische Projektionen.