# Room Lifecycle UX Specification

## Zweck
Dieses Dokument schließt die Lücke zwischen Lobby, laufendem Match und Postgame-Zustand.

Es beschreibt den UX-seitigen Lebenszyklus eines **Rooms** als sozialem Container, der:
- vor einem Match existiert,
- ein Match tragen kann,
- nach einem Match weiterbestehen kann,
- und unabhängig vom einzelnen Match verstanden werden muss.

Besonderer Fokus:
- **Postgame-Lobby / Room after match end**
- Statuswechsel des Rooms
- Übergänge zwischen Room und Match

---

## 1. Grundprinzip

Für das Produkt gilt:
- **Room** und **Match** sind UX-seitig nicht dasselbe.

### Room
Der Room ist der soziale und organisatorische Rahmen:
- Wer ist zusammen?
- Wer ist Host?
- Welche Seats sind belegt?
- Ist die Gruppe startbereit?

### Match
Das Match ist die konkrete Partie:
- Board
- Hände
- Turn State
- Sieg / Niederlage

### UX-Folge
Nutzer müssen verstehen können:
- dass ein Match endet,
- ohne dass automatisch der Room verschwindet.

---

## 2. Room-Zustände aus UX-Sicht

## 2.1 Room Created
Der Room existiert, aber es läuft noch kein Match.

Typische UX-Situation:
- Host ist da
- Invite wird geteilt
- weitere Spieler treten bei

## 2.2 Pre-match Lobby
Mehrere Spieler sind im Room, aber noch kein Match läuft.

UX-Ziele:
- Koordination
- Readiness
- Startvorbereitung

## 2.3 Match Starting
Der Room ist noch derselbe, aber das System initialisiert gerade eine Partie.

UX-Ziel:
- kein Verwechslungszustand zwischen „noch Lobby“ und „schon Spiel“

## 2.4 Match In Progress
Im Room läuft genau eine aktive Partie.

UX-Ziel:
- Spielkontext dominiert
- Room bleibt implizit vorhanden, aber nicht im Vordergrund

## 2.5 Postgame Lobby
Das Match ist beendet, der Room existiert weiter.

Dies ist der wichtigste ergänzte Zustand.

UX-Ziele:
- klar vermitteln: Partie vorbei
- klar vermitteln: Gruppe besteht weiter
- neuer Start ist möglich, aber noch nicht erfolgt
- kein Gefühl von Reset ins ursprüngliche Pre-match ohne Kontext

## 2.6 Room Closed
Der Room existiert nicht mehr oder ist für den Nutzer nicht mehr relevant / zugänglich.

---

## 3. Postgame-Lobby als eigener UX-Zustand

## 3.1 Warum dieser Zustand wichtig ist
Ohne explizite Postgame-Lobby besteht Verwechslungsgefahr zwischen:
- alter Vorstart-Lobby
- abgeschlossenem Match
- neuer, noch nicht gestarteter Partie

Die Postgame-Lobby löst genau dieses Problem.

## 3.2 Primäre Nutzerfragen in der Postgame-Lobby
- Das Spiel ist vorbei – sind wir noch zusammen im selben Raum?
- Können wir gleich nochmal spielen?
- Wer ist noch da?
- Muss ich wieder ready klicken?
- Bin ich noch auf demselben Seat?

## 3.3 UX-Ziele der Postgame-Lobby
- Abschluss der alten Partie respektieren
- sozialen Zusammenhang der Gruppe erhalten
- neue Partie klar als **neue** Partie vorbereiten
- keine Vermischung mit gerade beendeter Partie

## 3.4 Semantische Regeln
Die Postgame-Lobby ist:
- **nicht** mehr der aktive Game Screen,
- **nicht** bloß die alte Lobby ohne Kontext,
- sondern ein koordinierter Zustand nach einer beendeten Partie.

## 3.5 Erwartetes Nutzergefühl
- „Die Runde ist vorbei, aber wir sind noch gemeinsam im Raum.“

---

## 4. Übergänge zwischen Room und Match

## 4.1 Standardfluss
- Room Created
- Pre-match Lobby
- Match Starting
- Match In Progress
- Postgame Lobby
- optional wieder Pre-match-artige Startbereitschaft im selben Room
- neues Match Starting

## 4.2 Wichtige UX-Regel
Ein neues Match im selben Room muss sich anfühlen wie:
- **gleiche Gruppe**
- **neue Partie**

Nicht wie:
- Fortsetzung des alten Matches
- oder vollständiger Neustart des Produkts

---

## 5. Ready-Reset nach Match-Ende

## 5.1 Entscheidung
Nach Match-Ende kehrt der Room in einen Zustand zurück, in dem eine neue Partie vorbereitet werden kann.

### UX-Regel
- frühere Ready-Zustände gelten nicht automatisch weiter
- für ein neues Match braucht es einen bewussten neuen Readiness-Zustand

## 5.2 Warum
- verhindert versehentliche Direktstarts
- trennt alte Partie sauber von neuer Partie
- erhöht soziale Klarheit

---

## 6. Seat-Kontinuität nach Match-Ende

## 6.1 Entscheidung
Nach Match-Ende bleiben Seat-Zuordnung und Gruppenzusammenhang im Room erhalten, solange der Room bestehen bleibt.

## 6.2 UX-Vorteil
- soziale Kontinuität
- weniger Reibung für die nächste Partie
- kein unnötiger Rejoin

## 6.3 Nicht-Ziel
Kein automatischer Seat-Reset nach jeder Partie.

---

## 7. Host-Rolle nach Match-Ende

## 7.1 Grundsatz
Der Host bleibt Host des Rooms, nicht nur Host des einzelnen Matches.

## 7.2 UX-Folge
Nach Spielende muss klar sein:
- der Room besteht weiter
- Host-Rechte bestehen weiter
- der Host kann den nächsten Match-Start koordinieren

---

## 8. Reconnect in Room-Zustände

## 8.1 Reconnect in Pre-match Lobby
Der Nutzer kehrt in eine noch nicht gestartete Gruppensituation zurück.

## 8.2 Reconnect während Match In Progress
Der Nutzer kehrt in die laufende Partie zurück.

## 8.3 Reconnect in Postgame Lobby
Der Nutzer kehrt nicht in eine aktive Partie zurück, sondern in den koordinierten Nachzustand.

UX-Ziel:
- kein irreführender Eindruck, das alte Match liefe noch

---

## 9. Wann ein Room endet

Ein Room sollte UX-seitig enden, wenn:
- alle Nutzer ihn verlassen haben und keine sinnvolle Wiederaufnahme mehr besteht,
- der Host den Room bewusst schließt,
- oder ein technischer / administrativer Ablauf den Room beendet.

Wichtig:
Der Nutzer braucht dabei immer eine klare Erklärung, ob
- nur das Match beendet wurde,
- oder der Room selbst nicht mehr existiert.

---

## 10. Bezug zu anderen UX-Dokumenten

Dieses Dokument ergänzt:
- `lobby-screen.md` für Pre-match-Zustände
- `endgame-and-rematch.md` für Endgame und Postgame
- `entry-flows.md` für Resume-/Return-Situationen
- `game-screen.md` für den Übergang aus laufender Partie in den finalen Zustand

---

## 11. Konsequenzen für Block 03
Block 03 muss Room und Match getrennt modellieren.

Mindestens nötig sind semantisch unterschiedliche Zustände für:
- room_open_prematch
- room_match_starting
- room_match_in_progress
- room_postgame
- room_closed

---

## 12. Kurzform für das Dev-Team
Das wichtigste Ergebnis dieses Dokuments ist:
- **Der Room lebt über das einzelne Match hinaus.**
- Nach Spielende geht die Gruppe in eine **Postgame-Lobby** zurück.
- Von dort aus kann eine **neue Partie im selben Room** vorbereitet werden.