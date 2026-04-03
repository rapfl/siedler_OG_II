# Decision Register – Block 02 UX

## Zweck
Dieses Dokument bündelt die produkt- und UX-relevanten Entscheidungen, die in Block 02 mehrfach als offen markiert waren.

Ziel ist, vor Block 03 eine klare, belastbare Entscheidungsbasis zu schaffen, damit:
- die State Machine keine Produktentscheidungen implizit treffen muss,
- die API-Spezifikation auf stabilen Annahmen aufbauen kann,
- Room-, Session- und Postgame-Logik nicht unnötig vage bleiben.

---

## 1. Entscheidungsprinzip

Wo in Block 02 mehrere Optionen denkbar waren, gilt für den weiteren Projektverlauf:
- wir priorisieren **Lieferbarkeit des MVP**,
- **soziale Klarheit** in privaten Runden,
- **geringe Friktion**,
- und **saubere Modellierbarkeit** in Engine und Realtime-System.

---

## 2. Getroffene Entscheidungen

## D-01 – Spielerzahl im MVP
**Entscheidung:**
- Der MVP unterstützt **3 bis 4 Spieler**.
- **4 Spieler** sind der kommunikative und UX-seitige Default.

**Begründung:**
- 3 Spieler erhöhen die praktische Nutzbarkeit im Friends-Kontext.
- 4 Spieler bleiben der primäre Referenzfall für Regeln, Tests und Kommunikation.

**Konsequenz für Block 03:**
- State Machine, Room Logic und Setup-Reihenfolge müssen 3- und 4-Spieler-Partien korrekt abbilden.
- Test-Coverage muss beide Fälle berücksichtigen.

---

## D-02 – Startbedingung in der Lobby
**Entscheidung:**
- Das Spiel kann nur starten, wenn:
  - die Mindestspielerzahl erreicht ist,
  - und **alle belegten Seats ready** sind.

**Begründung:**
- vermeidet versehentliche Starts,
- reduziert soziale Irritation,
- erhöht Eindeutigkeit in privaten Runden.

**Konsequenz für Block 03:**
- `START_MATCH` muss serverseitig auf vollständige Ready-Erfüllung aller belegten Seats validieren.

---

## D-03 – Seat- und Farbzuweisung
**Entscheidung:**
- Erstzuweisung erfolgt automatisch.
- Der Host darf **leichte Korrekturen** vor Spielstart vornehmen.
- Es gibt im MVP **keine freie offene Seat-/Color-Draft-Logik**.

**Begründung:**
- minimiert Friktion,
- erhält gleichzeitig genug Kontrolle für Friends-Runden,
- bleibt technisch einfach.

**Konsequenz für Block 03:**
- Room-State braucht editierbare Seat-/Color-Zuordnung vor Match-Start.
- Nach Match-Start sind diese Zuweisungen fix.

---

## D-04 – Resume-Politik
**Entscheidung:**
- Resume erfolgt **semi-automatisch**.
- Wenn die Situation eindeutig ist, wird die Wiederaufnahme aktiv vorgeschlagen und mit minimaler Bestätigung fortgeführt.
- Kein aggressives stilles Auto-Resume in uneindeutigen Situationen.

**Begründung:**
- erhält Kontinuität,
- vermeidet Fehlkontexte,
- reduziert Kontrollverlust.

**Konsequenz für Block 03:**
- Session-Recovery braucht Eindeutigkeitsprüfung.
- Es braucht unterscheidbare Fälle für:
  - lobby_resume
  - match_resume
  - invalid_session
  - session_conflict

---

## D-05 – Seat-Schutz bei Disconnect
**Entscheidung:**
- Bei kurzem Disconnect bleibt der Seat zunächst reserviert.
- Es gibt einen **Grace-Zeitraum**.
- Der konkrete technische Wert wird zunächst als Implementierungsparameter geführt; Produktannahme für MVP: **ca. 2 Minuten**.

**Begründung:**
- verhindert unnötigen Seat-Verlust,
- entspricht realistischem Browser-/Netzwerkverhalten,
- hilft Reconnect-UX massiv.

**Konsequenz für Block 03:**
- Presence- und Room-Lifecycle brauchen Zustände für connected / disconnected / expired.

---

## D-06 – Trade-Adressierung
**Entscheidung:**
- Im MVP gehen Spieler-Trades standardmäßig **an alle anderen aktiven Spieler**.
- Keine gezielte Trade-Adressierung in V1.
- Keine Counteroffers in V1.

**Begründung:**
- reduziert Interface- und State-Komplexität,
- vereinfacht Realtime-Synchronisation,
- passt gut zum Friends-MVP.

**Konsequenz für Block 03:**
- Trade-State ist broadcast-basiert.
- Response-Modell ist einfach: accept / reject.

---

## D-07 – Turn-End-Verhalten
**Entscheidung:**
- `End Turn` blockiert nicht unnötig.
- Es gibt **keine harte Warnpflicht** bei ungenutzten legalen Aktionen.
- Optional sind später weiche Hinweise möglich, aber nicht als MVP-Zwang.

**Begründung:**
- hält den Zugfluss schnell,
- verhindert Bevormundung,
- reduziert unnötige Interaktionsschritte.

**Konsequenz für Block 03:**
- Turn-End ist legal, solange keine Forced Resolution offen ist.
- Keine zusätzliche serverseitige Prüfung auf „du hättest noch etwas tun können“.

---

## D-08 – Postgame-Pfad im MVP
**Entscheidung:**
- Nach Spielende kehrt die Gruppe in einen **persistierenden Raumzustand nach Match-Ende** zurück.
- Das Produkt bietet **keinen eigenständigen komplexen Rematch-Flow** als separate Primärfunktion im MVP.
- Der nächste Match-Start erfolgt über denselben Raumkontext mit Ready-Reset.

**Begründung:**
- UX-robuster,
- reduziert Sonderlogik,
- erhält soziale Kontinuität.

**Konsequenz für Block 03:**
- Room und Match müssen klar getrennt modelliert werden.
- Nach Match-Ende bleibt der Room bestehen, das Match nicht.

---

## D-09 – Leave / Exit-Politik
**Entscheidung:**
- Bewusstes Verlassen und technischer Disconnect werden unterschiedlich behandelt.
- Vor Match-Start kann ein Seat bewusst freigegeben werden.
- Während laufender Partie führt bewusstes Verlassen **nicht** zu sofortigem „Match-Reshaping“, sondern zum Zustand disconnected / abandoned nach vorhandener Session-Logik.

**Begründung:**
- verhindert chaotische Room-Rekonfigurationen während laufender Partien,
- hält Reconnect logisch konsistent.

**Konsequenz für Block 03:**
- Leave und Disconnect sind unterschiedliche Events.
- Room-Lifecycle und Match-Lifecycle dürfen nicht identisch modelliert werden.

---

## D-10 – Chat im MVP
**Entscheidung:**
- Kein vollwertiger Chat im initialen MVP-Kern.
- Event Log ist Pflicht; Chat bleibt optionales MVP+ Thema.

**Begründung:**
- reduziert Scope,
- vermeidet Moderations- und Sonderlogik,
- die Kernkoordination funktioniert über Invite, Presence und Ready.

---

## 3. Entscheidungen mit bewusst aufgeschobener Schärfung

Diese Punkte sind für Block 03 nicht kritisch genug, um jetzt finalisiert werden zu müssen:
- wie detailliert Siegpunktaufschlüsselung im Postgame ist,
- wie ausführlich Dev-Card-Effekte textlich erklärt werden,
- wie stark Action Guidance für Anfänger „coachend“ auftritt,
- welche Soft-Hinweise bei Turn End später denkbar wären.

---

## 4. Arbeitsregel für Block 03
Ab Block 03 gelten die Entscheidungen D-01 bis D-10 als verbindliche Arbeitsannahmen.

Wenn eine spätere Änderung nötig wird, muss sie:
1. hier nachgetragen werden,
2. auf betroffene UX- und Regeldokumente zurückgespielt werden,
3. und im Zweifel auch die API-/State-Machine-Spezifikation anpassen.

---

## 5. Kurzform
Die wichtigsten Festlegungen für Block 03 sind:
- 3–4 Spieler, Default 4
- alle belegten Seats müssen ready sein
- Auto-Zuweisung plus leichte Host-Korrektur
- semi-automatisches Resume
- Trades an alle, keine Counteroffers
- kein harter End-Turn-Warner
- nach Match-Ende zurück in denselben Room-Kontext
- Leave ≠ Disconnect
- Event Log ja, Chat nein