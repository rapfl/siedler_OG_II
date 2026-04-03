# siedler_OG_II

Online-Multiplayer im Stil von Siedler von Catan, angelehnt an colonist.io.

## Ziel des Repos
Dieses Repo enthält die Produkt-, UX- und Technik-Spezifikationen für den MVP sowie später die eigentliche Implementierung der Webapp.

## Produktvision
Eine browserbasierte Multiplayer-Webapp für private Runden mit Friends:
- privater Raum erstellen
- Link teilen
- gemeinsam direkt im Browser spielen
- Desktop-first
- MVP zuerst, saubere Architektur von Anfang an

## MVP-Rahmen
- spielbar über Webapp
- Deployment auf Vercel
- Datenbank auf Neon
- separater Realtime-Game-Server für serverautoritatives Multiplayer-Gameplay
- Fokus auf private Matches statt öffentlichem Matchmaking
- Fokus auf klassisches Base-Game statt Erweiterungen

## Dokumentstruktur
- `docs/00-product/produkt-spezifikation.md` – Produktziel, MVP-Scope, Flows, Screen-Liste
- `docs/01-architecture/architecture-overview.md` – Zielarchitektur, Neon/Vercel/Realtime-Schnitt, Backend-Prinzipien

## Architektur-Leitplanken
- Frontend: Next.js + TypeScript
- Hosting: Vercel
- Datenbank: Neon Postgres
- Realtime: separater Game-Server mit WebSocket-Layer
- Game Engine: deterministisch, serverautoritativ, testbar
- Client ist niemals Source of Truth für Spielzustand

## Nächste Ausbaustufen
1. vollständige UX-/Screen-Spezifikation
2. technische Spezifikation aller Flows und States
3. API- und Event-Contracts
4. Board-Modell und Regeln-Engine
5. Umsetzungsplan fürs Dev-Team
