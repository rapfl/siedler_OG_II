# Review Block 02 – UX

## Zweck
Dieses Dokument bewertet `docs/02-ux` als zusammenhängenden UX-Block entlang von fünf Prüfdimensionen:

1. Widersprüche zwischen den UX-Dateien
2. zu viel UI-Vorgriff
3. fehlende Screens / Flows
4. unklare Produktentscheidungen
5. Lücken zwischen UX und der reviewed Produktspezifikation

Ziel ist **nicht** ein vollständiges Redesign von Block 02, sondern eine belastbare Freigabe- und Korrekturbasis vor Block 03.

---

## 1. Gesamtfazit

### 1.1 Kurzurteil
Block 02 ist insgesamt **tragfähig und anschlussfähig** für Block 03.

Die UX-Dokumente bilden gemeinsam bereits eine brauchbare Struktur für:
- Einstieg
- Lobby
- laufendes Spiel
- fokussierte / modale Flows
- Endgame / Postgame

### 1.2 Qualitätseinschätzung
Der Block ist aktuell:
- **stark in Nutzerfragen, Zustandsklarheit und Forced-Flow-Denke**
- **gut in der Abgrenzung von UX vs. UI**
- **noch nicht scharf genug in einigen Produktentscheidungen**, die für Block 03 relevant werden

### 1.3 Freigabestatus
Empfehlung:
- Block 02 **nicht neu schreiben**
- aber vor Block 03 einen kleinen Bereinigungsschritt machen:
  1. offene Entscheidungen bündeln
  2. 2–3 fehlende Übergänge explizit ergänzen
  3. einzelne Stellen sprachlich ent-UI-en

---

## 2. Widersprüche zwischen den UX-Dateien

## 2.1 Keine harten logischen Widersprüche
Es gibt aktuell **keine schweren internen Widersprüche**, die den Block unbenutzbar machen würden.

Die Dokumente ergänzen sich grundsätzlich konsistent:
- `entry-flows.md` -> Eintritt in Lobby
- `lobby-screen.md` -> Koordination vor Start
- `game-screen.md` -> laufende Partie
- `modal-flows.md` -> fokussierte Interaktionssituationen
- `endgame-and-rematch.md` -> Abschluss und Postgame

## 2.2 Weiche Spannungen statt echter Widersprüche
Es gibt aber einige Punkte, die derzeit nicht widersprüchlich, aber **doppeldeutig oder noch nicht final entschieden** sind.

### A. Rematch vs. Rückkehr in Lobby
`endgame-and-rematch.md` empfiehlt für den MVP Option A: Rückkehr in denselben Raum / Lobby-Kontext.

Problem:
- in den anderen UX-Dokumenten ist der Unterschied zwischen
  - ursprünglicher Vorstart-Lobby,
  - Postgame-Lobby,
  - und möglichem „Room persists, match reset pending"
  noch nicht als eigener Zustand ausgearbeitet.

Folge:
- Für Block 03 droht sonst eine unscharfe Modellierung von Room-Status nach Match-Ende.

### B. Resume-Automatik
`entry-flows.md` lässt offen, wie aggressiv Resume automatisch ausgelöst werden soll.

Gleichzeitig setzen `screen-spec.md`, `game-screen.md` und `modal-flows.md` bereits voraus, dass Reconnect sich sehr kohärent anfühlt.

Das ist kein Widerspruch, aber eine Lücke:
- es ist noch nicht entschieden, ob Resume
  - automatisch,
  - semi-automatisch,
  - oder immer mit expliziter Bestätigung
  passieren soll.

### C. Trade-Adressierung
`modal-flows.md` hält „an alle oder gezielt an einzelne Spieler“ offen.

`game-screen.md` spricht bereits teils implizit über soziale Trade-Dynamik, ohne zu fixieren, wie granular die Adressierung ist.

Das ist aktuell okay für UX, muss aber vor API-/State-Machine-Spezifikation entschieden werden.

---

## 3. Zu viel UI-Vorgriff

## 3.1 Insgesamt gut diszipliniert
Block 02 hält die Grenze zu UI insgesamt gut.

Positiv:
- Fokus auf Nutzerfragen
- Fokus auf Zustände und Übergänge
- Fokus auf Semantik statt Layout

## 3.2 Einzelne Stellen mit leichtem UI-Vorgriff
Es gibt einige Formulierungen, die noch nicht problematisch, aber schon nahe an UI-Design sind.

### Beispiele
- „Copy-Aktion muss unmittelbares Feedback geben“
- „current Robber-Hex darf nicht als gültiges Ziel erscheinen“
- „Auswahl zählt sichtbar mit“
- „legale Startplätze hervorheben“
- „Start wird nach Klick sofort als laufend markiert“

Diese Punkte sind zwar UX-relevant, aber sie kippen bereits in Darstellungslogik.

### Bewertung
Das ist **noch akzeptabel**, aber für saubere Trennung sollte in einer späteren Politur stärker zwischen unterscheiden:
- **UX-Absicht**
- **konkreter UI-Ausdruck**

### Empfohlene Regel für spätere Überarbeitung
Wann immer ein Satz beantwortet „wie sichtbar / markiert / hervorgehoben / angezeigt“, sollte geprüft werden, ob er eher:
- in `02-ux` bleiben darf, weil er Wahrnehmungslogik betrifft,
- oder besser in einen späteren UI-Pass verschoben wird.

---

## 4. Fehlende Screens / Flows

## 4.1 Die Hauptstrecke ist abgedeckt
Die zentrale Journey ist vollständig genug beschrieben:
- Einstieg
- Lobby
- Setup
- regulärer Turn
- Forced Flows
- Endgame

## 4.2 Es fehlen aber einige explizite Übergangs- und Sonderzustände

### A. Postgame-Lobby als eigener UX-Zustand
Der wichtigste fehlende Zustand in Block 02 ist:
- **Postgame-Lobby / Room after match end**

Dieser Zustand ist aktuell nur indirekt beschrieben.

Er sollte explizit modelliert werden als:
- Match beendet
- Raum besteht weiter
- Spieler bleiben gruppiert
- neue Partie noch nicht gestartet

Das ist relevant für:
- Ready-Reset
- Reconnect nach Spielende
- Host-Rechte nach Match-Ende
- Start einer neuen Partie im selben Raum

### B. Leave Flow
Es gibt mehrere Stellen, wo „Raum verlassen“ oder implizites Verlassen vorkommt, aber kein zusammenhängender UX-Flow dafür.

Es fehlt eine explizite Betrachtung von:
- Leave in Entry-naher Lobby
- Leave in Postgame-Lobby
- Leave bei Disconnect vs. bewusstem Exit
- was mit Seat / Host / Room passiert

Für Block 03 ist das relevant, weil Room-Lifecycle und Presence sonst unsauber werden.

### C. Spectator / Observer ist korrekt out of scope, aber „non-participating presence“ ist gar nicht erwähnt
Das ist kein Muss für MVP, aber es fehlt eine klare Aussage:
- Zuschauer gibt es nicht
- nicht belegte Tabs / alte Clients dürfen nicht wie Beobachter behandelt werden

### D. Session Conflict / Seat Recovery ist in Entry nur angerissen
`entry-flows.md` nennt Session Conflict, aber der UX-Fall ist noch nicht konkretisiert.

Fehlender Sonderflow:
- „Dieser Seat scheint bereits mit deiner früheren Session verbunden zu sein. Möchtest du ihn wieder übernehmen?“

Das muss nicht voll ausgearbeitet werden, sollte aber als benannter Sonderfall existieren.

---

## 5. Unklare Produktentscheidungen

Das ist die wichtigste Baustelle vor Block 03.

## 5.1 Entscheidungen, die derzeit mehrfach offen sind

### A. Spielerzahl
Der Block ist konsistent darin, 3–4 technisch zuzulassen und 4 als Default zu behandeln.

Trotzdem fehlt die harte Entscheidung:
- **Ist 3-Spieler-MVP wirklich in Scope oder nur vorbereiteter Randfall?**

Das hat direkte Folgen für:
- Lobby-Logik
- Startbedingungen
- Testing Scope
- Matching-Text

### B. Startbedingung in der Lobby
Noch offen:
- Muss jeder belegte Seat ready sein?
- Oder darf der Host auch mit nicht-ready belegten Seats starten?

Empfehlung aus UX-Sicht:
- alle belegten Seats müssen ready sein

Diese Entscheidung sollte vor Block 03 fixiert werden.

### C. Seat-/Farbsteuerung
Noch offen:
- nur Auto-Zuweisung?
- Host-Korrektur erlaubt?
- freie Wahl durch Spieler?

Für die Engine ist das nicht kritisch, für Room-State und Lobby-Interaktionen aber sehr wohl.

### D. Resume-Politik
Noch offen:
- auto-resume wenn eindeutig?
- immer Bestätigung?
- wie lang bleibt ein Seat geschützt?

Diese Entscheidung betrifft:
- Entry
- Lobby
- Game
- Postgame

### E. Trade-Adressierung
Noch offen:
- Broadcast an alle
- gezielt an einzelne
- beides

Das betrifft spätere:
- Command-Schemas
- Sichtbarkeit
- Event Log
- Reaktionslogik

### F. Turn-End-Verhalten
Noch offen:
- warnen bei ungenutzten legalen Aktionen?
- nie warnen?
- nur bei besonders häufigen Anfängerfehlern warnen?

Das ist primär UX, aber beeinflusst die State Machine nicht stark.

### G. Postgame-Pfad
Noch offen:
- direkte Rematch-Option im MVP?
- nur Rückkehr in bestehenden Raum?
- sofortiger Ready-Reset ja/nein?

Diese Entscheidung muss vor Block 03 nicht komplett final sein, aber Room-Lifecycle nach Match-Ende sollte feststehen.

---

## 6. Lücken zwischen UX und der reviewed Produktspezifikation

## 6.1 Gute Übereinstimmung im Kern
Block 02 ist insgesamt gut anschlussfähig an `produkt-spezifikation-reviewed.md`.

Besonders gut gespiegelt sind:
- private Räume
- Host/Ready/Start-Logik
- Fokus auf Base Game
- Forced States
- Reconnect
- Event Log

## 6.2 Relevante Lücken

### A. Turn-Start-Win und VP-Reveal noch nicht über alle UX-Dateien verteilt
Die reviewed Produktspezifikation ist sauber bei:
- Sieg zu Turn Start
- verdeckte VP-Karten im Siegkontext

In Block 02 ist das vorhanden, aber noch nicht überall gleich stark integriert.

Empfehlung:
- im späteren Block 03 sauber zentral modellieren
- in Block 02 muss nicht überall nachgeschärft werden, solange `game-screen.md` und `endgame-and-rematch.md` es tragen

### B. Longest Road / Largest Army als UX-Trigger noch unterausformuliert
Die reviewed Produktspezifikation benennt ihre Bedeutung sauber.

In Block 02 sind sie zwar erwähnt, aber ihre UX-Wirkung ist noch relativ abstrakt:
- Wie stark werden Wechsel dieser Wertungen im laufenden Spiel hervorgehoben?
- Sind sie reine Log-Ereignisse oder kontextbildende Statuswechsel?

Das ist kein Fehler, aber eine offene Lücke.

### C. Robber / Desert / Steal-Sonderfälle sind in Block 02 nicht explizit vollständig gespiegelt
Die reviewed Produktspezifikation ist präziser bei:
- Robber muss auf anderes Hex
- Desert ist legal
- Steal bei angrenzendem Gegner am Desert weiterhin legal

In `modal-flows.md` ist das teilweise abgedeckt, aber nicht ganz so explizit und nicht mit derselben Vollständigkeit.

### D. Postgame-Room-Zustand ist in reviewed Spec nur implizit, in UX ebenfalls nur halb explizit
Hier fehlt auf beiden Ebenen ein scharf benannter Room-Lifecycle-State nach Match-Ende.

Das ist die wichtigste strukturelle Lücke vor Block 03.

---

## 7. Konkrete Empfehlungen vor Block 03

## 7.1 Nicht nötig
Folgendes ist **nicht nötig**:
- kompletter Rewrite von Block 02
- neue Grundstruktur
- Ausweitung auf UI-Design

## 7.2 Sinnvoller Minimal-Fix
Vor Block 03 sollte genau Folgendes passieren:

### 1. Decision Register anlegen
Neue Datei, z. B.:
- `docs/02-ux/decision-register.md`

Darin sollten die UX-/Produktentscheidungen gebündelt werden:
- 3 vs. 4 Spieler im MVP
- Ready als harte Startbedingung
- Resume-Politik
- Seat-/Farbzuweisung
- Trade-Adressierung
- Postgame-Pfad
- Leave-/Disconnect-Politik

### 2. Postgame-Lobby als expliziten Zustand ergänzen
Entweder in:
- `endgame-and-rematch.md`
oder
- neuer Mini-Datei `room-lifecycle.md`

### 3. Leave / Exit / Room lifecycle explizit machen
Mindestens als kurzer UX-Flow ergänzen.

### 4. UI-nahe Formulierungen nicht jetzt bereinigen, sondern markieren
Kein großer Edit nötig.
Ein einfacher Hinweis reicht:
- Diese Stellen bleiben vorerst toleriert, werden aber im UI-Pass sprachlich getrennt.

---

## 8. Abschlussbewertung

### Block-02-Status
**Gut genug, um in Block 03 überzugehen – sofern die offenen Entscheidungen gebündelt werden.**

### Hauptrisiko ohne Nacharbeit
Ohne Decision Register würde Block 03 zu viel implizit entscheiden müssen.

Dann besteht die Gefahr, dass:
- die State Machine Produktentscheidungen heimlich festschreibt,
- die API-Spezifikation unnötig schwankt,
- Room-/Session-/Postgame-Logik unsauber wird.

### Empfohlener nächster Schritt
Bevor `03-game-rules` beginnt:
1. `decision-register.md` anlegen
2. Postgame-Lobby / Room-after-match explizit machen
3. Leave-/Exit-Flow ergänzen

Danach ist Block 02 ausreichend geschlossen.