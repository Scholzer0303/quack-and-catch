# HANDOVER — Quack & Catch

> **Start hier in einer neuen Session.** Diese Datei macht den Wiedereinstieg nahtlos. Danach `docs/STATUS.md` + `docs/BACKLOG.md` lesen.

## TL;DR
3D-Entenangel-Lernspiel (Three.js + Vite + TS strict). **M0 + M1 + M2 + M3 fertig & gepusht** — Core-Loop steht (Fang → Tokens + Tipp-Modal → Rundentimer → Summary). Nächster Meilenstein: **M4 — Save + Deploy-Check**. Repo: https://github.com/Scholzer0303/quack-and-catch (öffentlich).

## Session-Start-Routine (Pflicht)
```bash
git log --oneline -15   # zuletzt: 7fe6ba4 = M3-Verifikations-Fixes (M3 abgeschlossen)
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
src/config/derived.ts   ← (weiterhin NICHT angelegt; bisher kein Bedarf — Werte inline aus balance)
src/core/               ← Game (Orchestrator, +Dev-Hook __qc), GameLoop, Renderer/Scene, CameraRig,
                           GameStateMachine (M3: Phasen + Rundentimer + Score)
src/systems/            ← DuckSpawner (+Reel-API, +Rarität-Roll+instanceColor), InputSystem, HookRaycaster,
                           FishingRod, Economy (M3), RewardSystem (M3). M4+: SaveSystem, AudioManager
src/world/              ← StallBuilder, BasinBuilder(+shaders/water), RodBuilder(+HOOK_ANCHOR_LOCAL),
                           DuckFactory (M3: Body/Kopf/Schwanz weiß → instanceColor)
src/ui/                 ← Reticle, UIRoot (Owner), HUD, StartScreen, CardReveal (Modal), SummaryScreen,
                           styles.css. (Shop/Codex ab M5/M6)
src/data/               ← ducks.ts (RARITY_DEFS/LOOT_TABLES/rollRarity), tips.ts (12 Karten). rods.ts ab M6
src/events/EventBus.ts  ← typisiertes Pub/Sub
src/types/              ← domain.ts, events.ts (state.ts ab M4)
src/utils/              ← math (oval/lerp/clamp/damp), rng (mulberry32/weightedPick/randInt)
scripts/                ← smoke_test.py (Render, 0 Fehler) + catch_test.py (Fang→Reward→Pause, braucht __qc)
```
Datenfluss: `main.ts` → `Game` baut Welt + Loop. `Game.update(dt,elapsed)` Reihenfolge:
`cameraRig.update` → `state.update` (Timer) → [nur wenn ≠ `paused`: `basin.update` → `ducks.update`] →
`fishingRod.update` → `reticle.render` → render. Eingabe event-getrieben (InputSystem); `onPress` ist auf
`phase==='playing'` gegated. Systeme/UI entkoppelt über `EventBus`.
**Phasen-Modell:** Boot in `start` (StartScreen, Becken lebt). Start-Button → `playing`. Fang → `reward:granted`
→ Game schaltet `paused` (Tipp-Modal, Becken+Timer eingefroren), „Weiter" → zurück `playing` (kein Reset).
Timer 0 → `round:ended` → `summary`. `setPhase('playing')` resettet Timer/Score nur, wenn `from ≠ paused`.
**Dev-Hook:** `window.__qc = { bus, ducks, rod, state, economy }` (nur DEV) — für Konsole/Tests.

## Nächster Meilenstein: M4 — Save + Deploy-Check (Aufgaben)
Reihenfolge (jede ≈ 1 Commit/Push). Economy + GameStateMachine sind aktuell **In-Memory** → M4 persistiert.
1. `src/types/state.ts` final + `src/systems/SaveSystem` (versioniert via `save.schemaVersion`, debounced, korruptionssicher — try/catch um JSON.parse, Fallback auf Default).
2. Persistenz: Tokens + freigeschaltete Tipps (Economy-Unlock-Set), später Rod/Stats/Settings. Laden beim Boot, Speichern bei `economy:changed`/`reward:granted` (debounced). Mute persistent (sobald Audio in M8 da).
3. README ausbauen (Pitch, Features, Controls, Design Notes).
4. Prod-Härtung: dispose-Audit (Memory-Leaks), Error-Boundary, `build`+`preview` aus `dist/` prüfen.
Verifikation M4: Tokens/Tipps überleben Reload; korrupter Storage → sauberer Default (kein Crash); Gate grün.

## Gotchas / gelernt (Details in LESSONS_LEARNED.md)
- TS strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` sind AN → Array-Zugriffe absichern (`?? fallback!`), `EventBus`-Map ist `type` (nicht `interface`, sonst Constraint-Fehler).
- Enten: `DuckSpawner` nutzt `frustumCulled=false` (sonst stale Bounding-Sphere); Bahn-Radius = Beckenradius × `trackInset`.
- Windows: `.gitattributes` erzwingt LF (Vercel/Linux). Git-`commit`/`push`-Aufrufe nutzen `-c user.name/email` (gesetzt: Scholzer0303 / lukas.scholz.99@googlemail.com).
- WebGL-Robustheit ist drin (try/catch in main, context-lost + visibility in Game).
- **M2-Zielen:** Reticle ist zentriert → Fang-Ray = Kamera-Center-Strahl; der Pointer schwenkt die Kamera, nicht den Ray separat. Enten sitzen tief → zum Zielen muss man nach unten schwenken (Near-Apex der Bahn ≈ `worldZ -0.51`).
- **M2-Reichweite:** `HookRaycaster` misst `reach` ab dem **Haken-Anker** (nicht ab Kamera) — sonst ist keine Ente erreichbar. Aim-Toleranz senkrecht zum Strahl = `catchRadius`.
- **M2-Halten-Modell:** Window-Timeout = **Fehlversuch** (Halten allein fängt nicht). Reel nutzt eigenen `reelDummy` (Scale ≠ 1), `reeling`-Set überspringt gehakte Slots in `writeMatrices`. Softlock-Schutz: `setPointerCapture` + `pointercancel`/`blur`→`cancel`.
- **M3-instanceColor:** `MeshStandardMaterial` multipliziert `vertexColor × instanceColor` → Körper/Kopf/Schwanz sind **weiß** gebacken, damit die Raritätsfarbe durchschlägt; Schnabel/Augen leicht getönt (ok). **Per-Instanz-Emissive/Glint geht nicht** auf geteilter Material-Instanz → DESIGN-Felder gepflegt, Render erst M8 (Shader).
- **M3-Perfect-Flag:** `hook:result` feuert vor `duck:landed` → RewardSystem cacht `perfect`, verbraucht es beim Landen, löscht es bei Miss/Snap + nach Nutzung (kein Leak).
- **M3-Reset-Vertrag:** `setPhase('playing')` resettet Timer/Score nur, wenn `from ≠ paused`. Beide Stellen, die das spiegeln müssen: `GameStateMachine.reset` UND `SummaryScreen` (Tipp-Sammlung leeren). Wer das vergisst → Runde resettet beim „Weiter".
- **M3-HUD-Score:** Score nur via `round:tick` (throttled) ins HUD — Fang pausiert aber sofort → `GameStateMachine` emittiert bei Score-Änderung einen Sofort-Tick (sonst Score-Lag im Modal).
- **Tier-0-Rod-Stats** kommen weiter aus `BALANCE.hook` bis M6 (`data/rods.ts`). DuckSpawner würfelt Rarität pro Spawn/Respawn aus `LOOT_TABLES[tier]`.

## Roadmap-Rest
M3 Belohnung+HUD+Screens ✅ → M4 Save+Deploy-Check → **M4.5 Vercel-Live-Deploy** → M5 Codex → M6 Shop → M7 Progression → M8 Juice+Audio → M9 Stretch. Tipp-Codex: ~50–60 eigene, faktisch geprüfte deutsche Karten (12 in M3), Wissensbasis = Top Claude/Claude-Code-Wissen.
