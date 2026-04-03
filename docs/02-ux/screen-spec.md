# UX Screen Specification Framework

## Zweck
Dieses Dokument definiert die UX-Spezifikation für `siedler_OG_II` auf Verhaltens-, Flow- und Interaktionsebene.

Es beschreibt **noch nicht** das visuelle UI-Design.

Im Fokus stehen:
- Nutzerziele
- Systemreaktionen
- Informations- und Entscheidungslogik
- Zustandswechsel
- Fehlerfälle
- Reibungspunkte
- Onboarding- und Verständlichkeitsanforderungen

Nicht im Fokus dieses Dokuments:
- konkretes Layout
- Farben, Typografie, Icons
- Komponentenstyling
- Motion-Design im Detail

---

## 1. UX-Leitprinzipien für das Produkt

### 1.1 Das Spiel muss Regeln nicht nur korrekt, sondern verständlich machen
Digitale Brettspiele scheitern UX-seitig oft nicht an den Regeln selbst, sondern daran, dass Nutzer nicht verstehen:
- warum etwas gerade nicht geht,
- was als Nächstes von ihnen erwartet wird,
- welche Informationen privat vs. öffentlich sind,
- und wann eine Phase abgeschlossen ist.

Für dieses Projekt gilt daher:
- jede relevante Phase muss klar erkennbar sein,
- jede gesperrte Aktion braucht eine verständliche Begründung,
- jede Forced Action muss unmissverständlich priorisiert werden,
- jeder Zustandswechsel muss nachvollziehbar sein.

### 1.2 Nicht das Board ist die primäre UX-Einheit, sondern der Entscheidungsraum des aktiven Spielers
Das Board ist zentral, aber UX-seitig ist wichtiger:
- was ich gerade tun kann,
- welche Konsequenzen mein nächster Schritt hat,
- und welche Informationen ich dafür brauche.

Deshalb wird die UX nicht nur um das Board herum spezifiziert, sondern um:
- Turn Context
- available actions
- pending obligations
- negotiation state
- rule feedback

### 1.3 Forced Actions haben immer Vorrang vor freiwilligen Aktionen
Wenn ein Spieler discarden muss oder der Robber gesetzt werden muss, darf die UX keine konkurrierenden Handlungsangebote machen.

### 1.4 Private Information muss sich UX-seitig konsistent anfühlen
Spieler müssen jederzeit intuitiv verstehen:
- was nur sie sehen,
- was alle sehen,
- was absichtlich verborgen bleibt.

### 1.5 Der MVP soll schnell spielbar sein, nicht maximal konfigurierbar
Room- und Gameplay-UX müssen die Time-to-play minimieren.

---

## 2. UX-Struktur des Produkts

Das Produkt hat drei übergeordnete UX-Modi:

1. **Entry Mode**
   - Landing
   - Create Room
   - Join Room
2. **Coordination Mode**
   - Lobby
   - Ready/Start
   - Reconnect / seat reassignment
3. **Play Mode**
   - Setup Phase
   - Turn Play
   - Trading
   - Forced Resolutions
   - Endgame

Jeder Modus hat andere UX-Anforderungen.

---

## 3. Globale UX-Anforderungen über alle Screens hinweg

## 3.1 Immer sichtbare Kernantworten
Ein Spieler soll auf jedem relevanten Screen ohne Nachdenken beantworten können:
- Wo bin ich gerade?
- Was passiert gerade?
- Bin ich dran?
- Was kann ich jetzt tun?
- Muss ich etwas tun?
- Was passiert als Nächstes?

## 3.2 Legality Feedback
Wenn eine Aktion nicht möglich ist, braucht die UX eine konkrete Begründung.

Beispiele:
- „Du musst zuerst würfeln.“
- „Du kannst pro Zug nur 1 Entwicklungskarte spielen.“
- „Diese Siedlung verletzt die Abstandsregel.“
- „Der Robber muss auf ein anderes Feld gesetzt werden.“

## 3.3 Realtime-Vertrauen
In Multiplayer-Spielen muss die UX Systemvertrauen aufbauen.

Dafür braucht es:
- klar erkennbare Bestätigung bei erfolgreichen Aktionen
- sichtbar laufende Realtime-Synchronisierung
- keine stillen, unerklärten Zustandswechsel
- nachvollziehbaren Event-Log

## 3.4 Entkopplung von Denken und Ausführen
Wo sinnvoll gilt:
- erst Preview / Auswahl
- dann Confirm / Commit

Das gilt besonders für:
- Bauen
- Trade-Angebote
- Robber-Zielwahl
- Discard-Auswahl
- Development-Card-Effekte

## 3.5 Fehler dürfen den Spielfluss nicht entgleisen lassen
Mögliche Fehler:
- Room existiert nicht mehr
- Seat wurde übernommen
- Verbindung kurz verloren
- paralleler Zustand hat Aktion ungültig gemacht

Die UX muss in diesen Fällen erklären:
- was passiert ist,
- was erhalten blieb,
- was der Nutzer jetzt tun kann.

---

## 4. UX-Spezifikation je Screen – Standardstruktur

Jeder Screen wird in den Folgedokumenten mit derselben Struktur beschrieben:

1. **Zweck des Screens**
2. **Primäre Nutzerfragen**
3. **Primäre Nutzerziele**
4. **Systemziele**
5. **Eingänge / Voraussetzungen**
6. **Hauptzustände**
7. **Wichtige Interaktionen**
8. **Entscheidungslogik**
9. **Fehler- und Grenzfälle**
10. **Verlassensbedingungen / Übergänge**
11. **Instrumentierungsbedarf / Telemetry**

---

## 5. Kritische UX-Themen, die überall mitgedacht werden müssen

## 5.1 Turn Ownership
Jeder Spieler muss jederzeit erkennen:
- wer der aktive Spieler ist,
- ob nur Beobachtung oder aktive Eingabe erwartet ist,
- ob gerade eine Antwort auf ein Trade-Angebot oder eine Forced Resolution offen ist.

## 5.2 Forced Resolution UX
Die UX für folgende Zustände ist kritisch:
- discard_pending
- robber_pending
- road_building_resolution
- year_of_plenty_resolution
- monopoly_resolution
- initial placement

Diese Zustände brauchen:
- klare Priorisierung
- fokussierte Entscheidungsaufgabe
- keine konkurrierenden Aktionsoptionen

## 5.3 Hidden Information UX
Besonders relevant für:
- Resource Counts anderer Spieler
- Development Cards anderer Spieler
- Steal-Resolution
- Kauf und Besitz von Victory Point Cards

## 5.4 Event Log vs. Action Guidance
Der Event Log ist nicht dasselbe wie die eigentliche Handlungsführung.

Die UX braucht beides:
- **Event Log** für Nachvollziehbarkeit
- **Action Guidance** für den nächsten sinnvollen Schritt

## 5.5 Reconnect UX
Ein Reconnect darf sich nicht wie ein Neustart anfühlen.

Ein Spieler muss nach Wiederkehr sofort verstehen:
- dass er wieder im selben Spiel ist,
- welcher Zustand aktuell gilt,
- ob er gerade eine ausstehende Aktion hat.

---

## 6. Dokumentaufteilung in `02-ux`

Die UX-Spezifikation wird in mehrere Dateien aufgeteilt:

- `screen-spec.md` – dieses Rahmendokument
- `lobby-screen.md` – Entry + Coordination UX
- `game-screen.md` – Kern-UX des laufenden Spiels
- `modal-flows.md` – Forced Flows, Trade, Dev Cards, Error/Recovery

Optional später:
- `entry-flows.md`
- `endgame-and-rematch.md`
- `telemetry-and-ux-signals.md`

---

## 7. Arbeitsregel für den nächsten Pass
Solange wir in `02-ux` arbeiten, spezifizieren wir:
- Verhalten
- Information
- Entscheidungen
- Friktion
- Zustandswechsel

Wir spezifizieren **noch nicht**:
- Pixel-Layout
- Styling
- visuelle Markenlogik
- konkrete Komponentenbibliothek

---

## 8. UX-Erfolgskriterien für den MVP
Der MVP ist UX-seitig erfolgreich, wenn neue Spieler:
- ohne Erklärung einen Raum beitreten können,
- die Lobby sofort verstehen,
- im Spiel wissen, wann sie dran sind,
- Forced Actions nicht übersehen,
- beim Bauen und Handeln wenig Fehlversuche haben,
- und nach einem kurzen Reconnect nicht verloren sind.