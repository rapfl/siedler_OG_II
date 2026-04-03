# Rules Alignment Notes

## Zweck
Dieses Dokument hält fest, welche Punkte aus der ersten Spezifikation nach dem Review gegen öffentliche Regeln und öffentlich sichtbare Colonist-Informationen korrigiert oder präzisiert wurden.

---

## 1. Colonist als Referenz richtig einordnen
Die erste Spezifikation war stellenweise so formuliert, als ob Colonist sowohl Produkt- als auch Regelreferenz wäre.

Korrektur:
- **Colonist = primär UX-/Lobby-/Room-Referenz**
- **CATAN Base Game = primäre Regellogik-Referenz**

---

## 2. Development Cards
Präzisiert wurde:
- Development Cards dürfen vor dem Würfeln gespielt werden
- Nur 1 gespielte Development Card pro Zug
- Gekaufte Development Card darf im selben Zug nicht gespielt werden
- Mehrere Development Cards dürfen in einem Zug gekauft werden
- Victory Point Cards sind ein Sonderfall und können zum Sieg offengelegt werden

---

## 3. 7er- und Robber-Auflösung
Präzisiert wurde:
- Discard bei 8 oder mehr Karten
- vollständige Discard-Auflösung vor Robber Move
- kein Handel oder normaler Turn-Fortschritt vor Abschluss der 7er-Auflösung
- Robber muss auf ein anderes Hex
- Robber darf auf Desert
- Desert kann bei entsprechender Nachbarschaft trotzdem ein Steal-Ziel sein

---

## 4. Longest Road / Largest Army
Präzisiert wurde:
- Longest Road verlangt mindestens 5 zusammenhängende Straßenstücke
- Eigene Siedlungen unterbrechen die eigene Straße nicht
- Gegnersiedlungen können die Straße unterbrechen
- Gleichstand lässt Longest Road beim aktuellen Besitzer
- Largest Army verlangt mindestens 3 gespielte Knights
- Nicht gespielte Knights zählen nicht

---

## 5. Siegzeitpunkt
Präzisiert wurde:
- Sieg wird sofort geprüft, sobald ein Spieler auf seinem Zug die Zielpunktzahl erreicht
- Hat ein Spieler die Siegpunktzahl bereits zu Beginn seines Zugs, muss er nicht mehr würfeln

---

## 6. Trading
Präzisiert wurde:
- Player-to-player trade nur im Zug des aktiven Spielers
- Trade immer Ressource gegen Ressource
- kein Kredit, kein „etwas für nichts“, keine Services
- 4:1 Bank, 3:1 generic port, 2:1 special port

---

## 7. Konsequenz für die weitere Spezifikation
Alle nachfolgenden Dateien in:
- `docs/02-ux`
- `docs/03-game-rules`
- `docs/04-api`

müssen sich an `produkt-spezifikation-reviewed.md` orientieren.