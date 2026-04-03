# Test Scenarios – Game Rules

## Zweck
Dieses Dokument definiert die zentralen fachlichen Testfälle für Block 03.

Es ist kein vollständiges Test-Case-Management-System, sondern eine kuratierte Sammlung von:
- Golden Paths
- kritischen Edge Cases
- regressionsanfälligen Regelsituationen
- deterministischen Referenzszenarien

Ziel:
Die Engine soll gegen diese Szenarien stabil bestehen, bevor Block 04 und später die eigentliche Implementierung darauf aufbauen.

---

## 1. Teststrategie

Es gibt drei Arten von Testfällen:

1. **Scenario Tests**
   - mehrere Schritte, echter Spielverlauf
2. **Legality Tests**
   - einzelne Commands legal / illegal
3. **Derived State Tests**
   - Longest Road, Largest Army, Punkte, Visibility

---

## 2. Determinismus-Anforderung

Jeder Multi-Step-Scenario-Test soll möglichst:
- auf einem festen Seed basieren
- klaren initialen State haben
- eine eindeutige Erwartung für Result State und Derived State liefern

---

## 3. Setup-Szenarien

## S-01 – 4-Spieler Setup vollständig
**Ziel:**
Verifizieren, dass die Forward- und Reverse-Setup-Reihenfolge korrekt läuft.

**Erwartung:**
- Spieler 1–4 setzen erste Siedlung + Straße
- Spieler 4–1 setzen zweite Siedlung + Straße
- Startressourcen aus zweiter Siedlung
- Übergang in `match_in_progress`

## S-02 – 3-Spieler Setup vollständig
Wie S-01, aber mit 3 Spielern.

## S-03 – Distanzregel im Setup
**Aktion:**
Spieler versucht, eine Setup-Siedlung adjacent zu bestehender Siedlung zu setzen.

**Erwartung:**
- Command rejected
- State unverändert

## S-04 – Setup-Straße muss an neue Setup-Siedlung anschließen
**Aktion:**
Spieler versucht, Setup-Road auf legal freier, aber nicht angrenzender Edge zu setzen.

**Erwartung:**
- Command rejected

---

## 4. Turn- und Roll-Szenarien

## S-10 – Regulärer Turn ohne 7
**Ziel:**
Turn Flow korrekt ohne Forced States.

**Erwartung:**
- pre-roll dev window
- roll
- Produktion
- action phase
- end turn
- next player active

## S-11 – Turn mit 7 und einem discard-pflichtigen Spieler
**Erwartung:**
- roll = 7
- discard_pending
- betroffener Spieler discardet korrekt
- robber_pending
- robber move
- ggf. steal
- zurück in action_phase

## S-12 – Turn mit 7 und keinem discard-pflichtigen Spieler
**Erwartung:**
- direkt zu robber_pending
- kein discard flow

## S-13 – Kein Bauen/Handeln während discard_pending
**Aktion:**
Aktiver Spieler versucht Build oder Trade während offene Discard-Pflicht besteht.

**Erwartung:**
- Command rejected

---

## 5. Produktionsszenarien

## S-20 – Settlement produziert 1
## S-21 – City produziert 2
## S-22 – Desert produziert nie
## S-23 – Hex mit Robber produziert nicht
## S-24 – Mehrere Gebäude an gleichem Token produzieren korrekt parallel

Für alle gilt:
- Ressourcenverteilung exakt prüfen
- nur betroffene Spieler erhalten Ressourcen

---

## 6. Build-Szenarien

## S-30 – Legaler Straßenbau
**Erwartung:**
- Kosten abgezogen
- Straße gesetzt
- Longest Road recalculated

## S-31 – Illegaler Straßenbau ohne Anschluss
**Erwartung:**
- rejected

## S-32 – Legaler Siedlungsbau
**Erwartung:**
- Kosten abgezogen
- Settlement gesetzt
- Harbor Access ggf. neu berechnet
- Victory Check ausgeführt

## S-33 – Illegaler Siedlungsbau wegen Distanzregel
**Erwartung:**
- rejected

## S-34 – Illegaler Siedlungsbau ohne Straßennetzanschluss
**Erwartung:**
- rejected

## S-35 – Legales City Upgrade
## S-36 – Illegales City Upgrade auf fremdem oder leerem Spot

---

## 7. Robber- und Steal-Szenarien

## S-40 – Robber muss auf anderes Hex
**Erwartung:**
- gleiches Hex rejected

## S-41 – Robber auf Desert erlaubt
**Erwartung:**
- legal

## S-42 – Desert mit angrenzendem Gegner erlaubt Steal
**Erwartung:**
- legaler Steal-Target-Set nicht leer

## S-43 – Robber auf Hex ohne beraubbaren Gegner
**Erwartung:**
- robber move legal
- kein steal command nötig
- zurück action phase

## S-44 – Steal ist zufällig
**Erwartung:**
- Transfer genau einer Ressource
- keine Wahl des Ressourcentyps durch aktiven Spieler

---

## 8. Development Card Szenarien

## S-50 – Dev Card Kauf und Same-Turn-Sperre
**Ablauf:**
- Player buys development card
- versucht, sie im selben Zug zu spielen

**Erwartung:**
- rejected mit passender Reason

## S-51 – Maximal eine gespielte Dev Card pro Zug
**Ablauf:**
- Player spielt legal eine Dev Card
- versucht zweite Dev Card im selben Zug zu spielen

**Erwartung:**
- rejected

## S-52 – Knight vor dem Würfeln
**Erwartung:**
- legal im pre-roll window
- robber flow startet
- kein discard flow

## S-53 – Year of Plenty
**Erwartung:**
- zwei Picks
- exakte Ressourcenvergabe
- Rückkehr in action phase

## S-54 – Monopoly
**Erwartung:**
- gewählter Ressourcentyp korrekt von allen anderen eingesammelt

## S-55 – Road Building mit zwei legalen Straßen
**Erwartung:**
- zwei kostenfreie Platzierungen
- Longest Road recalculated

## S-56 – Road Building mit nur einer möglicher zweiter Platzierung / oder keiner zweiten legalen Platzierung
**Erwartung:**
- Flow endet kontrolliert
- keine Inkonsistenz

## S-57 – VP-Karte erhöht totalPoints, aber bleibt hidden
**Erwartung:**
- visiblePoints unverändert
- hiddenPoints erhöht
- totalPoints korrekt

---

## 9. Trade-Szenarien

## S-60 – Offer an alle, ein Spieler akzeptiert, aktiver Spieler bestätigt
**Erwartung:**
- atomarer Ressourcentransfer
- offer closed

## S-61 – Alle lehnen ab
**Erwartung:**
- Trade endet sauber
- Rückkehr in action phase

## S-62 – Aktiver Spieler hat angebotene Ressourcen nach Zwischenaktion nicht mehr
**Erwartung:**
- Finalisierung scheitert
- kein Transfer

## S-63 – Banktrade 4:1 ohne Harbor
## S-64 – Generic Harbor 3:1
## S-65 – Specific Harbor 2:1
## S-66 – Illegaler Banktrade mit falscher Ratio

---

## 10. Longest Road Szenarien

## S-70 – Erste Longest Road bei 5+ Straßen
**Erwartung:**
- Holder gesetzt
- visiblePoints angepasst

## S-71 – Gleichstand nimmt Titel nicht weg
**Erwartung:**
- aktueller Holder bleibt

## S-72 – Gegnersiedlung unterbricht Verbindung
**Erwartung:**
- Graph korrekt getrennt
- Länge sinkt / Titelwechsel ggf. korrekt

## S-73 – Eigene Siedlung unterbricht nicht
**Erwartung:**
- Verbindung bleibt legal durchgängig

## S-74 – Road Building Dev Card löst Longest Road Wechsel aus

---

## 11. Largest Army Szenarien

## S-80 – Erste Largest Army bei 3 Knights
## S-81 – Höhere Knight-Zahl übernimmt Titel
## S-82 – Ungespielte Knight Cards zählen nicht

---

## 12. Victory-Szenarien

## S-90 – Sieg durch Settlement Build
## S-91 – Sieg durch City Upgrade
## S-92 – Sieg durch Longest Road Wechsel
## S-93 – Sieg durch Largest Army Wechsel
## S-94 – Sieg durch interne hidden VP-Karte auf eigenem Zug
## S-95 – Turn-Start-Sieg ohne weiteren Würfelwurf

Für alle gilt:
- `match_finished`
- `room_postgame`
- keine weiteren Turn-Aktionen mehr legal

---

## 13. Room- und Lifecycle-Szenarien

## S-100 – Match Start nur wenn alle belegten Seats ready
## S-101 – Start rejected bei nicht-ready Seat
## S-102 – Postgame -> neuer Match-Start im selben Room
## S-103 – Disconnect in Pre-match Lobby mit Grace
## S-104 – Disconnect während Match ohne Match-Reshaping
## S-105 – Reconnect in Forced State
## S-106 – Reconnect nach Match-Ende führt in Postgame Room State

---

## 14. Visibility- und Projection-Szenarien

## S-110 – Eigene Hand vollständig sichtbar, fremde nur als Count
## S-111 – Hidden VP Points nicht global leaken
## S-112 – RequiredAction nur für betroffenen Spieler gesetzt
## S-113 – AllowedActions für aktiven und nicht-aktiven Spieler unterscheiden sich korrekt

---

## 15. Rejection-Reason-Szenarien

Mindestens ein Test je zentraler Ablehnungsursache:
- `not_active_player`
- `invalid_turn_state`
- `forced_resolution_pending`
- `insufficient_resources`
- `illegal_board_target`
- `dev_card_bought_this_turn`
- `dev_card_already_played_this_turn`
- `trade_offer_not_open`
- `all_seats_not_ready`

---

## 16. Priorisierung für die erste Implementierungsphase

### P0 – Muss vor Multiplayer-Playtest stabil sein
- S-01 bis S-04
- S-10 bis S-13
- S-20 bis S-24
- S-30 bis S-36
- S-40 bis S-44
- S-50 bis S-55
- S-60 bis S-66
- S-70 bis S-82
- S-90 bis S-95
- S-100 bis S-106
- S-110 bis S-113

### P1 – Danach schärfen
- S-56
- vertiefte stale-command- und reconnect-edge-cases
- zusätzliche seed-/fairness-Tests

---

## 17. Kurzform für das Dev-Team
Die Engine ist nicht ausreichend getestet, wenn nur einzelne Commands funktionieren.

Sie gilt erst dann als belastbar, wenn:
- komplette Spielverläufe deterministisch durchlaufen,
- Derived State korrekt bleibt,
- Forced States keine Schlupflöcher haben,
- und Sieg / Postgame / Reconnect auch unter Randbedingungen konsistent sind.