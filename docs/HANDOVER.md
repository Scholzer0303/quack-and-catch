# HANDOVER — Quack & Catch

> **Start hier in einer neuen Session.** Diese Datei macht den Wiedereinstieg nahtlos. Danach `docs/STATUS.md` + `docs/BACKLOG.md` lesen.

## TL;DR
3D-Entenangel-Lernspiel (Three.js + Vite + TS strict). **M0–M4 fertig & gepusht**; **M4.6 (Game-Feel & Bright-Comic-Overhaul) Steps 1–5 gepusht** (direktes Fadenkreuz/Instant-Aim, heller Comic-Tag, Toon-Cel-Shading + schwarze Outlines, **Steuerungs-Redesign**: Rute schwenkt sichtbar, Halten senkt Haken / Loslassen hebt, Lock bei Release). **AKTUELL offen:** echtere Rute/Haken-Optik (nächster Schritt), richtige Jahrmarkt-Welt (graue Wand + Reifen weg), Juice, schickere Tipp-Modals. **Siehe Abschnitt „AKTUELL: M4.6" unten — höchste Priorität.** Repo: https://github.com/Scholzer0303/quack-and-catch (öffentlich).

## Session-Start-Routine (Pflicht)
```bash
git log --oneline -15   # zuletzt: M4.6 Step 5 = Steuerungs-Redesign (Rute lebt, Lock bei Release)
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
src/config/balance.ts   ← ALLE Tunables (render[hell], camera[aimInstant], aim, basin, stall, duck, toon,
                           outline, round, hook, rewards, audio, save, ui)
src/config/derived.ts   ← (weiterhin NICHT angelegt; bisher kein Bedarf — Werte inline aus balance)
src/core/               ← Game (Orchestrator, +Dev-Hook __qc[+camera/scene]), GameLoop, Renderer/Scene,
                           CameraRig (M4.6: aimInstant, kein Nachfaden), GameStateMachine (Phasen+Timer+Score)
src/systems/            ← DuckSpawner (Reel-API, instanceColor, +Toon-Gradient, +outlineMesh), InputSystem,
                           HookRaycaster (M4.6: Strahl durch pointerNdc), FishingRod (+setAim),
                           Economy (+snapshot/hydrate), RewardSystem, SaveSystem (M4). M8: AudioManager
src/world/              ← StallBuilder, BasinBuilder(+shaders/water), RodBuilder(adressierbar: buildRod→{group,hookGroup,line,tip}+stretchLine; FishingRod animiert),
                           DuckFactory (M4.6: MeshToonMaterial+Gradient), materials/OutlineMaterial (Inverted-Hull)
src/ui/                 ← Reticle (M4.6: folgt Zeiger + Farb-Feedback), UIRoot, HUD, StartScreen,
                           CardReveal (Modal), SummaryScreen, styles.css. (Shop/Codex ab M5/M6)
src/data/               ← ducks.ts (RARITY_DEFS/LOOT_TABLES/rollRarity), tips.ts (12 Karten). rods.ts ab M6
src/events/EventBus.ts  ← typisiertes Pub/Sub
src/types/              ← domain.ts, events.ts, state.ts (M4: SaveData + createDefaultSave)
src/utils/              ← math (oval/lerp/clamp/damp), rng (mulberry32/weightedPick/randInt)
scripts/                ← smoke_test.py (Render, 0 Fehler) + catch_test.py (Fang→Reward→Pause) +
                           save_test.py (Reload-Persistenz + Korruptions-Fallback) — brauchen __qc
```
Datenfluss: `main.ts` → `Game` baut Welt + Loop. `Game.update(dt,elapsed)` Reihenfolge:
`cameraRig.update` → `state.update` (Timer) → [nur wenn ≠ `paused`: `basin.update` → `ducks.update`] →
`fishingRod.update` → `reticle.render` → render. Eingabe event-getrieben (InputSystem); `onPress` ist auf
`phase==='playing'` gegated. Systeme/UI entkoppelt über `EventBus`.
**Phasen-Modell:** Boot in `start` (StartScreen, Becken lebt). Start-Button → `playing`. Fang → `reward:granted`
→ Game schaltet `paused` (Tipp-Modal, Becken+Timer eingefroren), „Weiter" → zurück `playing` (kein Reset).
Timer 0 → `round:ended` → `summary`. `setPhase('playing')` resettet Timer/Score nur, wenn `from ≠ paused`.
**Dev-Hook:** `window.__qc = { bus, ducks, rod, state, economy, save, camera, scene }` (nur DEV) — für Konsole/Tests. Tests projizieren Entenposition via `__qc.camera` auf den Screen.

## AKTUELL: M4.6 — Game-Feel & Bright-Comic-Overhaul (HÖCHSTE PRIORITÄT)
**Stand:** Steps 1–5 gepusht (siehe TL;DR). Step 5 = **Steuerungs-Redesign** ✅ (Rute lebt, Lock bei Release). Restliches Nutzer-Feedback unten treibt die nächsten Schritte.

### Nutzer-Feedback (wörtlich sinngemäß, Pflicht)
1. **Steuerung schlecht / „bewegt sich gar nicht":** Beim Gedrückt-Halten auf eine Ente animiert sichtbar nichts (nur der 2D-Ring; die 3D-Rute/Haken steht still). Fühlt sich tot an.
2. **Gewünschtes Fang-Modell (physisch/echt):** Maus bewegt die **Angel sichtbar** mit (so weit wie die Maus geht). **Halten → Haken SENKT sich** ins Wasser; **Loslassen → Haken HOCH**. Ist der Haken über einer Ente und man lässt **im grün/gold-Timing-Ring** los → gefangen (bestehenden Ring weiterverwenden).
3. **Rute + Haken echter/schöner** (aktueller Haken „sieht scheiße aus") + sichtbare Auf-/Ab-Bewegung.
4. **Welt aufwerten:** graue Hintergrundwand **weg** → richtiger Comic-**Jahrmarkt** (Buden, Wimpel/Lichter, Kulisse). Der dicke Karamell-**Rand/Reifen** ist „scheiße" → echter Becken-Rand (schlanker Holz-/Budenrand, dekoriert).
5. **Spielen muss sich COOL anfühlen** (Feel > alles).
6. **Tipp-Modals viel schicker** (evtl. Icon/Visualisierung je Tipp).
7. **Optionale Intro-Sequenz:** Ticket übergeben → Verkäuferin gibt Angel → Start. Nice-to-have.

### Nächste Reihenfolge (Vorschlag)
1. ~~**Steuerungs-Redesign**~~ ✅ — FishingRod besitzt + animiert die Rute (Kind der Kamera), schwenkt sichtbar Richtung Zeiger (`balance.hook.swingAmount`), senkt den Haken beim Halten / hebt beim Loslassen (`dipDepth`, getrieben von State + `damp`), Schnur dehnt sich (`stretchLine`). **Lock bei Release**: `press()` senkt immer, `resolveAtRelease()` evaluiert das Ziel frisch. Animation rein visuell — Reach/Reel-Ziel (`hookAnchor`) unverändert.
2. **Rute/Haken-Optik (NÄCHSTER SCHRITT):** stilkonsistent Toon+Outline in `RodBuilder.ts`, `fog=false` behalten. Haken ist aktuell nur leicht aufgeräumt (schlanker Ring/Barb).
3. **Jahrmarkt-Welt** (`StallBuilder.ts`: Buden/Wimpel/Kulisse statt grauer Wand; `BasinBuilder.ts`: Rand statt Reifen). Optional Bloom/Glow (Design unten).
4. **Juice** (Design unten): Splash, Catch-Pop, Perfect-Flash, Mini-Screenshake, HUD-Count-up.
5. **Tipp-Modal** schicker (`CardReveal.ts` + `styles.css` `.qc-card*`); optional `icon`-Feld in `data/tips.ts`.
6. **Optional:** Intro-Sequenz (neuer Screen + Phase `intro` in `GameStateMachine`).
7. Danach: Doku + `/code-review` über M4.6-Diff + Abnahme → zurück zur Roadmap (M5).

### Offenes Design/Referenz für Steps 5–7 (noch gültig)
- **Bloom (5):** `EffectComposer` (RenderPass→UnrealBloomPass→OutputPass) in neuer `src/core/postprocessing/Postprocessing.ts`; `Game.update` → `postprocessing.render()`; Dispose vor `sceneManager`. Quality-Guards in `balance.quality` (`postFx 'off'|'low'|'high'`, coarse-pointer→low, `bloomResolutionScale`); `postFx:'off'` = direkter Render-Fallback (Mobile). Threshold-Bloom statt Selective.
- **Glow seltener Enten (6):** additives Halo-`InstancedMesh` für rare+ Slots (`RARITY_DEFS.emissive`/`hasGlint` — bisher ungenutzt), füttert Bloom.
- **Juice (7):** neues `src/fx/` — `SplashFx` (Ring-Pool, hört `hook:result`/`duck:landed`), `Screenshake` (additiver CameraRig-Offset, klein+abklingend), `HudCountUp` (`lerp`/`damp`); Perfect-Flash in `Reticle.flash()`; Catch-Pop via `reelEndScale`-Overshoot. `prefers-reduced-motion` beachten. Größen in `balance.juice.*`.

## Später: M5 — Tipp-Codex-Screen (nach M4.6)
1. `data/tips.ts` auf ~50–60 Karten (alle Tiers + Kategorien aus DESIGN.md, geprüft). **Stabile IDs** (SaveSystem schneidet Tip-IDs gegen `TIPS`).
2. `ui/CodexScreen` (Grid locked/unlocked, Tier-Farbe + Kategorie-Filter, Detail, Fortschritt).
3. Codex-Phase in State-Machine + Einstieg; `firstTimeCodexBonus` aktiv.

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
- **M4-Save-Reihenfolge:** `SaveSystem.load()` läuft **nach** der UIRoot-Konstruktion (in `Game`), denn `economy.hydrate()` feuert `economy:changed` → nur ein bereits gebautes HUD zeigt den geladenen Saldo. Erst hydraten, **dann** `economy:changed` abonnieren (sonst löst der Boot-Emit einen redundanten Write/Loop aus).
- **M4-Korruptionssicher:** `load()` kapselt `getItem` (Private-Mode wirft), `JSON.parse` (korrupt) und einen feldweisen Validator. Version-Mismatch verwirft komplett (Migrations-Seam), einzelne kaputte Felder werden auf Default repariert. `setItem` ist in try/catch (Quota/Private-Mode schlucken — nie Gameplay crashen).
- **M4-Flush:** Debounce (`save.debounceMs` 400) coalesct Writes; `flush()` bei `pagehide` + `visibilitychange→hidden` sichert den letzten Fang. **Kein `beforeunload`** (Mobile unzuverlässig, blockt bfcache). `SaveSystem.dispose()` flusht → entfernt Listener/Timer/Sub (einzige neue Leak-Fläche in M4).
- **M4-Economy-Slice:** `Economy.snapshot()` liefert nur `{tokens, unlockedTips}` (kein Save-Schema-Wissen); `SaveSystem` komponiert das volle `SaveData` (+`schemaVersion`/`muted`). Entkopplung bleibt.
- **M4.6-Direkt-Aim:** `HookRaycaster.findTarget` castet jetzt durch `pointerNdc` (Zeigerposition), NICHT mehr Bildmitte — der frühere „nach unten zielen"-Trick (M2-Gotcha) ist damit OBSOLET. `aimX/aimY` aus `InputSystem` sind bereits gültiges NDC (x rechts/+1, y oben/+1). `FishingRod.press()` castet nur noch, wenn eine Ente unter dem Zeiger ist. `CameraRig.aimInstant` → kein Nachfaden.
- **M4.6-Toon+Outline:** Enten = `MeshToonMaterial({vertexColors, gradientMap})` (instanceColor trägt durch `<color_vertex>`, in three 0.184 verifiziert). Outline = 2. `InstancedMesh` mit `OutlineMaterial` (BackSide, bläht entlang **`normal`** auf — `objectNormal` existiert im MeshBasic-Shader NICHT!), teilt `geometry`+`instanceMatrix` mit dem Enten-Mesh → Bewegung/Reel gratis gespiegelt. Beide Dispose in `DuckSpawner`.
- **M4.6-Rute lebt (gelöst):** `FishingRod` besitzt die Rute (baut sie via `buildRod()`, hängt sie als Kind der Kamera ein) und animiert sie in `update(dt)` → `animateRod`. `buildRod()` liefert `{group, hookGroup, line, tip}`; `stretchLine(line, tip, hookPos)` dehnt die Schnur pro Frame. Senken/Heben + Schwenk sind gedämpft (`balance.hook.dipDepth/dipDampLambda/swingAmount/swingDampLambda`). Wichtig: **rein visuell** — `hookAnchor()` (Reel-Ziel + `reach`) bleibt der Ruhe-Anker `HOOK_ANCHOR_LOCAL`; die Fang-Logik ist unberührt. `Game` baut die Rute NICHT mehr selbst.
- **M4.6-Lock bei Release:** `press()` startet immer (kein Target-Gate), `release()` im Window → `resolveAtRelease()` evaluiert das Ziel **jetzt** (`aimTarget()`), nicht beim Press. Gefangen wird, was beim Loslassen unter dem Fadenkreuz im Window liegt.
- **M4.6-Release-Timing-Falle (Tests):** `release()` ist event-getrieben und läuft **synchron vor** dem nächsten `cameraRig.update()`. Springt der Cursor unmittelbar vor dem Release auf eine neue Position, nutzt der Fang-Strahl noch die **alte** Kamera-Orientierung (aimInstant wendet das neue Aim erst im nächsten Frame an) → Fehlgriff. Im echten Spiel irrelevant (Cursor folgt der Ente flüssig, Kamera ist konsistent). In `catch_test.py`/`save_test.py` deshalb **kein** Re-Aim/`evaluate` zwischen `down` und `up` (das würde zusätzlich das 280-ms-Window verstreichen lassen) — stattdessen ruhig halten ~320 ms; die Ente driftet < `catchRadius`. Pick ist reach-aware (nur Enten in Reichweite ab Haken-Anker).

## Roadmap-Rest
**M4.6 Game-Feel & Comic-Overhaul (IN ARBEIT, Steps 1–5 ✅, Rest = Optik/Welt/Juice)** → M4.5 Vercel-Live-Deploy → M5 Codex → M6 Shop → M7 Progression → M8 Audio (+ Rest-Juice) → M9 Stretch. Tipp-Codex: ~50–60 eigene, faktisch geprüfte deutsche Karten (12 seit M3).
