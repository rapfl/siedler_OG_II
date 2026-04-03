# Game Screen UX Specification

## Zweck
Der Game Screen ist nicht einfach eine Darstellung des Spielzustands, sondern der zentrale Entscheidungsraum der laufenden Partie.

Er muss vier Dinge gleichzeitig leisten:
- den aktuellen Zustand des Spiels verständlich machen,
- dem aktiven Spieler die legalen nächsten Schritte klar anbieten,
- nicht-aktive Spieler sinnvoll informiert halten,
- und Forced Actions so führen, dass kein Regelchaos entsteht.

---

## 1. Primäre Nutzerfragen
Jeder Spieler muss den Game Screen so lesen können, dass diese Fragen jederzeit beantwortbar sind:
- Wer ist dran?
- In welcher Phase ist der Zug?
- Muss ich gerade etwas tun?
- Was kann ich jetzt legal tun?
- Was ist gerade passiert?
- Welche Information ist privat und welche öffentlich?
- Wie nah bin ich am Gewinnen?

---

## 2. Primäre Nutzerziele

### Aktiver Spieler
- die aktuelle Phase verstehen
- legal handeln können, ohne Regeln auswendig wissen zu müssen
- Kosten und Folgen einer Aktion antizipieren
- keine unbeabsichtigten Aktionen auslösen

### Nicht-aktive Spieler
- das Spielgeschehen verfolgen
- bei Bedarf reagieren können, z. B. auf Trades
- verstehen, warum sie gerade nicht handeln können
- Vertrauen behalten, dass der State korrekt synchronisiert ist

### Systemziele
- Regelverletzungen präventiv reduzieren
- Forced States priorisieren
- versteckte Informationen schützen
- Realtime-Klarheit aufrechterhalten

---

## 3. Der mentale Kern des Game Screens
UX-seitig besteht der Game Screen aus fünf mentalen Ebenen:

1. **Globaler Spielkontext**
   - Match läuft, Setup oder regulärer Zug, aktueller Spieler
2. **Eigene Lage**
   - meine Karten, meine Punkte, meine Optionen
3. **Öffentliche Lage**
   - Board, Gebäude, Robber, Kartenanzahl, offene Sonderwertungen
4. **Aktionskontext**
   - was jetzt legal ist
5. **Ereigniskontext**
   - was gerade passiert ist und wie es dazu kam

Der Screen muss diese Ebenen klar trennbar machen, auch ohne konkrete visuelle Festlegung im aktuellen Pass.

---

## 4. Hauptzustände des Game Screens

## 4.1 Setup Phase
Spieler platzieren initiale Siedlungen und Straßen.

UX-Ziele:
- Reihenfolge verständlich machen
- Distanzregel verständlich machen
- klar machen, welche Auswahl gerade erwartet wird
- deutlich unterscheiden zwischen erster und zweiter Platzierungsrunde

## 4.2 Eigener regulärer Zug
Der aktive Spieler kann selbst handeln.

UX-Ziele:
- Phase klar kommunizieren
- Development-Card-Fenster und Würfelphase sauber unterscheiden
- danach Action Phase offen halten, ohne zu überfordern

## 4.3 Fremder regulärer Zug
Der Spieler ist Beobachter.

UX-Ziele:
- Verlauf lesbar halten
- eigene Inaktivität verständlich machen
- Eingriffe nur dort zulassen, wo sie regelkonform sind

## 4.4 Forced Resolution auf eigenem Client
Beispiele:
- Discard
- Robber placement
- Development Card resolution
- Trade response

UX-Ziele:
- Fokus komplett auf die Pflichtentscheidung legen
- keine konkurrierenden Interaktionsangebote

## 4.5 Reconnect mitten im Spiel
Ein Spieler kehrt in eine laufende Partie zurück.

UX-Ziele:
- Zustand sofort verständlich machen
- kein Gefühl von Kontrollverlust
- klar zeigen, ob der Spieler gerade selbst eine ausstehende Pflichtaktion hat

## 4.6 Match Finished
Das Spiel ist beendet, der normale Aktionskontext ist geschlossen.

UX-Ziel:
- klare Auflösung statt unklarem Restzustand

---

## 5. Zentrale UX-Funktion: Action Guidance
Der Game Screen darf sich nicht darauf verlassen, dass Spieler die Regeln implizit aus dem Board lesen.

Er muss aktiv führen.

### 5.1 Action Guidance beantwortet für den aktiven Spieler:
- Was ist der nächste notwendige Schritt?
- Welche optionalen Schritte sind erlaubt?
- Was ist gerade blockiert?
- Was beendet meinen Zug?

### 5.2 Action Guidance beantwortet für nicht-aktive Spieler:
- Warum kann ich gerade nichts tun?
- Muss ich gleich auf etwas reagieren?
- Ist ein Trade/Discard/Steal von mir erwartet?

---

## 6. Turn UX im Detail

## 6.1 Turn Start
Zu Turn-Beginn muss klar sein:
- welcher Spieler dran ist
- ob ein unmittelbarer Sieg bereits vorliegt
- ob vor dem Würfeln noch eine Development Card legal spielbar ist

UX-seitig wichtig:
- Turn Start ist ein Kontextwechsel, kein bloßes Log-Event

## 6.2 Pre-roll Decision Window
Vor dem Würfeln kann der aktive Spieler eine Development Card spielen, sofern legal.

UX-Anforderung:
- dieses Fenster muss verständlich sein
- es darf nicht so aussehen, als müsse zwingend vor dem Würfeln noch etwas getan werden
- Würfeln bleibt die Default-Fortsetzung, wenn nichts anderes gewünscht ist

## 6.3 Roll Resolution
Nach dem Würfeln muss die UX klar machen:
- welches Ergebnis gefallen ist
- ob Produktion normal stattfindet oder eine 7er-Auflösung startet
- welche Änderungen daraus folgen

Bei normaler Produktion:
- Ressourcengewinne müssen nachvollziehbar sein

Bei 7:
- die UX muss sofort in Forced Resolution übergehen
- keine konkurrierenden Build-/Trade-Signale mehr anzeigen

## 6.4 Action Phase
Nach erfolgreicher Roll- oder 7-Auflösung befindet sich der aktive Spieler in der offenen Aktionsphase.

Erlaubte Aktionen typischerweise:
- bauen
- mit Spielern handeln
- mit Bank/Hafen handeln
- Entwicklungskarte kaufen
- eine Development Card spielen, falls noch keine in diesem Zug gespielt wurde und die Karte legal ist
- Zug beenden

UX-Herausforderung:
Die Phase ist absichtlich offen. Der Screen muss daher Orientierung geben, ohne ein starres lineares Skript zu erzwingen.

## 6.5 End Turn
Zug beenden ist nicht nur eine Taste, sondern eine bewusste Schließung des eigenen Handlungsfensters.

UX-Anforderung:
- nicht unnötig blockieren
- aber klar machen, dass danach keine eigenen Aktionen mehr möglich sind

---

## 7. Build UX

## 7.1 Ziel
Bauen soll sich sicher und regelklar anfühlen.

Spieler sollen nicht raten müssen:
- ob sie genug Ressourcen haben,
- wo etwas legal ist,
- warum ein Ort illegal ist,
- was genau gebaut wird.

## 7.2 Grundprinzip
Bauen ist ein Zwei- oder Drei-Schritt-Prozess:
1. Bauart wählen
2. legalen Zielort wählen
3. Aktion bestätigen oder direkt committen, wenn die Semantik eindeutig ist

## 7.3 Settlement / City / Road
Für jede Bauart braucht die UX:
- klares Kostenbewusstsein
- Preview
- Legality feedback
- Erfolgsmeldung im Event-Kontext

## 7.4 Illegale Bauversuche
Wenn ein Nutzer auf einen illegalen Zielort geht, muss die UX erklären, warum:
- keine angrenzende eigene Straße
- Distanzregel verletzt
- Edge schon belegt
- Ziel ist kein legaler Upgrade-Punkt
- Ressourcen fehlen

---

## 8. Trading UX im Kontext des Game Screens

Trade ist nicht nur ein Modalproblem, sondern ein Kernbestandteil des aktiven Turns.

Der Game Screen muss klar machen:
- Trade ist nur im Zug des aktiven Spielers möglich
- Trades sind freiwillige offene Aktionen innerhalb der Action Phase
- Bank/Hafen-Trade ist kein sozialer Trade

### Wichtige UX-Ziele
- sozialer Trade und Banktrade dürfen nicht verwechselt werden
- Trade-Angebote dürfen den übrigen Flow nicht unklar machen
- eingehende Antworten anderer Spieler müssen für den aktiven Spieler nachvollziehbar bleiben

---

## 9. Hidden Information UX

## 9.1 Eigene Informationen
Der aktive und nicht-aktive Spieler müssen ihre eigenen verdeckten Informationen sicher lesen können:
- exakte Ressourcenhand
- exakte Development Cards in der Hand
- eigene latent verfügbare Optionen

## 9.2 Fremde Informationen
Andere Spieler dürfen nur sehen, was regelkonform öffentlich ist:
- Kartenanzahl
- sichtbare Gebäude
- offene Sonderwertungen
- öffentliche Trade-Informationen, sofern Angebot öffentlich ausgespielt wird

## 9.3 Wahrnehmungsziel
Die UX soll nicht den Eindruck erwecken, dass Informationen „fehlen“, sondern dass sie bewusst verborgen sind.

---

## 10. Event Log UX

## 10.1 Aufgabe des Logs
Der Event Log dient der Nachvollziehbarkeit, nicht der primären Handlungsführung.

Er beantwortet:
- Was ist gerade passiert?
- Warum hat sich der Zustand verändert?
- Habe ich etwas verpasst?

## 10.2 Gute Log-Ereignisse
- Würfelwurf
- Ressourcenproduktion
- Discard
- Robber Move
- Steal
- Bauaktionen
- Trade Offers / Accepts
- Development Card Plays
- Longest Road / Largest Army Wechsel
- Sieg

## 10.3 Schlechte Log-Ereignisse
Nicht jeder interne State-Wechsel gehört in das Nutzerlog.

Das Log darf nicht mit technischen Zwischenschritten geflutet werden.

---

## 11. Nicht-aktiver Spieler: UX-Anforderungen

Nicht dran sein darf sich nicht wie „aus dem Spiel gefallen“ anfühlen.

Der Screen muss für nicht-aktive Spieler:
- den gegnerischen Zug gut lesbar machen
- kommende eigene Reaktionsmöglichkeiten antizipierbar machen
- aktive Antworten erlauben, wenn sie relevant werden, z. B. Trade Response oder Discard
- ansonsten unnötige Interaktionssignale vermeiden

---

## 12. Forced States im Game Screen

## 12.1 Discard
Wenn ein Spieler discarden muss:
- dieser Zustand hat höchste Priorität
- andere Informationen treten in den Hintergrund
- dennoch muss sichtbar bleiben, warum discard nötig ist

## 12.2 Robber Placement
Wenn der aktive Spieler den Robber setzen muss:
- die Auswahlaufgabe muss glasklar sein
- das aktuelle Robber-Hex darf nicht als gültiges Ziel erscheinen
- nach Wahl des Hexes folgt, falls relevant, eine zweite Auswahl: Wen willst du bestehlen?

## 12.3 Development Card Resolutions
Diese Effekte brauchen fokussierte Mini-Flows:
- Road Building
- Monopoly
- Year of Plenty

Wichtig:
- Der Spieler muss verstehen, dass diese Auswahl Teil derselben gespielten Karte ist
- keine Vermischung mit normaler Build-/Trade-Logik

---

## 13. Setup UX

Der Setup-Teil ist für neue Spieler besonders fehleranfällig.

### UX-Ziele
- Reihenfolge klar halten
- aktuell geforderte Handlung eindeutig machen
- legale Startplätze hervorheben
- illegalen Startplätzen klare Gründe geben
- zweite Platzierung als eigene Phase markieren
- Startressourcen nachvollziehbar machen

### Besondere Gefahr
Wenn die UX Setup und normales Spiel nicht klar trennt, erwarten Spieler fälschlich schon vollständige Standardaktionen.

---

## 14. Reconnect UX im Game Screen

Nach Reconnect muss ein Spieler sofort diese Antworten bekommen:
- Du bist wieder verbunden
- Das Spiel läuft noch
- Aktueller Spieler ist X
- Aktuelle Phase ist Y
- Du musst jetzt Z tun / du musst aktuell nichts tun

Wenn eine Forced Action auf dem reconnectenden Spieler offen ist, hat diese Priorität.

---

## 15. Fehler- und Grenzfälle

## 15.1 Aktion war beim Klick legal, beim Server-Eingang aber nicht mehr legal
Beispiel:
- State hat sich durch Realtime-Änderung geändert
- Trade wurde bereits anderweitig abgeschlossen

UX-Ziel:
- die Ablehnung darf nicht technisch und kryptisch sein
- der Spieler muss verstehen, dass sich der Zustand inzwischen geändert hat

## 15.2 Kurze Verbindungsunterbrechung während eigener Entscheidung
UX-Ziel:
- kein stiller Verlust der Aktion
- klarer Recovery-Pfad

## 15.3 Unklare Siegauflösung
Wenn Sieg unmittelbar durch Longest Road / Largest Army / VP-Reveal entsteht, muss der Screen diese Kausalität deutlich machen.

---

## 16. Erfolgsmetriken für die Game-UX
- Anzahl ungültiger Bauversuche
- Anzahl ungültiger Dev-Card-Spielversuche
- Zeit bis erster legaler Zug in Testpartien
- Häufigkeit von Turn-Ende ohne erkennbare Aktion
- Anzahl Reconnects mit anschließender Aufgabe
- Häufigkeit von Regelirritationen in Usertests

---

## 17. Offene UX-Entscheidungen
1. Wie stark führen wir neue Spieler in der Action Phase?
2. Braucht der aktive Spieler kontextuelle „empfohlene nächste Schritte“?
3. Soll Turn End bei ungenutzten legalen Aktionen warnen oder nie bremsen?
4. Wie explizit zeigen wir Siegpunktzusammensetzung während der Partie?
5. Wie stark soll das Event Log private vs. öffentliche Ereignisse getrennt behandeln?

---

## 18. Kurzform für das Dev-Team
Der Game Screen ist UX-seitig dann gelungen, wenn:
- jede Phase klar lesbar ist,
- der aktive Spieler legal handeln kann, ohne Regeln auswendig zu kennen,
- nicht-aktive Spieler das Geschehen nachvollziehen,
- Forced States nicht übersehen werden,
- und der Realtime-State nie mysteriös wirkt.