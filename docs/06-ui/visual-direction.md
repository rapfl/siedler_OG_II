# Visual Direction

## Zweck
Dieses Dokument definiert die visuelle Richtung für die frühe UI- und Asset-Gestaltung von `siedler_OG_II`.

Es ist kein Screen-Layout-Dokument und keine Komponentenbibliothek. Es beschreibt den visuellen Charakter, die Materialanmutung, die Formensprache und die gestalterischen Prioritäten.

---

## 1. Nordstern

Die visuelle Leitidee ist:

**Digitale Umsetzung einer limitierten 3D-Edition in einer Holzkiste.**

Das Produkt soll sich nicht wie generisches Mobile-Game-UI oder wie bunte Casual-Tabletop-Grafik anfühlen. Es soll wirken wie:
- ein kleines, hochwertiges, physisches Strategiespiel,
- sorgfältig gefertigt,
- materialbewusst,
- leicht sammlerisch,
- aber immer noch präzise, nüchtern und spielklar.

Die Referenz ist kein historisierendes Fantasy-Set und kein rustikales Brettspiel-Klischee. Die Holzkiste steht hier für:
- Begrenztheit,
- Wertigkeit,
- Ordnung,
- taktile Glaubwürdigkeit,
- kleine Serienproduktion statt Massenmarkt-Plastik.

---

## 2. Zentrale Spannungen, die die Richtung lösen muss

Die Richtung muss zwei Dinge gleichzeitig leisten:

### 2.1 Taktile Wertigkeit
Das UI soll sich anfühlen, als gäbe es eine echte Box, echte Teile, echte Oberflächen, echte Stücke.

### 2.2 Digitale Klarheit
Trotzdem darf das Produkt nie in Materialromantik kippen. Lesbarkeit, Geschwindigkeit und Regelverständnis haben Vorrang.

Darum gilt:
- Die UI darf materialhaft wirken, aber nicht materiell überladen sein.
- Die Assets dürfen 3D-Anmutung haben, aber nicht wie schwere Render-Illustrationen wirken.
- Die Stimmung darf warm sein, aber die Informationsarchitektur bleibt kühl und präzise.

---

## 3. Produktcharakter

Die gewünschte Wirkung ist:
- präzise
- hochwertig
- ruhig
- strategisch
- sammelwürdig
- kompakt
- physisch glaubwürdig
- unaufgeregt

Nicht gewünscht sind:
- hyper-bunte Brettspieloptik
- cartoonige Figuren
- niedliche Symbolik
- Fantasy-Überhöhung
- mobile-casual UI
- glossy Spiele-App-Look
- pseudo-realistischer Medieval-Kitsch

---

## 4. Formensprache

### 4.1 Grundprinzip
Formen sollen sich an physischen, gefrästen oder gestanzten Spielobjekten orientieren.

Das heißt:
- klare Konturen
- robuste Silhouetten
- kontrollierte Fasen / Kantenlogik
- kein filigranes Ornament
- eher objektbasiert als illustriert

### 4.2 Asset-Formen
Ressourcen, Pieces, Badges und State-Icons sollen wirken, als könnten sie als echte Teile in einer Holzkiste liegen.

Das bedeutet konkret:
- lieber ein präziser, sauber geschnittener Marker als eine erzählerische Mini-Illustration
- lieber klarer Körper mit subtiler Tiefenwirkung als komplexer Detailreichtum
- lieber ikonische Masse als dekorative Linienfülle

### 4.3 Tile-Sprache
Die Hex-Tiles dürfen leicht szenisch sein, aber nur kontrolliert.

Sie sollen nicht wie Landschaftsgemälde wirken, sondern eher wie:
- hochwertig bedruckte Plättchen,
- leicht reliefartig,
- mit lesbarer Material- und Geländecharakteristik.

---

## 5. Materialanmutung

### 5.1 Primäre Materialwelt
Die UI soll visuell von diesen Materialien lernen:
- geöltes oder fein geschliffenes Holz
- gefrästes oder gelasertes Spielmaterial
- matte Pigmente
- gravierte oder geprägte Markierungen
- dunkler Stoff / Filz / Einlage als Kontrastfläche
- gedruckte Chips mit leichter Tiefe

### 5.2 Sekundäre Materialwelt
Ergänzend denkbar:
- gebürstetes Metall nur sehr sparsam bei Badges oder Statusmarkern
- dunkle Tinte / Lasur / Brandmarken-Anmutung für Labels und Linien

### 5.3 Was vermieden werden soll
- lackiertes Plastikgefühl
- neonhafte Oberflächen
- hochglänzende Materialien
- zufällige PBR-Spielereien
- schwere Holzmaserung überall
- realistischer Schmutz / Staub / Patina als Selbstzweck

Die Holzkiste ist Referenz für Wertigkeit und Materialdisziplin, nicht für dekorative Nostalgie.

---

## 6. Räumlichkeit und 3D-Anteil

### 6.1 Grundsatz
Die Richtung darf eine limitierte 3D-Anmutung haben, aber keine voll ausgespielte 3D-Bühne.

Das bedeutet:
- leichte Volumina
- subtile Höhenunterschiede
- glaubwürdige Kanten und Auflagen
- kontrollierte Schatten
- keine dramatischen Perspektiven

### 6.2 Geeigneter 3D-Einsatz
Geeignet sind:
- leichte Reliefwirkung bei Tiles
- physische Glaubwürdigkeit bei Straßen, Siedlungen, Städten und Chips
- minimaler Schattenwurf bei über dem Board liegenden Objekten
- dezente Layer-Trennung bei UI-Containern, wenn sie wie eingelegte Teile wirken

### 6.3 Ungeeigneter 3D-Einsatz
Nicht geeignet sind:
- tiefe isometrische Bretter mit starker Kamera
- schwere Blender-Render als Standard-UI
- cinematic lighting
- dramatische Lens-Effekte
- übertriebene Materialsimulation

Das Produkt braucht nicht maximale 3D-Schauwerte, sondern glaubwürdige Materialtiefe in service der Klarheit.

---

## 7. Farbwelt

### 7.1 Grundlogik
Die Farbwelt soll warm, gedämpft und materialnah sein, aber nicht braun-monoton.

Die Palette soll sich aus drei Ebenen zusammensetzen:
- ruhige Grundmaterialien
- klar erkennbare Spielressourcen
- präzise Status- und Interaktionsfarben

### 7.2 Grundflächen
Erwartete Richtung:
- warmes Holzspektrum
- dunkle neutrale Kontrastflächen
- helle, ruhige Spieloberflächen
- begrenzter Einsatz kräftiger Akzentfarben

### 7.3 Ressourcenfarben
Ressourcen dürfen farblich klar codiert sein, aber die Farben sollen eher pigmentiert und materiell als knallig wirken.

### 7.4 Statusfarben
Statusfarben müssen funktional und eindeutig sein:
- aktive Priorität
- Warning / Blocked
- Success / Confirmed
- Disabled / Hidden

Hier darf die Informationsklarheit wichtiger sein als Materialromantik.

---

## 8. Kontrast und Lesbarkeit

Da das Spiel viele Regelzustände und versteckte Informationen sichtbar machen muss, gelten harte Regeln:
- Text und Zahlen müssen immer vor Atmosphäre gehen.
- Number Chips müssen maximal lesbar bleiben.
- Hidden vs. visible information muss auf den ersten Blick trennbar sein.
- Forced Actions müssen klar aus dem Rest herausgehoben werden.
- Event-Log-Icons müssen auch in sehr klein eindeutig sein.

Falls ein materialhafter Effekt die Klarheit reduziert, wird er entfernt.

---

## 9. Icon- und Asset-Stil

### 9.1 Ressourcen
Ressourcen sollen nicht wie Emoji, Clipart oder Mini-Illustrationen wirken.

Sie sollen wirken wie:
- gravierte oder geprägte Spielmarken,
- kleine präzise Token,
- hochwertige grafische Symbole mit leichter Objektqualität.

### 9.2 Pieces
Straße, Siedlung, Stadt und Räuber sollen als physische Spielfiguren lesbar sein, nicht nur als abstrakte Zeichen.

Sie brauchen:
- starke Silhouetten
- geringe Detailtiefe
- glaubwürdige Masse
- klare Größenhierarchie

### 9.3 State- und Log-Icons
Diese dürfen nüchterner und flacher sein als das Board-Material.

Die Regel lautet:
- Game Objects dürfen taktiler sein.
- Systemzustände dürfen digitaler und klarer sein.

So bleibt die Spielwelt hochwertig, ohne dass das UI an Präzision verliert.

---

## 10. UI-Container und Flächen

Auch wenn dieses Dokument keine konkreten Layouts beschreibt, soll die Flächensprache klar sein.

UI-Container sollen sich anfühlen wie:
- eingelegte Tafeln,
- sauber gefräste Einsätze,
- ruhige Beschriftungsflächen,
- präzise Werkstatt- oder Spieltisch-Komponenten.

Nicht wie:
- glänzende App-Cards,
- neumorphische Kissen,
- frosted-glass Panels,
- mobile Dashboard-Kacheln.

Container dürfen deshalb:
- leicht materiell,
- leicht eingelassen,
- leicht konturiert sein.

Aber sie dürfen nie mit den eigentlichen Spielfiguren konkurrieren.

---

## 11. Motion und Interaktion

### 11.1 Grundcharakter
Motion soll präzise und klein wirken, nicht verspielt.

Die Referenz ist eher:
- Teile werden abgelegt,
- Marker werden gesetzt,
- Zustände rasten ein,
- Schichten wechseln geordnet.

Nicht:
- bouncey casual animation
- überlange easing-Kurven
- feierliche Spieleffekte bei jeder Kleinigkeit

### 11.2 Geeignete Motion
Geeignet sind:
- kurze Einrast-Bewegungen
- sanfte Layer-Wechsel
- diskrete Shadow- oder Elevation-Änderungen
- klare Fokusverschiebung bei Forced Flows
- nüchterne Victory-Akzente

### 11.3 Ungeeignete Motion
Nicht geeignet sind:
- Funken, Glanz, Partikel als Standard
- übertriebene Würfelinszenierung
- laute Rewards bei Routineaktionen

---

## 12. Was die Holzkisten-Referenz konkret bedeutet

Die Holzkiste ist kein wörtliches Packaging-Motiv, das überall abgebildet werden muss.

Sie bedeutet konkret:
- Assets sollen wie echte, sortierte Spielteile wirken.
- Das Produkt soll begrenzt, hochwertig und gesammelt wirken.
- Oberflächen sollen glaubwürdig und diszipliniert sein.
- Ordnung, Präzision und Materialrespekt sind wichtiger als Spektakel.

Die UI soll also nicht aussehen, als hätte man eine Kiste fotografiert. Sie soll aussehen, als sei das digitale Produkt aus derselben Designhaltung entstanden.

---

## 13. Do / Don't

### Do
- klare Silhouetten
- subtile Materialtiefe
- matte Oberflächen
- gefräst / geprägt / geschnitten gedachte Formlogik
- warme, kontrollierte Grundpalette
- klare funktionale Statuscodierung
- ruhige, strategische Gesamtwirkung

### Don't
- cartoonige Assets
- mobile-casual UI-Farben
- glänzendes Plastik
- überladene Holztexturen
- fantasyhafte Ornamentik
- schwere Render-Ästhetik
- sterile SaaS-Oberflächen ohne Spielcharakter

---

## 14. Priorität bei Konflikten

Wenn sich Gestaltungsziele widersprechen, gilt diese Reihenfolge:
1. Regelverständnis
2. Lesbarkeit
3. Zustandsklarheit
4. visuelle Kohärenz
5. Materialanmutung
6. atmosphärische Tiefe

Die Holzkisten-Richtung ist wichtig, aber nie wichtiger als Spielklarheit.

---

## 15. Anwendung auf die ersten Design-Sprints

Die Richtung soll zuerst an diesen fünf Paketen getestet werden:
1. Ressourcen-Set
2. Piece-Set inklusive Robber
3. Hex-Tile-Set inklusive Number Chips und Dice
4. Seat- / Presence- / Room-State-Set
5. Game-State- / Forced-Flow- / Log-Set

Wenn die Richtung in diesen fünf Paketen funktioniert, kann sie auf das restliche UI-System ausgerollt werden.

---

## 16. Deliverable für den ersten Visual Pass

Der erste Visual Pass soll liefern:
- 1 konsistente Stilprobe für Ressourcen
- 1 konsistente Stilprobe für Pieces
- 1 konsistente Stilprobe für Tiles + Number Chips
- 1 konsistente Stilprobe für State- und Log-Icons
- 1 kleine Material- und Oberflächenstudie
- 1 kurze Begründung, wie die Holzkisten-Referenz in digitale UI übersetzt wurde

Das Ziel des ersten Passes ist nicht Vollständigkeit, sondern die Prüfung, ob die Richtung gleichzeitig hochwertig und spielklar bleibt.
