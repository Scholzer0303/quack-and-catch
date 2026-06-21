# HANDOVER — Quack & Catch

> **Start hier in einer neuen Session.** Diese Datei macht den Wiedereinstieg nahtlos. Danach `docs/STATUS.md` + `docs/BACKLOG.md` lesen.

## TL;DR
3D-Entenangel-Lernspiel (Three.js + Vite + TS strict). **M0 + M1 + M2 fertig & gepusht.** Nächster Meilenstein: **M3 — Belohnung + HUD + Screens**. Repo: https://github.com/Scholzer0303/quack-and-catch (öffentlich).

## Session-Start-Routine (Pflicht)
```bash
git log --oneline -15   # zuletzt: 5419d0d = M2-Doku (M2 abgeschlossen)
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
src/config/balance.ts   ← ALLE Tunables (render, camera[aimYaw/Pitch/Smooth], basin, duck, round,
                           hook[+catchRadius/baseLineStrength/reelEndScale], rewards, audio, save, ui)
src/config/derived.ts   ← (immer noch NICHT angelegt; FishingRod rechnet ms→s inline via Gettern)
src/core/               ← Game (Orchestrator, +Dev-Hook window.__qc), GameLoop, Renderer/Scene,
                           CameraRig (+Aim-Schwenk im Cone: setAimTarget/update)
src/systems/            ← DuckSpawner (M1, +Reel-API), InputSystem, HookRaycaster, FishingRod (M2).
                           M3+: RewardSystem, Economy, SaveSystem, AudioManager
src/world/              ← StallBuilder, BasinBuilder(+shaders/water), RodBuilder(+HOOK_ANCHOR_LOCAL),
                           DuckFactory (M3: braucht Per-Instanz-Farben für Raritäten)
src/ui/                 ← Reticle (M2, erstes ui/-File). Ab M3: UIRoot+styles.css, HUD, Screens, Shop, Codex
src/data/               ← (noch leer) ducks.ts, tips.ts, rods.ts ab M3
src/events/EventBus.ts  ← typisiertes Pub/Sub
src/types/              ← domain.ts, events.ts (state.ts ab M4)
src/utils/              ← math (oval/lerp/clamp/damp), rng (mulberry32/weightedPick)
scripts/                ← smoke_test.py (Render, 0 Fehler) + catch_test.py (Fang-Loop, braucht __qc)
```
Datenfluss: `main.ts` → `Game` baut Welt + Loop. `Game.update(dt,elapsed)` Reihenfolge:
`cameraRig.update` → `basin.update` → `ducks.update` (schreibt frische `worldX/Y/Z`) →
`fishingRod.update` (Raycast/State/Reel) → `reticle.render` → render. Eingabe ist event-getrieben
(InputSystem-Listener, kein Update-Slot). Systeme/UI sprechen über `EventBus`.
**Dev-Hook:** `window.__qc = { bus, ducks, rod }` (nur `import.meta.env.DEV`, in Prod getreeshakt) — für Konsole/Tests.

## Nächster Meilenstein: M3 — Belohnung + HUD + Screens (Aufgaben)
Reihenfolge (jede ≈ 1 Commit/Push). M2 emittiert schon `duck:landed {rarity,value}` + `hook:result {hit,perfect,duck}` — M3 hängt sich an den `EventBus`.
1. `src/data/ducks.ts` — Raritäten (RarityDef: Farbe/emissive/weight/baseValue, DESIGN-Tabelle) + Loot-Roll Tier 0 (`weightedPick`). **Ersetzt** die provisorische `RARITY_INFO`-Map in `FishingRod.ts`. `DuckFactory`/`DuckSpawner` brauchen **Per-Instanz-Farben** (`InstancedMesh.instanceColor`) statt Einzel-Material.
2. `src/data/tips.ts` — erste ~12 deutsche, faktisch geprüfte Karten (Schema in DESIGN.md).
3. `src/systems/RewardSystem` (Rarität→Tokens-Range + Tipp) + `src/systems/Economy` (Token-Saldo, `economy:changed`).
4. `src/ui/UIRoot` + `styles.css` + `src/ui/HUD` (Score/Tokens/Timer/Rod). **Reticle ist das erste ui/-File** — von UIRoot aufnehmen/koexistieren lassen.
5. `src/core/GameStateMachine` (`phase:changed` schon definiert) + `src/ui/StartScreen` + Rundentimer (`round.durationSec` 75, Low-Time 10).
6. `src/ui/CardReveal` (Karten-Reveal) + `src/ui/SummaryScreen` (`round:ended`).
Verifikation M3: Fang → Karte/Tokens sichtbar, Timer läuft, Runde endet → Summary; Gate grün, 0 Konsolenfehler, Mobile.

## Gotchas / gelernt (Details in LESSONS_LEARNED.md)
- TS strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` sind AN → Array-Zugriffe absichern (`?? fallback!`), `EventBus`-Map ist `type` (nicht `interface`, sonst Constraint-Fehler).
- Enten: `DuckSpawner` nutzt `frustumCulled=false` (sonst stale Bounding-Sphere); Bahn-Radius = Beckenradius × `trackInset`.
- Windows: `.gitattributes` erzwingt LF (Vercel/Linux). Git-`commit`/`push`-Aufrufe nutzen `-c user.name/email` (gesetzt: Scholzer0303 / lukas.scholz.99@googlemail.com).
- WebGL-Robustheit ist drin (try/catch in main, context-lost + visibility in Game).
- **M2-Zielen:** Reticle ist zentriert → Fang-Ray = Kamera-Center-Strahl; der Pointer schwenkt die Kamera, nicht den Ray separat. Enten sitzen tief → zum Zielen muss man nach unten schwenken (Near-Apex der Bahn ≈ `worldZ -0.51`).
- **M2-Reichweite:** `HookRaycaster` misst `reach` ab dem **Haken-Anker** (nicht ab Kamera) — sonst ist keine Ente erreichbar. Aim-Toleranz senkrecht zum Strahl = `catchRadius`.
- **M2-Halten-Modell:** Window-Timeout = **Fehlversuch** (Halten allein fängt nicht). Reel nutzt eigenen `reelDummy` (Scale ≠ 1), `reeling`-Set überspringt gehakte Slots in `writeMatrices`. Softlock-Schutz: `setPointerCapture` + `pointercancel`/`blur`→`cancel`.
- **M2 provisorisch (M3 ablösen):** `RARITY_INFO` (Gewicht/Wert) in `FishingRod.ts` → nach `data/ducks.ts`. Tier-0-Rod-Stats kommen aus `BALANCE.hook` bis M6 (`data/rods.ts`).

## Roadmap-Rest
M2 Hak-Mechanik → M3 Belohnung+HUD+Screens → M4 Save+Deploy-Check → **M4.5 Vercel-Live-Deploy** → M5 Codex → M6 Shop → M7 Progression → M8 Juice+Audio → M9 Stretch. Tipp-Codex: ~50–60 eigene, faktisch geprüfte deutsche Karten (Tier+Kategorie), Wissensbasis = Top Claude/Claude-Code-Wissen.
