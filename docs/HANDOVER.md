# HANDOVER — Quack & Catch

> **Start hier in einer neuen Session.** Diese Datei macht den Wiedereinstieg nahtlos. Danach `docs/STATUS.md` + `docs/BACKLOG.md` lesen.

## TL;DR
3D-Entenangel-Lernspiel (Three.js + Vite + TS strict). **M0 + M1 fertig & gepusht.** Nächster Meilenstein: **M2 — Hak-Mechanik**. Repo: https://github.com/Scholzer0303/quack-and-catch (öffentlich).

## Session-Start-Routine (Pflicht)
```bash
git log --oneline -15   # zuletzt: f28087b = M1
git status              # sollte clean sein
npm install             # falls node_modules fehlt
```
Dann `docs/STATUS.md` + `docs/BACKLOG.md` lesen → weiterbauen.

## Heilige Regeln (aus CLAUDE.md)
1. **Push nur zu `origin`** = `Scholzer0303/quack-and-catch` (meine Kopie). Niemals woanders hin, Ziel nie ändern. Vor Push im Zweifel `git remote -v` prüfen.
2. **Nach JEDEM Arbeitsschritt committen + pushen** (kurze deutsche Message). Jury bewertet den Push-Verlauf.
3. **Nach JEDEM Meilenstein:** Pause + Doku-Update + `/code-review`, dann erst weiter. Nicht ungefragt in den nächsten Meilenstein starten.
4. **Keine Magic Numbers** — alle Tunables in `src/config/balance.ts`. **Faktisch korrekte** Tipp-Inhalte (nichts erfinden).

## Befehle
```bash
npm run dev        # Dev-Server (localhost:5173)
npm run build      # tsc --noEmit && vite build -> dist/
npm run preview    # gebauten Build prüfen
npm run typecheck  # tsc --noEmit
npm run lint       # eslint .
npm run format     # prettier --write .
```

## Verifikations-Gate (vor „fertig")
1. `npm run typecheck` + `npm run lint` grün.
2. `npm run build` + `npm run preview` fehlerfrei.
3. **Browser-Render-Check** (0 Konsolenfehler) via Playwright-Smoke-Test:
   ```bash
   python "<webapp-testing-skill>/scripts/with_server.py" \
     --server "npm run dev" --port 5173 --timeout 60 -- \
     python scripts/smoke_test.py
   ```
   Erzeugt `smoke_screenshot.png` (gitignored) — ansehen. Erwartet: `"ok": true`, leere `console_errors`/`page_errors`.
   (Voraussetzung: `pip install playwright` + `python -m playwright install chromium`. Beides ist in dieser Umgebung bereits vorhanden.)

## Architektur-Karte (wo liegt was)
```
src/config/balance.ts   ← ALLE Tunables (render, camera, basin, duck, round, hook, rewards, audio, save, ui)
src/config/derived.ts   ← (noch nicht angelegt) reine Ableitungs-Funktionen
src/core/               ← Game (Orchestrator), GameLoop, Renderer/Scene/CameraRig
src/systems/            ← DuckSpawner (M1). M2+: InputSystem, HookRaycaster, FishingRod, RewardSystem, Economy, SaveSystem, AudioManager
src/world/              ← prozedurale Meshes: StallBuilder, BasinBuilder(+shaders/water), RodBuilder, DuckFactory
src/ui/                 ← (noch leer) HUD, Screens, Shop, Codex ab M3
src/data/               ← (noch leer) tips.ts, ducks.ts, rods.ts ab M3
src/events/EventBus.ts  ← typisiertes Pub/Sub
src/types/              ← domain.ts, events.ts (state.ts ab M4)
src/utils/              ← math (oval/lerp/clamp/damp), rng (mulberry32/weightedPick)
```
Datenfluss: `main.ts` → `Game` baut Welt + Loop. `Game.update(dt,elapsed)` treibt `basin.update` + `ducks.update` + render. Systeme/UI sprechen über `EventBus`.

## Nächster Meilenstein: M2 — Hak-Mechanik (Aufgaben)
Reihenfolge (jede ≈ 1 Commit/Push). Balance-Werte liegen schon in `BALANCE.hook` (reach/window/perfect/cast/reel/cooldown).
1. `src/systems/InputSystem.ts` — Pointer Events (pointerdown/move/up, Maus+Touch+Pen), Aim normalisiert auf NDC [-1,1]; `press`/`release` über EventBus oder Callback. Kein Pointer-Lock.
2. `src/systems/HookRaycaster.ts` — `THREE.Raycaster` vom Aim-NDC durch die Kamera; Treffer gegen die **gecachten** `duck.worldX/Y/Z` (analytisches Ray-Sphere, nicht Instanz-Matrix-Raycast). Nächste lebende Ente innerhalb `reach`.
3. `src/systems/FishingRod.ts` — State-Machine `idle→aiming→cast→(hit?)→reel→land→idle`; Timing-Window + Perfect-Sub-Window aus `BALANCE.hook`; emittiert `hook:result`.
4. Reel-Animation: gehakte Ente lerpt zum Haken → zum Spieler; dann `DuckSpawner.removeAndRespawn(slot)` (Methode neu — Ente `alive=false`, neu seeden, `alive=true`).
5. Miss + `cooldownMs`; Aim-Reticle/Hover-Highlight der anvisierten Ente.
6. `lineStrength`-Gate: Ente schwerer als Linie → reißt ab (Feedback), **kein Softlock**.
Verifikation M2: Fang-Loop mit **Maus UND Touch** (DevTools-Touch), stabile Entenzahl, Gate ohne Softlock, Gate grün.

## Gotchas / gelernt (Details in LESSONS_LEARNED.md)
- TS strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` sind AN → Array-Zugriffe absichern (`?? fallback!`), `EventBus`-Map ist `type` (nicht `interface`, sonst Constraint-Fehler).
- Enten: `DuckSpawner` nutzt `frustumCulled=false` (sonst stale Bounding-Sphere); Bahn-Radius = Beckenradius × `trackInset`.
- Windows: `.gitattributes` erzwingt LF (Vercel/Linux). Git-`commit`/`push`-Aufrufe nutzen `-c user.name/email` (gesetzt: Scholzer0303 / lukas.scholz.99@googlemail.com).
- WebGL-Robustheit ist drin (try/catch in main, context-lost + visibility in Game).

## Roadmap-Rest
M2 Hak-Mechanik → M3 Belohnung+HUD+Screens → M4 Save+Deploy-Check → **M4.5 Vercel-Live-Deploy** → M5 Codex → M6 Shop → M7 Progression → M8 Juice+Audio → M9 Stretch. Tipp-Codex: ~50–60 eigene, faktisch geprüfte deutsche Karten (Tier+Kategorie), Wissensbasis = Top Claude/Claude-Code-Wissen.
