# 🦆 Quack & Catch

> Ein als Jahrmarkt-Fahrgeschäft getarntes Lernspiel: klassisches Entenangeln in echtem 3D-First-Person — jede gefangene Ente schenkt dir einen echten, gestuften Tipp zu **Claude** & **Claude Code**.

**▶️ Live spielen: https://quack-and-catch.vercel.app**

**Status:** 🚧 In Entwicklung (Wettbewerbsbeitrag Coding-Challenge). Spielbarer Kern steht: 3D-Szene, Timing-Fang, Belohnungen, HUD/Screens, **persistenter Fortschritt** und **Tipp-Codex** (100 Karten). Live auf Vercel deployt.

## Konzept in einem Satz
Du stehst in Ego-Perspektive an einem Stand, hakst vorbeitreibende Gummienten im richtigen Moment, und je seltener die Ente, desto wertvoller der Claude-Tipp + Tokens — mit denen du im Shop bessere Angeln kaufst, um an die legendären Enten zu kommen.

## Pitch
„Quack & Catch" verkleidet eine Lernapp als Kirmes-Attraktion. Vor dir liegt ein ovaler Wasserkanal mit treibenden Gummienten; du zielst per Maus oder Finger, hältst zum Auswerfen und lässt im richtigen Augenblick los. Triffst du das **Perfect-Window**, gibt es Bonus-Tokens und Extra-Juice.

Jeder Fang zahlt zweifach aus: **Tokens** (die Spielwährung) und eine **Tipp-Karte** zu Claude bzw. Claude Code. Die Rarität der Ente bestimmt beides — eine goldene Legendary-Ente bringt mehr Tokens und einen Experten-Tipp, eine gewöhnliche gelbe Ente die Basics. So wächst nebenbei ein echtes, gestuftes Wissens-Codex.

Der Spannungsbogen: erste Fänge → erste seltene Ente → Shop → bessere Angel → vollere, schnellere Becken und bessere Drops → Jagd auf die Legendaries. Der Fortschritt (Tokens + freigeschaltete Tipps) wird lokal gespeichert und übersteht einen Reload.

## Features
- **Echtes 3D-First-Person** — Three.js-Szene, Kamera-Aim im Cone, Angel als Hand-Feel im Vordergrund.
- **Skill-basierte Hak-Mechanik** — Halten zum Auswerfen, Loslassen im Timing-Window; zentrales **Perfect**-Sub-Window für +25 % Tokens.
- **Raritäten & Loot-Tables** — sechs Stufen (gewöhnlich bis heilige Ente), per-Instanz eingefärbt, loot-table-getrieben.
- **Tipp-Codex** — faktisch korrekte, deutsche Lern-Tipps zu Claude & Claude Code, gestuft nach Schwierigkeit.
- **Token-Economy** — Belohnung je Rarität (+Erstfreischalt-Bonus), HUD-Anzeige in Echtzeit.
- **Persistenter Fortschritt** — Tokens + freigeschaltete Tipps in `localStorage`: **versioniert** (`schemaVersion`), **debounced** und **korruptionssicher** (defekte Daten fallen sauber auf Default zurück, kein Crash).
- **100 % prozedurale Assets** — alle Meshes/Shader aus Primitives, keine externen/lizenzpflichtigen Inhalte.
- **Robust auf Desktop & Mobile** — Pointer Events (Maus/Touch/Pen), kein Pointer-Lock (kein Softlock), pixelRatio-Cap, WebGL-Kontextverlust-Handling, Error-Boundary mit verständlicher Fallback-Meldung.

## Steuerung
- **Zielen:** Maus bewegen bzw. über den Touchscreen wischen — der Blick (und die Angel) schwenkt im Aim-Cone mit.
- **Fangen:** **Halten** (Maustaste/Finger) wirft aus, **Loslassen** im richtigen Moment hakt die Ente. Loslassen im zentralen Perfect-Window → Perfect-Fang.
- **Touch & Maus** sind über Pointer Events vereinheitlicht; keine Tastatur nötig, kein erzwungener Pointer-Lock.

## Tech-Stack
Three.js · Vite · TypeScript (strict) · 100 % prozedurale Assets · keine externen/lizenzpflichtigen Inhalte.

## Schnellstart
```bash
npm install
npm run dev      # lokaler Dev-Server
npm run build    # Produktions-Build nach dist/
npm run preview  # gebauten Build lokal testen
```

## Design Notes
- **Entkoppelt über typisierten EventBus** — Systeme und UI kommunizieren ausschließlich über Events (`src/events/EventBus.ts`); keine direkten Abhängigkeiten zwischen Spiel-Logik und DOM.
- **Keine Magic Numbers** — alle Tunables zentral in `src/config/balance.ts`; die Logik liest nur daraus.
- **Strict TypeScript** — inkl. `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`; defensives Parsen beim Laden des Spielstands.
- **Deterministisches RNG** — seeded (`mulberry32`) für reproduzierbare Startverteilung und Belohnungen.
- **dispose-Disziplin** — jedes System räumt Listener/Timer/GPU-Ressourcen sauber ab (keine Memory-Leaks).
- **Persistenz** — versioniert, debounced und korruptionssicher; Flush bei `pagehide`/Tab-Wechsel, damit der letzte Fang nicht verloren geht.

Mehr Details im Game-Design-Doc: [`docs/DESIGN.md`](docs/DESIGN.md).

## Live-Demo
**▶️ https://quack-and-catch.vercel.app** — direkt im Browser spielbar, Desktop & Mobile.

## Projektstruktur & Fortschritt
Planung und Stand werden laufend gepflegt:
- [`docs/STATUS.md`](docs/STATUS.md) — aktueller Stand
- [`docs/BACKLOG.md`](docs/BACKLOG.md) — Meilenstein-Checkliste
- [`docs/DESIGN.md`](docs/DESIGN.md) — Game-Design-Doc
- [`docs/LESSONS_LEARNED.md`](docs/LESSONS_LEARNED.md) — Entscheidungen & Erkenntnisse

## Lizenz
[MIT](LICENSE) © 2026 Lukas Scholz
