# Board Model Specification

## Zweck
Dieses Dokument definiert das technische Board-Modell für das klassische Base Game im MVP.

Es beschreibt:
- welche Board-Objekte existieren,
- wie Hexes, Intersections, Edges und Harbors modelliert werden,
- welche Adjazenzen und Graphregeln gelten,
- wie Board-Generierung funktioniert,
- und wie das Board für Build-, Production- und Robber-Logik genutzt wird.

Dieses Dokument ist bewusst **engine-orientiert**, nicht UI-orientiert.

---

## 1. Grundprinzip

Für die Engine ist das Board kein Bild, sondern ein Graph aus:
- Hexes
- Intersections
- Edges
- Harbors
- Beziehungen zwischen diesen Elementen

Alle regelrelevanten Aktionen beziehen sich auf diesen Graphen:
- Settlement Placement
- City Upgrade
- Road Placement
- Resource Production
- Robber Blocking
- Harbor Access
- Longest Road Evaluation

---

## 2. Scope des Board-Modells für den MVP

Der MVP nutzt das klassische Base-Game-Board mit:
- 19 Terrain-Hexes
- 54 Intersections
- 72 Edges
- 9 Harbor-Spots / Port-Positions

Die Spielerzahl 3 oder 4 ändert **nicht** das Board-Modell selbst.

---

## 3. Board-Objekte

## 3.1 Hex
Ein Hex ist ein Terrain-Feld mit Produktions- und Robber-Relevanz.

### Felder eines Hex-Objekts
- `hexId`
- `resourceType`
- `tokenNumber | null`
- `isDesert`
- `hasRobber`
- `adjacentIntersectionIds[]`
- `adjacentEdgeIds[]`
- `axialCoord` oder äquivalenter Koordinatenwert

### `resourceType`
- `wood`
- `brick`
- `sheep`
- `wheat`
- `ore`
- `desert`

### `tokenNumber`
- `2, 3, 4, 5, 6, 8, 9, 10, 11, 12`
- `null` für Desert

---

## 3.2 Intersection
Intersections sind die einzigen legalen Orte für Siedlungen und Städte.

### Felder eines Intersection-Objekts
- `intersectionId`
- `adjacentHexIds[]`
- `adjacentEdgeIds[]`
- `adjacentIntersectionIds[]`
- `building | null`
- `harborAccess | null`

### `building`
Falls belegt:
- `ownerPlayerId`
- `buildingType: settlement | city`

### `harborAccess`
Optionaler Harbor-Zugang, falls diese Intersection zu einem Harbor-Paar gehört.

---

## 3.3 Edge
Edges sind die einzigen legalen Orte für Straßen.

### Felder eines Edge-Objekts
- `edgeId`
- `intersectionAId`
- `intersectionBId`
- `adjacentHexIds[]`
- `road | null`

### `road`
Falls belegt:
- `ownerPlayerId`

---

## 3.4 Harbor / Port
Harbors werden als Eigenschaften eines Küstenabschnitts bzw. eines definierten Intersection-Paars modelliert.

### Felder eines Harbor-Objekts
- `harborId`
- `harborType`
- `intersectionIds[2]`

### `harborType`
- `generic_3_to_1`
- `wood_2_to_1`
- `brick_2_to_1`
- `sheep_2_to_1`
- `wheat_2_to_1`
- `ore_2_to_1`

Ein Spieler hat Zugang zu einem Harbor, wenn er auf mindestens einer der zugehörigen Harbor-Intersections eine eigene Siedlung oder Stadt besitzt.

---

## 4. Board-Koordinatensystem

## 4.1 Empfehlung
Für Hexes sollte ein deterministisches Koordinatensystem verwendet werden, bevorzugt:
- axial coordinates für Hexes

Intersections und Edges sollten nicht aus Pixel-Positionen abgeleitet werden, sondern als:
- vordefinierte topologische IDs
- mit expliziten Adjazenzlisten

## 4.2 Warum
Das reduziert Fehler bei:
- Legality Checks
- Longest Road
- Harbor Access
- Setup und Road-Adjacency

---

## 5. Klassische Base-Game-Verteilung

## 5.1 Terrain-Verteilung
Das Base Game nutzt:
- 4 wood
- 4 sheep
- 4 wheat
- 3 brick
- 3 ore
- 1 desert

## 5.2 Zahlentoken-Verteilung
Das Base Game nutzt 18 Zahlentoken:
- 2 x1
- 3 x2
- 4 x2
- 5 x2
- 6 x2
- 8 x2
- 9 x2
- 10 x2
- 11 x2
- 12 x1

Desert erhält kein Token.

## 5.3 Harbor-Verteilung
Das Base Game nutzt 9 Harbors:
- 4 generic 3:1
- 5 spezifische 2:1 Harbors, je einer pro Ressourcentyp

---

## 6. Board-Generierung

## 6.1 Grundsatz
Für den MVP sollte das Board pro Match serverseitig aus einem Seed generiert werden.

### Ziele
- Reproduzierbarkeit
- testbare Partien
- nachvollziehbare Reconnects
- spätere Replay-Fähigkeit

## 6.2 Generation Steps
1. Terrain-Hexes gemäß fixer Mengenliste erzeugen
2. Desert platzieren
3. Number Tokens auf alle Nicht-Desert-Hexes verteilen
4. Harbor-Typen auf die vordefinierten Harbor-Slots verteilen
5. Robber auf Desert setzen

## 6.3 Empfehlung zur initialen Fairnessregel
Mindestens für V1 sollte eine einfache Fairnessregel gelten:
- keine direkte 6-6-, 8-8- oder 6-8-Nachbarschaft auf angrenzenden Hexes

Die genaue Fairnessheuristik darf schlank bleiben, sollte aber schlimmste Extremfälle vermeiden.

## 6.4 BoardTemplate vs. GeneratedPayload
Empfohlenes Modell:
- **BoardTemplate:** feste Topologie von Hex-/Intersection-/Edge-/Harbor-IDs
- **GeneratedBoard:** konkrete Ressourcentypen, Tokens und Harbor-Typen auf dieser Topologie

---

## 7. Build-Legality auf Board-Ebene

## 7.1 Settlement Placement
Ein Settlement ist legal, wenn:
- Ziel-Intersection unbesetzt ist
- keine benachbarte Intersection mit Settlement oder City belegt ist
- im regulären Spiel mindestens eine angrenzende Edge eine eigene zusammenhängende Straßenanbindung liefert
- im Setup die Setup-Regeln gelten

## 7.2 City Upgrade
Ein City Upgrade ist legal, wenn:
- auf der Intersection bereits ein eigenes Settlement steht

## 7.3 Road Placement
Eine Road ist legal, wenn:
- die Edge unbesetzt ist
- sie an eine eigene Straße oder an ein eigenes Settlement / eine eigene City anschließt
- keine Blockaderegel verletzt wird, soweit sie auf Graph-Ebene relevant ist

### Setup-Sonderfall
Im Setup muss die Straße an die gerade gesetzte Setup-Siedlung anschließen.

---

## 8. Distance Rule

## 8.1 Definition
Zwischen zwei Siedlungen / Städten muss mindestens eine freie Intersection liegen.

Technisch:
- eine neue Siedlung ist illegal, wenn eine `adjacentIntersection` bereits ein Gebäude trägt

## 8.2 Gilt für
- Setup
- regulären Siedlungsbau

---

## 9. Resource Production

## 9.1 Produktionslogik
Wenn eine Zahl `N` gewürfelt wird:
- alle Hexes mit `tokenNumber = N` werden geprüft
- Hexes mit Robber produzieren nicht
- jedes angrenzende Settlement produziert 1 Ressource seines Hex-Typs
- jede angrenzende City produziert 2 Ressourcen seines Hex-Typs

## 9.2 Desert
Desert produziert nie.

## 9.3 Bank-Limit-Frage
Für den MVP kann die Standardannahme gelten:
- die Bank ist konzeptionell unbegrenzt oder ausreichend modelliert

Wenn später mit echten Bankbeständen gearbeitet wird, ist das ein separates Regelthema.

---

## 10. Robber im Board-Modell

## 10.1 Position
Genau ein Hex hat `hasRobber = true`.

## 10.2 Move-Regel
Der Robber muss auf ein anderes Hex bewegt werden als das aktuelle.

## 10.3 Blockadeeffekt
Ein Hex mit Robber produziert nicht.

## 10.4 Steal-Ziele
Wenn nach einem Robber-Move auf einem Hex gegnerische Gebäude angrenzen, sind deren Besitzer potenzielle Steal-Ziele.

Wichtig:
- Das gilt auch für Desert, sofern angrenzende gegnerische Gebäude existieren.

---

## 11. Harbor Access

## 11.1 Regel
Ein Spieler hat Harbor Access, wenn er auf mindestens einer Harbor-Intersection des Harbor-Paares ein eigenes Settlement oder eine eigene City besitzt.

## 11.2 Konsequenz
Harbor-Zugang ist kein globales Player-Flag aus dem Nichts, sondern ein aus dem Board abgeleiteter Zustand.

---

## 12. Board-Graph und Longest Road

## 12.1 Relevante Board-Daten
Für Longest Road muss der Engine-Graph kennen:
- welche Edges über welche Intersections verbunden sind
- welche Intersections durch gegnerische Gebäude blockieren
- welche Roads welchem Spieler gehören

## 12.2 Wichtige Blockaderegel
Eine gegnerische Siedlung oder Stadt auf einer Intersection unterbricht eine sonst mögliche Verbindung durch diese Intersection.

Eigene Gebäude unterbrechen die eigene Verbindung nicht.

---

## 13. Board-IDs und Serialisierung

## 13.1 Empfehlung
Alle Board-Objekte sollten stabile IDs erhalten:
- `H01..H19`
- `I01..I54`
- `E01..E72`
- `P01..P09`

Die konkrete Benennung ist frei, aber die IDs müssen:
- deterministisch
- serialisierbar
- testbar
- replay-kompatibel
sein.

## 13.2 Warum das wichtig ist
Commands und Events sollten sich auf stabile IDs beziehen, nicht auf berechnete Bildschirmkoordinaten.

---

## 14. Visibility und Board State

Das Board selbst ist weitgehend öffentlich.

Öffentlich sichtbar:
- Hex-Ressourcen
- Tokens
- Robber-Position
- Siedlungen / Städte
- Straßen
- Harbor-Typen

Nicht das Board selbst, sondern Hände / Dev Cards / bestimmte Resolution-Ergebnisse sind hidden information.

---

## 15. Empfohlene Datenstruktur

Beispielhaft:

```md
board:
  seed
  hexes: Record<HexId, Hex>
  intersections: Record<IntersectionId, Intersection>
  edges: Record<EdgeId, Edge>
  harbors: Record<HarborId, Harbor>
```

Wichtig ist nicht die konkrete Syntax, sondern:
- stabile Identitäten
- explizite Adjazenzen
- keine Ableitung aus UI-Geometrie zur Laufzeit

---

## 16. Validierungsfunktionen, die das Board-Modell unterstützen muss

Mindestens nötig:
- `canPlaceSettlement(playerId, intersectionId, context)`
- `canUpgradeCity(playerId, intersectionId)`
- `canPlaceRoad(playerId, edgeId, context)`
- `getProducingBuildingsForRoll(number)`
- `getStealablePlayersAtHex(hexId, activePlayerId)`
- `getHarborAccessForPlayer(playerId)`
- `getConnectedRoadGraphForPlayer(playerId)`

`context` ist wichtig, weil Setup und reguläres Spiel unterschiedliche Legality-Bedingungen haben.

---

## 17. Tests, die aus dem Board-Modell ableitbar sein müssen

- Distanzregel korrekt für Setup und normales Spiel
- Harbor Access korrekt
- Robber blockiert Produktion korrekt
- Desert produziert nie
- Steal-Zielmenge nach Robber-Move korrekt
- Road-Adjacency korrekt
- gegnerische Settlement-Blockade wirkt korrekt auf Longest Road Graph
- deterministische Reproduktion desselben Boards aus identischem Seed

---

## 18. Kurzform für das Dev-Team
Das Board ist kein UI-Element, sondern der zentrale Regelgraph.

Für den MVP ist entscheidend:
- feste Topologie
- serverseitig seedbasierte Verteilung
- stabile IDs
- explizite Adjazenzlisten
- Board-Regeln als reine Graph-Checks, nicht als Bildschirmheuristik.