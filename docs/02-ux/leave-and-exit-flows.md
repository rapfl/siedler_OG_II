# Leave and Exit Flows UX Specification

## Zweck
Dieses Dokument spezifiziert die UX für bewusstes Verlassen, technisches Wegfallen und Rückkehr in Bezug auf Room und Match.

Es ergänzt Block 02 um die bisher fehlende explizite Behandlung von:
- Leave aus der Lobby
- Leave nach Match-Ende
- Disconnect während laufender Partie
- Unterschied zwischen Exit und Verbindungsunterbrechung
- Folgen für Seat, Host und Room-Lifecycle

---

## 1. Grundprinzip

Für das Produkt gilt UX-seitig:
- **bewusstes Verlassen** und **technischer Disconnect** sind nicht dasselbe.

### Bewusstes Verlassen
Der Nutzer entscheidet aktiv:
- diesen Room zu verlassen
- diese Session zu beenden
- nicht mehr Teil der aktuellen Gruppenkonstellation zu sein

### Disconnect
Die Verbindung bricht technisch weg oder wird temporär unterbrochen.

UX-seitig muss das System zunächst annehmen:
- Rückkehr ist möglich
- Seat und Kontext bleiben vorerst bestehen

---

## 2. Warum diese Unterscheidung wichtig ist
Ohne diese Trennung entstehen sofort UX- und Modellierungsprobleme:
- Seats verschwinden zu früh
- Spieler fühlen sich „rausgeworfen“
- Host-Neuzuweisung wirkt chaotisch
- Reconnect fühlt sich unzuverlässig an

---

## 3. Leave / Exit in der Pre-match Lobby

## 3.1 Nutzerziel
Ein Spieler möchte den Room bewusst verlassen, bevor eine Partie gestartet wurde.

## 3.2 UX-Ziel
Der Austritt soll einfach sein, aber seine Konsequenz muss klar bleiben.

## 3.3 Verhalten
Wenn ein normaler Spieler die Lobby verlässt:
- sein Seat wird freigegeben
- sein Ready-State entfällt
- die übrigen Spieler sehen, dass er nicht mehr Teil des Rooms ist

Wenn der Host die Lobby verlässt:
- Host-Reassignment-Regel greift nach Grace-Logik oder sofort nach definierter Room-Policy

## 3.4 Nutzerwahrnehmung
Der Leave darf sich klar anfühlen wie:
- „Ich bin nicht mehr in diesem Raum.“

Nicht wie:
- „Ich bin vielleicht noch halb drin.“

---

## 4. Leave / Exit in der Postgame-Lobby

## 4.1 Nutzerziel
Ein Spieler will nach einer beendeten Partie die Gruppe verlassen, ohne dass das unklar mit dem Ende des Matches vermischt wird.

## 4.2 UX-Ziel
Die UX muss sauber unterscheiden:
- die Partie ist vorbei,
- und zusätzlich verlasse ich jetzt den bestehenden Room.

## 4.3 Verhalten
Beim Leave aus der Postgame-Lobby:
- Seat wird freigegeben
- Room-Kontinuität für verbleibende Spieler bleibt erhalten
- erneute Partieplanung geschieht ohne diesen Spieler

---

## 5. Disconnect in der Pre-match Lobby

## 5.1 UX-Ziel
Kurze Unterbrechungen sollen nicht wie endgültiges Verlassen wirken.

## 5.2 Verhalten
Bei technischem Disconnect:
- Spieler bleibt zunächst Room-Mitglied
- Seat bleibt reserviert
- Status wird als disconnected lesbar
- Grace-Zeitraum läuft

## 5.3 Wenn Reconnect innerhalb Grace-Zeitraum erfolgt
- Seat bleibt erhalten
- Nutzer kehrt in denselben Lobby-Kontext zurück

## 5.4 Wenn Grace-Zeitraum abläuft
- Seat kann freigegeben werden
- Room-State wird entsprechend aktualisiert

---

## 6. Disconnect während Match In Progress

## 6.1 UX-Ziel
Die Partie soll nicht chaotisch umgebaut werden, nur weil eine Verbindung kurz weg ist.

## 6.2 Verhalten
Bei Disconnect während laufender Partie:
- der Spieler bleibt logisch Teil des Matches
- sein Seat / seine Rolle bleiben bestehen
- Zustand wird als disconnected markiert
- Reconnect bleibt möglich

## 6.3 Nutzerwahrnehmung der übrigen Spieler
Andere Spieler müssen verstehen:
- dieser Spieler ist gerade nicht verbunden,
- aber nicht automatisch dauerhaft weg.

## 6.4 Bewusstes Leave während laufender Partie
Für den MVP gilt UX-seitig:
- kein komplexes Match-Reshaping
- der Spieler gilt funktional als abandoned / disconnected im Sinne der Session-Logik
- die Partie wird nicht neu zusammengesetzt

Dies ist bewusst keine feingranulare soziale Lösung, sondern eine robuste MVP-Regel.

---

## 7. Host Leave / Host Disconnect

## 7.1 Vor Match-Start
Wenn der Host vor Match-Start wegfällt:
- kurzer Grace-Zeitraum bei Disconnect
- danach Host-Neuzuweisung
- bei bewusstem Leave kann Host-Neuzuweisung direkter greifen

## 7.2 Nach Match-Start
Während einer laufenden Partie ist „Host“ primär noch als Room-Rolle relevant, nicht als Regelautorität im Match.

UX-Folge:
- laufende Partie darf nicht davon abhängen, dass der ursprüngliche Host online bleibt
- Room-Administrative Rechte nach Match-Ende können bei Bedarf neu zugewiesen werden

---

## 8. Session Conflict / Seat Recovery

## 8.1 Problemfall
Ein Nutzer öffnet einen Invite-Link oder kehrt zurück, aber der Seat scheint bereits mit einer früheren Session verbunden.

## 8.2 UX-Ziel
Das System soll diesen Fall nicht kryptisch als Fehler behandeln, sondern als Wiederaufnahmeproblem.

## 8.3 Erwartete UX-Logik
Der Nutzer bekommt sinngemäß die Wahl:
- vorhandene Zugehörigkeit wieder übernehmen
- mit neuem Namen / neuer Session beitreten, falls erlaubt
- abbrechen

## 8.4 Wahrnehmungsziel
- „Das System erkennt, dass ich wahrscheinlich schon zu dieser Runde gehöre.“

---

## 9. Exit aus dem Produkt vs. Leave aus dem Room

## 9.1 Wichtige Unterscheidung
Nicht jedes Schließen des Tabs ist ein bewusstes Verlassen des Rooms.

### UX-Regel
- expliziter Leave = Room-Austritt
- implizites Tab-/Netzwerk-Ende = zunächst Disconnect

Diese Trennung ist zentral für ein gutes Multiplayer-Gefühl.

---

## 10. Übergänge und Zustandsfolgen

## 10.1 Pre-match Lobby
- leave -> seat freed -> room remains
- disconnect -> seat reserved -> possible reconnect -> eventual expiry

## 10.2 Match In Progress
- disconnect -> player remains part of match -> reconnect possible
- explicit leave -> treated as abandonment/disconnect semantics, not full match restructure

## 10.3 Postgame Lobby
- leave -> seat freed -> room remains for others
- disconnect -> short continuity window remains possible

---

## 11. Fehler- und Grenzfälle

## 11.1 Nutzer glaubt, er habe den Room verlassen, ist aber nur disconnected
Die UX muss Leave und Connection Status klar trennen.

## 11.2 Nutzer reconnectet nach Seat-Freigabe
Die UX muss klar sagen, dass der frühere Platz nicht mehr reserviert ist.

## 11.3 Alle Spieler verlassen den Room
Dann endet nicht nur das Match, sondern auch der Room-Lifecycle.

## 11.4 Host verlässt Room während Postgame-Planung
Host-Neuzuweisung muss sichtbar und nicht überraschend sein.

---

## 12. Bezug zu anderen UX-Dokumenten
Dieses Dokument ergänzt:
- `entry-flows.md` bei Session Conflict und Resume
- `lobby-screen.md` bei Presence und Host-Wechsel
- `room-lifecycle.md` bei Room-Zuständen
- `endgame-and-rematch.md` bei Austritt nach Match-Ende

---

## 13. Konsequenzen für Block 03
Block 03 braucht getrennte semantische Events und Zustände für:
- explicit_leave
- temporary_disconnect
- reconnect_success
- seat_expired
- host_reassigned
- room_closed

---

## 14. Kurzform für das Dev-Team
Die wichtigste Arbeitsregel lautet:
- **Leave ist eine bewusste soziale Handlung.**
- **Disconnect ist zunächst ein technischer Zwischenzustand.**
- Room, Seat und Match dürfen darauf nicht gleich reagieren.