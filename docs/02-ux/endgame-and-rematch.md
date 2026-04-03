# Endgame and Rematch UX Specification

## Zweck
Dieses Dokument spezifiziert die UX für den Abschluss einer Partie und den Umgang mit dem Moment direkt danach.

Dazu gehören:
- unmittelbare Siegauflösung
- kommunikative Aufbereitung des Spielendes
- Nachvollziehbarkeit, warum das Spiel endet
- Übergang aus der Partie heraus
- Rematch / Rückkehr zur Lobby / Ende der Session

Der Fokus liegt auf einem **klaren, befriedigenden und nicht verwirrenden Abschluss**.

---

## 1. Warum Endgame-UX wichtig ist

Das Spielende ist UX-seitig kritisch, weil hier mehrere Risiken zusammenkommen:
- ein Sieg kann überraschend und indirekt eintreten,
- ein Spiel kann abrupt enden,
- nicht alle Spieler verstehen sofort, wodurch gewonnen wurde,
- der Übergang danach kann sozial awkward werden, wenn unklar ist, was jetzt passiert.

Eine gute Endgame-UX muss daher:
- das Ende eindeutig markieren,
- die Kausalität des Siegs verständlich machen,
- die Partie emotional sauber abschließen,
- und den nächsten Schritt klar anbieten.

---

## 2. Primäre Nutzerfragen im Endgame
- Ist das Spiel wirklich vorbei?
- Wer hat gewonnen?
- Wodurch genau wurde gewonnen?
- Wie knapp war es?
- Was kann ich jetzt tun?
- Bleiben wir als Gruppe zusammen oder lösen wir die Session auf?

---

## 3. Primäre Nutzerziele

### Sieger
- klaren Erfolgsmoment erleben
- verstehen, wodurch der Sieg ausgelöst wurde
- die Partie als abgeschlossen wahrnehmen

### Andere Spieler
- Verlust oder Niederlage nachvollziehen können
- verstehen, warum jetzt sofort Schluss ist
- nicht in einem unklaren „lief das Spiel noch?“ Zustand landen

### Systemziele
- Sieg unmittelbar und korrekt kommunizieren
- laufende Interaktionen sauber schließen
- keine halboffenen Forced States oder Trade-Zustände übrig lassen
- sinnvollen Postgame-Pfad anbieten

---

## 4. Auslöser des Endgames

## 4.1 Grundsatz
Das Spiel endet sofort, wenn ein Spieler auf seinem eigenen Zug die Siegbedingung erfüllt.

UX-seitig bedeutet das:
- Endgame kann nach verschiedenen Arten von Aktionen eintreten,
- die UX muss den konkreten Auslöser benennen,
- das Ende darf nicht wie ein Fehler oder Abbruch wirken.

## 4.2 Typische Sieg-Auslöser
- Bau einer Siedlung
- Upgrade zu einer Stadt
- Largest Army Wechsel
- Longest Road Wechsel
- Offenlegung / Berücksichtigung verdeckter Victory Point Cards
- Turn Start mit bereits erfüllter Siegbedingung

## 4.3 UX-Folge
Der Endgame-Flow braucht immer eine Kausalitätserklärung, nicht nur einen Gewinnernamen.

---

## 5. Unmittelbare Siegauflösung

## 5.1 UX-Ziel
Sobald der Sieg feststeht, muss sich der Spielzustand sofort qualitativ verändern.

Der Nutzer soll spüren:
- Die Partie ist jetzt beendet.
- Normale Turn-Logik gilt nicht mehr.

## 5.2 Verhalten
Nach erfolgreichem Victory Check:
- normale Aktionen werden geschlossen
- offene Forced Flows werden nicht weitergeführt
- das Spiel wechselt in einen abgeschlossenen Match-Endzustand
- der Gewinner wird genannt
- der Grund des Siegs wird benannt

## 5.3 Was vermieden werden muss
- noch interagierbare Build-/Trade-Aktionen
- unklarer Zustand, ob jemand noch dran wäre
- Sieg nur im Event Log, aber nicht im primären Fokus

---

## 6. Wahrnehmung des Spielendes

## 6.1 Endgame ist kein normales Overlay
UX-seitig ist Endgame ein Kontextwechsel des gesamten Produkts:
- von Handlung zu Auswertung
- von Entscheidung zu Abschluss
- von laufender Synchronisierung zu finalem Zustand

## 6.2 Wahrnehmungsziel
Alle Spieler sollen intuitiv verstehen:
- die Partie ist vorbei,
- es gibt jetzt nichts mehr zu optimieren oder nachzuholen,
- der Status ist final.

---

## 7. Erklärung des Sieges

## 7.1 Warum das wichtig ist
Besonders in digitalen Brettspielen entsteht Frust oft nicht durch Niederlage, sondern durch **inakzeptable Intransparenz**.

Die UX muss daher erklären:
- wer gewonnen hat,
- wie viele Punkte vorlagen,
- welcher Auslöser den finalen Punkt gebracht hat.

## 7.2 Gute Endgame-Erklärung beantwortet
- Welcher Spieler hat gewonnen?
- Mit wie vielen Punkten?
- Was war der finale Trigger?
- Gab es Longest Road / Largest Army / verdeckte VP-Karten als entscheidende Faktoren?

## 7.3 Schlechte Endgame-Erklärung wäre
- „Spiel vorbei, X gewinnt“ ohne weitere Einordnung
- Siegpunktzahl unklar
- verdeckte Punkte oder Sonderwertungen nicht nachvollziehbar

---

## 8. Postgame-Informationsbedürfnisse

Nach dem ersten Sieg-Moment verschiebt sich die UX von Emotion zu Einordnung.

Spieler wollen typischerweise wissen:
- finale Punktestände
- ggf. sichtbare Aufschlüsselung zentraler Wertungen
- Länge / grober Verlauf der Partie
- ob sie direkt nochmal spielen können

Für den MVP sollte diese Auswertung bewusst leicht bleiben.

Empfohlene Minimalinformationen:
- Gewinner
- finale Punkte
- zentrale Siegursache
- optional Dauer der Partie
- optional wichtigste Sonderwertungen

---

## 9. Übergänge nach Spielende

## 9.1 Grundsatz
Nach dem Endgame braucht die UX einen klaren nächsten Schritt.

Der Nutzer soll nicht fragen müssen:
- „Sind wir noch im selben Raum?“
- „Kann ich jetzt nochmal mit denselben Leuten spielen?“
- „Muss ich alles neu erstellen?“

## 9.2 Mögliche nächste Pfade
- Zurück in eine Postgame-Lobby
- Rematch starten
- Raum verlassen
- neue Partie später separat starten

## 9.3 MVP-Empfehlung
Da Rematch in frühen Versionen schnell unerwartete Komplexität erzeugt, gibt es zwei solide Optionen:

### Option A – konservativ
- Endgame -> zurück in denselben Raum / Lobby-Kontext
- Gruppe kann dort erneut ready werden
- Host startet bei Wunsch eine neue Partie

### Option B – etwas direkter
- Endgame -> expliziter Rematch-Call-to-action
- bei Zustimmung aller / Ready-Reset wird neues Match im selben Raum erzeugt

Für den MVP ist **Option A** UX-robuster.

---

## 10. Rematch UX

## 10.1 Zweck
Rematch dient sozialer Kontinuität: Die Gruppe bleibt zusammen und muss nicht den gesamten Entry-Prozess erneut durchlaufen.

## 10.2 UX-Ziele
- kein Verlust der Gruppenkonstellation
- kein unnötiger Room-Wechsel
- klarer Reset von Spielzuständen
- keine Verwechslung zwischen alter und neuer Partie

## 10.3 Wenn Rematch angeboten wird, muss klar sein
- Es startet **keine Fortsetzung**, sondern eine neue Partie
- Punkte, Board und Hände werden neu erzeugt
- der Raum bzw. die Gruppe bleibt erhalten

## 10.4 Schlechte Rematch-UX wäre
- neue Partie startet, ohne dass alle verstehen, dass alles zurückgesetzt wurde
- alter Endscreen und neue Partie wirken gleichzeitig aktiv
- Rejoin-/Reconnect-Logik verwechselt altes Match und neues Match

---

## 11. Rückkehr in die Lobby nach einer Partie

Wenn die Gruppe nach Spielende in einen koordinierten Raumzustand zurückkehrt, muss die UX klar unterscheiden zwischen:
- **Partie beendet**
- **Raum existiert weiter**

Das ist wichtig, damit Nutzer verstehen:
- Wir spielen gerade nicht mehr.
- Aber wir sind noch als Gruppe zusammen.

## UX-Ziele
- Postgame-Lobby darf sich nicht wie die ursprüngliche Vorstart-Lobby anfühlen, ohne Hinweis auf das beendete Spiel
- gleichwohl soll der nächste Startpfad vertraut bleiben

---

## 12. Fehler- und Grenzfälle im Endgame

## 12.1 Sieg tritt während komplexer Auflösung ein
Beispiel:
- Longest Road wechselt während einer Aktion
- verdeckte Victory Points werden relevant

UX-Ziel:
- Sieg nicht nur auslösen, sondern kausal erklären

## 12.2 Spieler disconnectet exakt zum Spielende
UX-Ziel:
- bei Reconnect ist das Match als beendet lesbar
- kein irreführendes Zurück in eine aktive Partie

## 12.3 Host verlässt unmittelbar nach Spielende den Raum
Falls der Raum weiter existiert oder neu zugewiesen wird, braucht die UX klare Kommunikation.

## 12.4 Rematch-Start scheitert
UX-Reaktion:
- alter Postgame-Zustand erhalten
- klar sagen, dass die neue Partie nicht gestartet werden konnte
- erneuten Versuch ermöglichen

---

## 13. Reconnect in den Endgame-Zustand

Wenn ein Spieler nach Spielende reconnectet, muss die UX nicht versuchen, ihn in die alte Aktionsphase zurückzubringen.

Stattdessen braucht er:
- klaren Hinweis, dass die Partie beendet wurde
- Gewinner + zentralen Abschlusskontext
- den aktuellen Raum-/Postgame-Zustand

---

## 14. UX-Erfolgskriterien für Endgame
- Anteil Spieler, die nach Testpartien korrekt benennen können, warum das Spiel endete
- Anzahl Verwirrungsmomente direkt nach dem Sieg
- Anteil Gruppen, die ohne Hilfe in den gewünschten Postgame-Pfad gelangen
- Rematch-Start-Erfolgsquote, falls unterstützt
- Abbruchquote zwischen Endgame und neuem Spielstart

---

## 15. Offene UX-Entscheidungen
1. Wollen wir im MVP direkt ein Rematch anbieten oder nur Rückkehr in denselben Raum?
2. Wie detailliert soll die Siegpunktaufschlüsselung im Postgame sein?
3. Wollen wir nur Gewinner + Punkte zeigen oder zusätzlich Dauer / Sonderwertungen / Match-Zusammenfassung?
4. Soll nach Spielende sofort ein koordinierter Ready-Reset für die nächste Partie möglich sein?
5. Braucht Postgame einen Chat-/Kommentarbereich oder reicht Raumkontinuität?

---

## 16. Kurzform für das Dev-Team
Die Endgame-UX ist gelungen, wenn:
- das Spielende sofort und eindeutig erkennbar ist,
- die Ursache des Siegs verständlich ist,
- keine Restinteraktionen mehr wie „aktive Partie“ wirken,
- und der nächste soziale Schritt für die Gruppe klar ist.