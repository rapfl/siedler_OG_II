# Entry Flows UX Specification

## Zweck
Dieses Dokument spezifiziert die UX der Einstiegsphase vor der Lobby.

Dazu gehören:
- Landing / Home
- Raum erstellen
- Raum beitreten
- ungültige oder unvollständige Einstiege
- Wiederaufnahme einer bestehenden Session vor Erreichen der Lobby

Der Fokus liegt auf **Time-to-play**, Verständlichkeit und Fehlerminimierung.

---

## 1. Rolle der Entry-Flows im Gesamtprodukt

Die Entry-Flows entscheiden darüber, ob sich das Produkt sofort zugänglich oder unnötig kompliziert anfühlt.

UX-seitig müssen sie drei Dinge leisten:
- den Einstieg maximal reibungsarm machen,
- die richtige Spielinstanz sicher finden,
- und Nutzer ohne Identitäts-/Room-Verwirrung in die Lobby überführen.

Im MVP gilt:
- keine tiefe Account-Hürde,
- kein komplexes Profil-Setup,
- kein überladener Modus-Auswahl-Screen,
- sondern schneller Übergang in einen privaten Raum.

---

## 2. Primäre Nutzerziele

### Host
- möglichst schnell einen neuen privaten Raum anlegen
- ohne Vorwissen verstehen, was der nächste Schritt ist
- sofort einen teilbaren Invite erhalten

### Mitspieler
- über Link oder Code ohne Umwege in den richtigen Raum gelangen
- kurz den eigenen Namen festlegen
- sicher sein, dass der Join erfolgreich war

### Systemziele
- Fehl-Joins minimieren
- inkonsistente Identity-/Session-Zustände vermeiden
- Friktion vor der Lobby niedrig halten
- Reconnect und Erstbeitritt klar unterscheiden

---

## 3. Entry-Flows im Überblick

1. Landing -> Create Room -> Lobby
2. Landing -> Join by Code -> Join Validation -> Lobby
3. Deep Link -> Name / Session Check -> Lobby
4. Returning Session -> Reconnect / Resume Decision -> Lobby oder Game
5. Invalid Link / Invalid Code -> Recovery State

---

## 4. Landing / Home UX

## 4.1 Zweck
Die Landing ist im MVP kein Marketing-Screen im klassischen Sinn, sondern eine **Startentscheidung mit minimaler kognitiver Last**.

## 4.2 Primäre Nutzerfragen
- Möchte ich einen Raum erstellen oder beitreten?
- Kann ich direkt mit einem Code einsteigen?
- Ist das hier das richtige Produkt?

## 4.3 UX-Anforderungen
Die Landing muss:
- zwei klare Hauptpfade anbieten: erstellen oder beitreten
- keinen unnötigen Erklärungstext erzwingen
- Raum für einen direkten Join-by-Code bieten
- Returning-Users nicht wie First-Time-Users behandeln, falls eine verwertbare Session existiert

## 4.4 Gute UX auf der Landing bedeutet
- schnelle Entscheidung
- keine Modus-Verwirrung
- keine zu frühe Regel- oder Feature-Erklärung

## 4.5 Schlechte UX auf der Landing wäre
- zu viele Modi
- Ranked/Casual/Bots schon im MVP-Einstieg
- Account-Zwang vor klarer Notwendigkeit
- Unklarheit, ob man einen Invite-Link oder Code braucht

---

## 5. Create Room Flow

## 5.1 Ziel
Der Host soll mit minimalem Aufwand einen gültigen privaten Raum erzeugen.

## 5.2 Minimale benötigte Eingaben
Für den MVP sollten Eingaben minimiert werden.

Empfehlete Minimalvariante:
- Display Name
- optional Room Name
- optional gewünschte Spieleranzahl, Default 4

## 5.3 UX-Prinzip
Nur Daten abfragen, die unmittelbar für den nächsten Schritt nötig sind.

Nicht nötig im MVP:
- Passwortwahl
- Profilbild
- komplexe Spieleinstellungen
- E-Mail / Login

## 5.4 Wahrnehmungsziel
Der Host soll nach Abschluss denken:
- „Der Raum ist jetzt erstellt und ich kann sofort Leute einladen.“

Nicht:
- „Ich bin irgendwo zwischen Erstellung und Konfiguration hängen geblieben.“

## 5.5 Übergang in die Lobby
Der Übergang muss eindeutig sein:
- Raum wurde erfolgreich erstellt
- Host ist bereits Mitglied dieses Raums
- Invite ist jetzt verfügbar

---

## 6. Join Flow by Code

## 6.1 Ziel
Ein Spieler ohne Direktlink soll per Code sicher in den richtigen Raum gelangen.

## 6.2 Minimale Eingaben
- Room Code
- Display Name

## 6.3 UX-Anforderungen
Der Flow muss:
- ungültige Codes früh erkennen
- nicht mit unklaren technischen Fehlern arbeiten
- bei Erfolg direkt in die Lobby führen

## 6.4 Validierungslogik aus UX-Sicht
Der Nutzer braucht klare Rückmeldungen für:
- Code ist leer oder formal unvollständig
- Raum existiert nicht
- Raum ist voll
- Raum ist nicht mehr joinbar
- Name ist ungültig

## 6.5 Wahrnehmungsziel
Ein erfolgreicher Join soll sich anfühlen wie:
- „Ich bin jetzt wirklich im Raum angekommen.“

Nicht wie:
- „Ich habe nur eine Anfrage abgeschickt und weiß noch nicht, ob ich drin bin.“

---

## 7. Join Flow by Invite Link

## 7.1 Ziel
Der Invite-Link ist der Standardpfad für Mitspieler und sollte noch reibungsloser sein als Join by Code.

## 7.2 UX-Anforderungen
Wenn der Link den Raum bereits eindeutig identifiziert, soll der Nutzer nicht zusätzlich unnötige Schritte durchlaufen.

Minimaler Flow:
1. Link öffnen
2. ggf. Namen eingeben oder bestehende Session bestätigen
3. Join validieren
4. Lobby betreten

## 7.3 Session-aware Verhalten
Wenn eine bestehende Session plausibel zur Einladung passt, sollte der Flow prüfen:
- ist dies ein Rejoin?
- ist dies ein neuer Join?
- gibt es Konflikte mit bestehender Seat-Zuordnung?

## 7.4 UX-Ziel
Deep-Linking darf sich nicht fragiler anfühlen als manueller Join.

---

## 8. Identity UX im MVP

## 8.1 Grundsatz
Im MVP ist die Identität funktional, nicht sozial tief modelliert.

Das bedeutet:
- Nutzer brauchen einen Display Name
- dieser dient der Lesbarkeit in Lobby und Match
- darüber hinaus ist zunächst keine schwere Account-Struktur nötig

## 8.2 UX-Ziel
Der Nameingabeschritt darf nicht wie Registrierung wirken.

## 8.3 Returning User
Wenn sinnvoll, kann der zuletzt verwendete Display Name vorausgefüllt oder vorgeschlagen werden.

UX-Vorteil:
- schnellere Wiederbenutzung
- weniger repetitive Eingabe

Wichtig:
- Änderung muss leicht möglich bleiben

---

## 9. Session- und Resume-Logik vor der Lobby

## 9.1 Problemraum
Ein Nutzer kann die App öffnen, während lokal bereits eine verwertbare Session existiert.

Mögliche Situationen:
- Rückkehr in eine noch offene Lobby
- Rückkehr in eine laufende Partie
- alte Session ist nicht mehr gültig

## 9.2 UX-Ziel
Das Produkt soll Kontinuität herstellen, ohne Nutzer ungefragt in falsche Kontexte zu ziehen.

## 9.3 Empfohlene UX-Logik
Wenn eine verwertbare Session gefunden wird:
- prüfen, ob Raum/Match noch existiert
- falls ja, gezielte Wiederaufnahme anbieten oder automatisch fortsetzen, wenn die Situation eindeutig ist
- falls nein, Session sauber verwerfen und normalen Entry erlauben

## 9.4 Wahrnehmungsziel
Resume soll sich hilfreich anfühlen, nicht invasiv.

---

## 10. Fehler- und Grenzfälle in Entry-Flows

## 10.1 Invalid Room Code
UX-Reaktion:
- klar sagen, dass kein passender Raum gefunden wurde
- keine generische Netzwerkmeldung
- einfacher erneuter Versuch möglich

## 10.2 Expired / Closed Invite Link
UX-Reaktion:
- erklären, dass der Raum nicht mehr verfügbar ist
- nicht implizieren, dass der Nutzer etwas falsch gemacht hat

## 10.3 Room Full
UX-Reaktion:
- klar sagen, dass alle Plätze belegt sind
- wenn relevant, Hinweis auf Rejoin nur mit bestehender Session

## 10.4 Name Conflict
Falls Namen nicht eindeutig sein sollen oder Konflikte problematisch werden:
- Konflikt klar erklären
- direkte Änderungsmöglichkeit anbieten

## 10.5 Netzwerkfehler während Entry
UX-Reaktion:
- erklären, dass der Beitritt oder die Erstellung nicht abgeschlossen werden konnte
- Wiederholen ermöglichen
- keine unklare Doppel-Erstellung / Doppel-Join-Wirkung erzeugen

---

## 11. Übergänge aus den Entry-Flows

### Erfolgsübergänge
- Create Room -> Lobby
- Join by Code -> Lobby
- Join by Link -> Lobby
- Resume -> Lobby oder Game

### Fehlerübergänge
- Invalid Link / Code -> Error State -> Retry oder Back
- Session Conflict -> Resolve State -> Retry / Rename / Rejoin

Wichtig:
Kein erfolgreicher Flow darf in einem „halbfertigen“ Zwischenzustand enden.

---

## 12. UX-Erfolgskriterien für Entry
- Zeit von App Open bis Lobby Arrival
- Erfolgsquote Create Room beim ersten Versuch
- Erfolgsquote Join beim ersten Versuch
- Abbruchquote im Name-Step
- Abbruchquote nach invalidem Link/Code
- Anteil Nutzer, die ohne Hilfe korrekt unterscheiden zwischen Create und Join

---

## 13. Offene UX-Entscheidungen
1. Soll Join-by-Code direkt auf der Landing passieren oder als eigener Zwischenschritt?
2. Wie aggressiv soll Resume automatisch ausgelöst werden?
3. Sollen Display Names eindeutig innerhalb eines Raums sein müssen?
4. Braucht Create Room im MVP überhaupt eine wählbare Spieleranzahl oder reicht Default 4?
5. Soll die Landing minimale Spielbeschreibung enthalten oder fast rein funktional bleiben?

---

## 14. Kurzform für das Dev-Team
Die Entry-Flows sind UX-seitig dann gelungen, wenn:
- ein Host in sehr wenigen Schritten in der Lobby landet,
- ein Mitspieler per Link oder Code sicher im richtigen Raum ankommt,
- Returning Sessions nicht verwirren,
- und Fehlerzustände klar und reparierbar sind.