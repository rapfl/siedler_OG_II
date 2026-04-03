# Modal and Forced-Flow UX Specification

## Zweck
Dieses Dokument spezifiziert die UX für die Interaktionssituationen, in denen der normale Spielfluss unterbrochen oder fokussiert wird.

Dazu gehören insbesondere:
- Trade
- Discard
- Robber
- Development Card Resolutions
- Reconnect / Recovery
- kritische Fehler- und Grenzfälle

Diese Flows sind UX-seitig besonders wichtig, weil sie:
- hohe Regelbindung haben,
- die meiste Verwirrung erzeugen können,
- und oft mehrere Spieler gleichzeitig betreffen.

---

## 1. Grundprinzip für fokussierte Flows

Wenn ein Modal oder Forced Flow aktiv ist, muss für den betroffenen Nutzer glasklar sein:
- warum dieser Flow gerade erscheint,
- was genau entschieden werden muss,
- welche Regeln dafür gelten,
- wann der Flow abgeschlossen ist.

### Harte UX-Regel
Ein fokussierter Flow darf nie gleichzeitig wie eine optionale Nebenaktion wirken.

---

## 2. Trade Flow

## 2.1 UX-Ziel
Trade soll sich wie eine bewusste Verhandlung anfühlen, nicht wie ein technischer Kartentransfer.

Gleichzeitig muss der MVP bewusst einfach bleiben.

## 2.2 Nutzerrollen im Trade
### Aktiver Spieler
- initiiert Angebot
- sieht eingehende Antworten
- entscheidet, welchen Deal er annimmt

### Nicht-aktive Spieler
- verstehen, dass ein Trade angeboten wurde
- können annehmen oder ablehnen
- dürfen nicht fälschlich denken, sie könnten außerhalb der erlaubten Logik frei handeln

## 2.3 MVP-Entscheidung
In V1:
- öffentliche oder breit ausgespielte Trade Offers
- accept / reject
- keine Counteroffers

UX-Vorteil:
- geringere Komplexität
- weniger chaotische Parallelverhandlungen
- klarere Realtime-Synchronisation

## 2.4 Trade-Erstellungsflow
Der aktive Spieler braucht:
1. Definition von „ich gebe“
2. Definition von „ich möchte“
3. Auswahl des Adressatenkreises, falls differenziert unterstützt
4. Review des Angebots
5. Senden

UX-Anforderungen:
- symmetrische Wahrnehmung von Geben und Bekommen
- keine Mehrdeutigkeit über Mengen
- sofort erkennbare Ungültigkeit, wenn Ressourcen fehlen

## 2.5 Trade-Response-Flow
Nicht-aktive Spieler müssen verstehen:
- wer handelt
- was angeboten wird
- was von ihnen erwartet wird
- ob das Angebot noch offen ist

UX-Ziel:
- Response soll schnell gehen
- keine Überfrachtung mit irrelevanten Kontextdaten

## 2.6 Abschluss des Trades
Wenn eine Annahme vorliegt, muss der aktive Spieler den Deal final bestätigen.

Wichtig:
- Deal-Abschluss muss als bewusster Commit wahrgenommen werden
- nach erfolgreicher Durchführung muss klar sein, dass der Trade abgeschlossen ist und die Karten übertragen wurden

## 2.7 Trade-Fehlerfälle
- Angebot nicht mehr gültig, weil Ressourcen inzwischen fehlen
- Angebot wurde bereits geschlossen
- Zustand hat sich durch andere Aktion verändert

UX-Reaktion:
- nicht technisch, sondern handlungsorientiert
- z. B. „Das Angebot ist nicht mehr gültig, weil sich dein Bestand geändert hat.“

---

## 3. Bank- und Hafenhandel

## 3.1 UX-Ziel
Bank/Hafenhandel muss sich klar anders anfühlen als sozialer Handel.

### Nutzer muss verstehen:
- hier verhandle ich nicht mit Mitspielern
- das Verhältnis ist regelbasiert und fix
- mein Hafenzugang beeinflusst die verfügbaren Konditionen

## 3.2 Wahrnehmungsziel
Sozialer Trade = Verhandlung
Bank/Hafen = Umtauschregel

Diese beiden Modi dürfen UX-seitig nicht ineinander verschwimmen.

---

## 4. Discard Flow

## 4.1 Trigger
Discard wird ausgelöst, wenn bei einer gewürfelten 7 ein Spieler 8 oder mehr Ressourcenkarten besitzt.

## 4.2 UX-Ziel
Discard ist eine Pflichtentscheidung mit potenziell hohem Frust.

Die UX muss:
- sofort klar machen, warum discard nötig ist,
- exakt zeigen, wie viele Karten abgelegt werden müssen,
- Fehlzählungen verhindern,
- Abschluss eindeutig machen.

## 4.3 Wahrnehmung
Der Nutzer soll nicht denken:
- „Warum bin ich gesperrt?“

sondern:
- „Ich muss jetzt X Karten abwerfen, dann geht es weiter.“

## 4.4 Interaktionslogik
1. System zeigt benötigte Discard-Anzahl
2. Nutzer wählt Karten aus eigener Hand
3. Auswahl zählt sichtbar mit
4. Confirm wird erst legal, wenn exakt die richtige Zahl gewählt wurde
5. Nach Bestätigung wird der Flow abgeschlossen

## 4.5 UX-Gefahren
- falsche mathematische Erwartung bei ungerader Kartenanzahl
- versehentlich zu viele oder zu wenige Karten markiert
- unklar, ob Auswahl bereits final ist

## 4.6 Nicht-aktive Beobachter
Andere Spieler sollten verstehen, dass Discard läuft, aber keine privaten Karten sehen.

Sie brauchen nur:
- dass Discard noch nicht abgeschlossen ist
- welche Spieler davon betroffen sind

---

## 5. Robber Flow

## 5.1 UX-Ziel
Robber ist ein zweistufiger Entscheidungsflow:
1. Wohin soll der Robber?
2. Wen will ich berauben, falls möglich?

Dieser Flow muss sich taktisch anfühlen, aber regelklar bleiben.

## 5.2 Phase 1 – Hex auswählen
Der Nutzer muss verstehen:
- aktueller Robber-Standort kann nicht erneut gewählt werden
- Desert ist legal
- ein Hex ohne beraubbaren Gegner kann dennoch ein gültiges Ziel sein

UX-Anforderung:
- legale und illegale Ziele müssen semantisch unterscheidbar sein
- bei illegalem Ziel klare Begründung

## 5.3 Phase 2 – Zielspieler wählen
Wenn mehrere beraubbare Gegner angrenzen, braucht der Nutzer einen klaren Auswahlfluss.

UX-Ziel:
- keine Unklarheit, wer überhaupt legal beraubt werden darf
- klarer Übergang von Hex-Wahl zu Spieler-Wahl

## 5.4 Steal-Auflösung
Die eigentliche gestohlene Karte ist zufällig.

UX-Ziel:
- Ergebnis klar kommunizieren
- private Karten anderer nicht offenlegen
- kein Eindruck, als hätte der aktive Spieler gezielt einen Ressourcentyp gewählt

---

## 6. Development Card Flows

## 6.1 Allgemeine UX-Anforderungen
Development Cards sind regelintensiv und müssen daher:
- klar als Sonderaktion erkennbar sein
- in sich geschlossene Mini-Flows haben
- den normalen Turn State danach sauber fortsetzen

### Immer zu kommunizieren
- welche Karte gespielt wurde
- welcher Effekt jetzt abgewickelt wird
- ob danach die normale Aktionsphase weitergeht

## 6.2 Knight
UX-seitig fast identisch mit Robber Flow, aber ohne 7er-Discard.

Der Spieler muss verstehen:
- dies ist ein Knight-Effekt
- jetzt folgt Robber-Move + ggf. Steal
- danach kehrt der Zug in die normale Aktionsphase zurück

## 6.3 Road Building
Der Spieler setzt zwei Straßen kostenlos.

UX-Ziel:
- klar machen, dass beide Platzierungen Teil derselben Kartenauflösung sind
- Fortschritt sichtbar machen: erste Straße gesetzt, zweite noch offen
- keine Vermischung mit normalem kostenpflichtigem Straßenbau

## 6.4 Year of Plenty
Der Spieler wählt zwei Ressourcen.

UX-Ziel:
- klar machen, dass zwei Picks erlaubt sind
- Zwischenstand anzeigen
- Abschluss erst nach zwei gültigen Wahlen

## 6.5 Monopoly
Der Spieler wählt einen Ressourcentyp.

UX-Ziel:
- die Entscheidung maximal klar und irreversibel machen
- nach Auflösung deutlich zeigen, was dadurch passiert ist

## 6.6 Victory Point
Diese Karte ist kein normaler Forced Flow.

UX-seitig wichtig:
- Besitz bleibt verdeckt
- relevante Offenlegung geschieht nur im Siegkontext

---

## 7. Setup Forced Flows

## 7.1 Initial Settlement Placement
Der Nutzer muss verstehen:
- jetzt wird eine Start-Siedlung gesetzt
- Distanzregel gilt bereits
- dies ist noch nicht normales Bauen

## 7.2 Initial Road Placement
Nach der Siedlung folgt die zugehörige Straße.

UX-Ziel:
- deutlich machen, dass die Straße an die gerade gesetzte Siedlung anschließen muss
- keine Verwechslung mit freiem Straßenbau

## 7.3 Zweite Setup-Runde
Die Umkehrung der Reihenfolge muss ausdrücklich kommuniziert werden.

## 7.4 Startressourcen
Nach der zweiten Siedlung müssen Startressourcen nachvollziehbar vergeben werden.

UX-Ziel:
- keine „magische“ Kartenänderung ohne Erklärung

---

## 8. Reconnect / Recovery Flow

## 8.1 Ziel
Reconnect darf sich nicht wie ein Reset anfühlen.

## 8.2 UX-Anforderungen
Nach Reconnect braucht der Spieler eine kurze, klare Wiederorientierung:
- Verbindung wiederhergestellt
- aktueller Spieler
- aktuelle Phase
- eigene offene Pflichtaktion, falls vorhanden

## 8.3 Sonderfall: Reconnect in Forced Flow
Wenn der Nutzer mitten in Discard, Robber oder einer Dev-Card-Auflösung reconnectet, muss genau dieser Flow wieder priorisiert werden.

---

## 9. Fehler- und Recovery-Flows

## 9.1 Command Rejected wegen verändertem Zustand
Beispiel:
- Nutzer klickt auf eine im Client scheinbar mögliche Aktion
- Server lehnt ab, weil State inzwischen anders ist

UX-Ziel:
- Ablehnung erklären
- Nutzer wieder in den aktuellen legalen Entscheidungsraum bringen

## 9.2 Session Lost
Wenn die Session nicht wiederhergestellt werden kann, braucht es:
- klare Aussage
- kein stilles Zurückwerfen in die Landing Page
- nachvollziehbaren Recovery-Pfad

## 9.3 Room / Match Unavailable
Wenn das Spiel nicht mehr verfügbar ist:
- klarer Abschlusszustand
- nicht wie ein technischer Absturz wirken lassen

---

## 10. Wann ein Flow beendet ist
Jeder fokussierte Flow braucht eine eindeutige Abschlusslogik.

### Beispiele
- Discard beendet sich nach gültiger Bestätigung
- Robber beendet sich nach Hex-Wahl plus ggf. Steal
- Road Building beendet sich nach zwei gültigen Straßen oder sauberer Sonderregelprüfung, falls zweite Platzierung unmöglich wäre
- Trade beendet sich nach Abschluss, Ablehnung aller oder aktivem Abbruch

Wenn unklar bleibt, ob ein Flow noch läuft, entsteht sofort UX-Vertrauensverlust.

---

## 11. Erfolgsmetriken für modale / fokussierte Flows
- Häufigkeit abgebrochener Trade-Angebote
- Zeit bis Discard-Confirm
- Anzahl Fehlklicks im Robber-Flow
- Anzahl abgebrochener Development-Card-Resolutions
- Reconnect-Erfolgsrate mitten in Forced States
- Support-/Testfeedback zu „Ich wusste nicht, was von mir erwartet wird“

---

## 12. Offene UX-Entscheidungen
1. Sollen Trade-Angebote an alle oder gezielt an einzelne Spieler adressierbar sein?
2. Braucht der aktive Spieler bei offenen Trade-Antworten einen Timeout oder rein manuelle Schließung?
3. Wie stark erklären wir Dev-Card-Effekte textlich im Flow?
4. Wie offensiv soll Reconnect-Hinweis kommuniziert werden?
5. Wollen wir im MVP explizite Confirm-Schritte für alle Forced Flows oder nur dort, wo Fehlklick-Risiko hoch ist?

---

## 13. Kurzform für das Dev-Team
Die modalen und fokussierten Flows sind UX-seitig dann gelungen, wenn:
- ihre Auslöser klar sind,
- ihre Aufgabe klar ist,
- ihre Regeln klar sind,
- und ihr Ende klar ist.

Sobald ein Spieler in einem dieser Flows fragen muss „Warum sehe ich das?“ oder „Was muss ich jetzt tun?“, ist die UX an einer kritischen Stelle noch nicht scharf genug.