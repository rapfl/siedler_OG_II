# Lobby UX Specification

## Zweck
Die Lobby ist der Übergang zwischen „ich will spielen“ und „das Spiel beginnt jetzt wirklich“.

UX-seitig ist sie kein bloßer Warteraum, sondern erfüllt vier zentrale Aufgaben:
- Identität und Seat-Zuordnung klären
- soziale Koordination ermöglichen
- Spielbereitschaft sichtbar machen
- Vertrauen aufbauen, dass der Start sauber funktioniert

---

## 1. Nutzerkontext
Spieler kommen in die Lobby aus zwei Pfaden:
- als Host nach `Create Room`
- als Mitspieler nach `Join Room`

Sie haben typischerweise folgende Fragen:
- Bin ich im richtigen Raum?
- Wer ist schon da?
- Fehlt noch jemand?
- Muss ich noch etwas einstellen?
- Wann geht es los?
- Wer kann starten?

---

## 2. Primäre Nutzerziele

### Host
- bestätigen, dass der richtige Raum erstellt wurde
- Invite-Link schnell weitergeben
- sehen, wer beigetreten ist
- erkennen, wer noch fehlt oder nicht ready ist
- Spiel starten, sobald die Runde bereit ist

### Mitspieler
- bestätigen, dass sie im richtigen Raum sind
- eigenen Namen / Seat / Farbe prüfen
- signalisieren, dass sie startklar sind
- auf einen klaren Spielstart vertrauen können

### Systemziele
- fehlerhafte Starts vermeiden
- Mehrdeutigkeit vor Spielbeginn minimieren
- Realtime-Präsenz stabil und verständlich halten
- unnötige Room-Option-Komplexität im MVP vermeiden

---

## 3. Primäre Nutzerfragen, die der Screen beantworten muss
- In welchem Raum bin ich?
- Wie teile ich den Raum?
- Wer ist schon da?
- Wer ist Host?
- Bin ich selbst ready?
- Sind die anderen ready?
- Kann das Spiel jetzt starten?
- Falls nicht: warum nicht?

---

## 4. Voraussetzungen / Eingänge
Die Lobby erhält mindestens:
- room id
- join code
- invite link
- player list
- ready states
- host identity
- seat assignments
- color assignments
- room status
- reconnect state, falls relevant

---

## 5. Hauptzustände der Lobby

## 5.1 Empty Host Lobby
Nur der Host ist im Raum.

UX-Ziel:
- Link teilen maximal einfach machen
- keine Leere oder Unsicherheit erzeugen

Systemseitig relevante Hinweise:
- Spiel ist noch nicht startbar
- es fehlt mindestens ein weiterer Spieler

## 5.2 Partial Lobby
Ein Teil der Spieler ist da.

UX-Ziel:
- Fortschritt sichtbar machen
- soziale Koordination erleichtern
- unnötige Rückfragen vermeiden

## 5.3 Ready In Progress
Spieler sind im Raum, aber nicht alle startklar.

UX-Ziel:
- sichtbar machen, wer noch offen ist
- Startbedingungen klar kommunizieren

## 5.4 Startable Lobby
Mindestspielerzahl erfüllt, alle notwendigen Bedingungen erfüllt.

UX-Ziel:
- keinen Zweifel lassen, dass der Host jetzt starten kann

## 5.5 Reconnect Lobby Return
Ein Spieler kehrt in eine noch nicht gestartete Lobby zurück.

UX-Ziel:
- Seat-Kontinuität und Identität sofort bestätigen

## 5.6 Room Invalid / Closed
Raum nicht mehr verfügbar oder Spiel bereits unjoinbar.

UX-Ziel:
- sauber erklären, was passiert ist
- sinnvolle nächste Handlung anbieten

---

## 6. Kritische UX-Aufgaben in der Lobby

## 6.1 Raum verifizieren
Spieler müssen schnell erkennen können:
- dass sie im richtigen Raum sind
- ob es ein privater Raum ist
- ob der Join erfolgreich war

## 6.2 Link teilen
Für den Host ist „Leute in den Raum bekommen“ die zentrale Aufgabe.

UX-Anforderung:
- Invite-Link und Code müssen sofort verfügbar sein
- Copy-Aktion muss unmittelbares Feedback geben
- die UX soll den Host nicht zwingen, zwischen mehreren Unteransichten zu wechseln

## 6.3 Präsenz lesen
Spieler wollen nicht nur wissen, **wer existiert**, sondern **wer wirklich da ist und bereit ist**.

Deshalb muss die Lobby semantisch unterscheiden zwischen:
- seat empty
- player joined
- player connected
- player disconnected
- player ready

## 6.4 Startberechtigung verstehen
Es muss klar sein:
- nur der Host startet
- ab wann Start erlaubt ist
- warum Start eventuell noch blockiert ist

---

## 7. Interaktionslogik

## 7.1 Host betritt Lobby
System soll unmittelbar klar machen:
- Raum wurde erfolgreich erstellt
- dies ist der Invite-Link / Code
- weitere Spieler können jetzt beitreten

Primäre nächste Handlung:
- Link teilen

## 7.2 Spieler betritt Lobby
System soll unmittelbar klar machen:
- Beitritt war erfolgreich
- welcher Name/Seat aktuell gilt
- ob noch etwas getan werden muss

Primäre nächste Handlung:
- ready setzen

## 7.3 Ready toggeln
Ready ist nicht nur ein kosmetisches Signal, sondern ein Koordinationsmarker.

UX-Anforderung:
- State-Wechsel muss direkt sichtbar sein
- andere Spieler müssen diesen Wechsel in Echtzeit sehen
- der Nutzer muss verstehen, dass Ready reversibel ist bis zum Start

## 7.4 Starten des Spiels
Wenn der Host startet, braucht die UX zwei Dinge gleichzeitig:
- einen klaren Übergangszustand
- die Sicherheit, dass jetzt nicht versehentlich doppelt gestartet wird

Empfohlenes Verhalten:
- Start wird nach Klick sofort als laufend markiert
- Lobby wird in einen klaren Übergangszustand versetzt
- nach erfolgreichem Match-Init folgt nahtlos der Wechsel in Setup / Game

---

## 8. Entscheidungslogik der Lobby

## 8.1 Mindestspielerzahl
Für den MVP sollte technisch 3–4 Spieler zulässig sein, UX-seitig aber 4 Spieler als Default kommuniziert werden.

Die Lobby muss daher unterscheiden:
- unter Mindestzahl: nicht startbar
- Mindestzahl erfüllt, aber nicht alle ready: je nach Produktentscheidung blockiert oder erlaubt
- vollständig startklar: Host kann starten

## 8.2 Ready als harte vs. weiche Bedingung
Empfohlene MVP-Entscheidung:
- Start nur durch Host
- Host darf nur starten, wenn die definierte Mindestspielerzahl erreicht ist
- Alle belegten Seats sollen ready sein, bevor der Start möglich wird

UX-Vorteil:
- weniger versehentliches Starten
- weniger soziale Irritation
- klarere Erwartung

## 8.3 Farbe / Seat-Zuordnung
Für den MVP sollte Seat-/Farbwahl nicht zum Koordinationshindernis werden.

Empfehlung:
- automatische Erstzuweisung
- leichte Host-Korrektur optional
- keine komplexe Draft- oder Locking-Mechanik in V1

UX-Regel:
- jede Veränderung an Seat/Farbe muss für alle sichtbar und nachvollziehbar sein

---

## 9. Soziale UX

## 9.1 Liveness
Eine gute Lobby fühlt sich lebendig an.

Dafür wichtig:
- Join- und Leave-Ereignisse sind sichtbar
- Ready-Wechsel sind sichtbar
- Disconnect ist nicht mit freiwilligem Verlassen zu verwechseln

## 9.2 Vermeidung von awkward waiting
Die Lobby darf sich nicht passiv oder leer anfühlen.

Hilfreich sind klare Zustandsbotschaften wie:
- „Warte auf weitere Spieler“
- „Noch 2 Spieler fehlen“
- „Alle sind bereit – der Host kann starten“

## 9.3 Kein unnötiger Small-Talk-Zwang
Ein Chat kann später nützlich sein, ist aber für den MVP nicht nötig, solange:
- Invite gut funktioniert
- Präsenz klar ist
- Ready-Status sichtbar ist

---

## 10. Fehler- und Grenzfälle

## 10.1 Room full
Der Nutzer darf nicht in einen halben Join-Zustand geraten.

Erwartetes UX-Verhalten:
- klarer Fehlerzustand
- Hinweis, dass alle Seats belegt sind
- Option zurück / neuer Join-Code

## 10.2 Room no longer exists
Erwartetes UX-Verhalten:
- klar erklären, dass der Raum geschlossen oder ungültig ist
- keine vage Netzwerkmeldung

## 10.3 Host disconnectet
Falls der Host vor Spielstart disconnectet, braucht die Lobby eine klare Regel.

Empfehlung:
- kurzer Grace-Zeitraum
- danach Host-Neuzuweisung an verbleibenden Spieler

UX-seitig wichtig:
- der Wechsel darf nicht unsichtbar passieren

## 10.4 Spieler disconnectet kurz vor Start
Die Lobby muss unterscheiden zwischen:
- temporärer Verbindungsunterbrechung
- echtem Verlassen

UX-Ziel:
- kein übereilter Seat-Verlust
- kurzfristige Reconnect-Chance

## 10.5 Doppelklick auf Start
System muss Mehrfachstarts verhindern.

UX-Ziel:
- nach dem ersten gültigen Startversuch klarer pending state
- kein zweiter Startversuch nötig

---

## 11. Übergänge aus der Lobby

### Erfolgreicher Übergang
Lobby -> Match Starting -> Setup Phase

Der Übergang muss vermitteln:
- das Spiel wurde wirklich gestartet
- jetzt beginnt keine neue Wartephase, sondern die Partie

### Fehlerhafter Übergang
Falls Match-Start fehlschlägt:
- Lobby-Zustand erhalten
- Grund kommunizieren
- erneuter Startversuch ermöglichen

---

## 12. Erfolgsmetriken für die Lobby-UX
- Zeit von Room Create bis Share Action
- Zeit von Join bis Ready
- Anzahl fehlgeschlagener Join-Versuche
- Anzahl Starts mit nicht-ready Spielern
- Häufigkeit von Disconnects vor Match Start
- Abbruchrate vor Spielstart

---

## 13. Offene UX-Entscheidungen
1. Sollen alle belegten Seats ready sein müssen?
2. Soll der Host Seats/Farben aktiv sortieren dürfen?
3. Braucht die Lobby im MVP einen kleinen Textchat?
4. Wie lang ist der Grace-Zeitraum bei Disconnect vor Host-Reassignment?
5. Sollen Spieler in der Lobby aktiv kicken können oder erst später?

---

## 14. Kurzform für das Dev-Team
Die Lobby ist UX-seitig dann gelungen, wenn:
- der Host sofort versteht, wie er den Raum teilt,
- jeder Spieler sofort versteht, ob sein Join erfolgreich war,
- Readiness eindeutig ist,
- Startbarkeit eindeutig ist,
- und Realtime-Präsenz ohne Missverständnisse lesbar bleibt.