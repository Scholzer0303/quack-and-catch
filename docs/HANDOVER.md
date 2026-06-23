# HANDOVER — Quack & Catch

> **Start hier in einer neuen Session.** Diese Datei macht den Wiedereinstieg nahtlos. Danach `docs/STATUS.md` + `docs/BACKLOG.md` lesen.

## TL;DR
3D-Entenangel-Lernspiel (Three.js + Vite + TS strict). **M0–M4 fertig & gepusht**; **M4.6 (Game-Feel & Bright-Comic-Overhaul) Steps 1–9 gepusht** (Comic-Tag, Toon+Outline-Enten, **Fang-Engine-Neumodell**: feste Schräg-Sicht aufs ganze Becken, Maus → Wasserpunkt W, Halten senkt den Haken **ins Wasser**, **räumlicher Fang** (Ente nahe W; Perfect = mittig), Rute schwenkt stark, Rute/Haken Toon+Outline; **Schwierigkeit je Rarität** via `catchMulByRarity`; **Jahrmarkt-Welt** Step 8; **Juice + Bloom/Glow** Step 9: Splash · Catch-Pop · Perfect-Flash · Mini-Screenshake (skaliert) · HUD-Count-up · Bloom-Postprocessing mit Mobile-Quality-Guards · Glow seltener Enten, reduced-motion respektiert). **Step 10 = Tipp-Modal-Politur** gepusht (Emoji-Medaillon je Tipp via neuem `Tip.icon`-Pflichtfeld · Rarität-Glow/Theming über `data-rarity`+`--qc-accent` · Token-Count-up · Rarität-/Kategorie-Chips · Summary-Liste mit Emoji; reduced-motion gated). **Step 11 = Intro-Sequenz** gepusht (3-Schritt-CSS-Storyboard Bude → Ticket → Angel → los, „Weiter"/„Los geht's!" + „Überspringen"; neuer `IntroScreen.ts` ersetzt `StartScreen.ts`, **keine neue Phase** (lebt in Phase `start`), **kein Save-Eingriff**; läuft einmal pro Seitenaufruf (Boot), „Überspringen" springt zum Steuerungs-Schritt). **M4.6 inhaltlich fertig + `/code-review` (Step 10+11) gelaufen: 11 Findings, alle low/medium, kritische behoben (Skip-Onboarding, reduced-motion-Cache, color-mix-Fallback, toter Reset-Branch).** **M5 (Tipp-Codex) ✅ + M4.5 (Vercel-Live-Deploy) ✅ + M6 (Upgrade-Shop) ✅ + M7 (Progression koppeln) ✅.** **LIVE: https://quack-and-catch.vercel.app** (Git-Auto-Deploy von `main` aktiv — jeder Push deployt). **M7:** Rod-Tier propagiert in die Engine (`rod:statsChanged` trägt `tier`; `DuckSpawner.setTier` schaltet Entenzahl 8/10/12/14 + Rotation ×1.0–1.8 + Loot-Table um; max-Kapazität-Pool 14 mit geparkten Slots) — behebt den Boot-Bug (gespeicherte Rute griff nur für `luck`). Magnet + Legendary-Gating waren schon durch M6 abgedeckt. **M8 (Juice + Audio) ✅:** prozeduraler `AudioManager` (WebAudio-Chiptune, Lazy-Unlock), 🔊-`MuteButton` (alle Phasen) via neues Event `audio:muteChanged` (`save.muted` greift), `SparkleFx` (Gold-Burst epic/legendary → Bloom) + `haptics` (Mobile-Vibrate). **AKTUELL offen / NÄCHSTER SCHRITT:** **M9 — Stretch** (optional, nur bei Zeit; Roadmap-Kern M0–M8 fertig). **Siehe „AKTUELL: M8" + „M7" unten.** Repo: https://github.com/Scholzer0303/quack-and-catch (öffentlich).

## Session-Start-Routine (Pflicht)
```bash
git log --oneline -15   # zuletzt: M8 Juice+Audio (AudioManager WebAudio-Synth + MuteButton + SparkleFx + haptics); davor M7 Progression + M6 Shop + M5 + M4.5
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
                           CameraRig (feste Schräg-Sicht, nur kleiner Parallax), GameStateMachine (Phasen+Timer+Score)
src/systems/            ← DuckSpawner (Reel-API, instanceColor, +Toon-Gradient, +outlineMesh), InputSystem,
                           HookRaycaster (M4.6 Step6: resolveWaterPoint + nearestDuck — räumlich), FishingRod (Engine + Rute-Rig),
                           Economy (+snapshot/hydrate), RewardSystem, SaveSystem (M4),
                           AudioManager (M8: WebAudio-Synth, Lazy-Unlock, Mute via audio:muteChanged)
src/world/              ← StallBuilder, BasinBuilder(+shaders/water), RodBuilder(buildRod→{stick(Kamera),rig(world),line,hookGroup,tip}; Toon+Outline),
                           DuckFactory (MeshToonMaterial+Gradient, buildToonGradient exportiert), materials/OutlineMaterial (Inverted-Hull)
src/ui/                 ← Reticle, UIRoot (besitzt Screens, Phase-Routing, hält `economy`-Ref), HUD (+Rod-Chip via rod:statsChanged),
                           IntroScreen (3-Schritt-Storyboard, Phase `start`, +Codex/Shop-Buttons), CardReveal (Modal),
                           SummaryScreen (+Codex/Shop-Buttons), CodexScreen (Phase `codex`), ShopScreen (Phase `shop`:
                           Ruten/Upgrades, Buy/Equip/Affordability), MuteButton (M8: 🔊 oben rechts, alle Phasen), styles.css
src/fx/                 ← reducedMotion, SplashFx, DuckGlowFx, SparkleFx (M8: Gold-Burst epic/legendary), haptics (M8: navigator.vibrate)
src/data/               ← ducks.ts (RARITY_DEFS/LOOT_TABLES/rollRarity+luck), tips.ts (54 Karten), rods.ts (RODS/UPGRADES/findRod/findUpgrade)
src/events/EventBus.ts  ← typisiertes Pub/Sub
src/types/              ← domain.ts, events.ts, state.ts (M4: SaveData + createDefaultSave)
src/utils/              ← math (oval/lerp/clamp/damp), rng (mulberry32/weightedPick/randInt), color (hex 0xRRGGBB→#rrggbb)
scripts/                ← smoke_test.py (Render, 0 Fehler) + catch_test.py (Fang→Reward→Pause) +
                           save_test.py (Reload-Persistenz + Korruptions-Fallback) — brauchen __qc
```
Datenfluss: `main.ts` → `Game` baut Welt + Loop. `Game.update(dt,elapsed)` Reihenfolge:
`cameraRig.update` → `state.update` (Timer) → [nur wenn ≠ `paused`: `basin.update` → `ducks.update`] →
`fishingRod.update` → `reticle.render` → render. Eingabe event-getrieben (InputSystem); `onPress` ist auf
`phase==='playing'` gegated. Systeme/UI entkoppelt über `EventBus`.
**Phasen-Modell:** Boot in `start` (IntroScreen-Storyboard, Becken lebt). „Los geht's!"/„Überspringen" → `playing`. Fang → `reward:granted`
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
1. ~~**Steuerungs-Redesign**~~ ✅ (Step 5) + ~~**Fang-Engine-Neumodell + Rute/Haken-Optik**~~ ✅ (Step 6) + ~~**Schwierigkeit je Rarität**~~ ✅ (Step 7). Engine ist **räumlich** (Gotcha „M4.6-Fang-Engine" unten): Maus → Wasserpunkt W, Halten senkt den Haken ins Wasser, Loslassen mit Ente ≤ `catchRadius × catchMulByRarity[rarity]` um W fängt (Perfect = mittig). Feste Schräg-Sicht, Rute schwenkt stark, Toon+Outline. Fang-Zone schrumpft je seltener.
2. ~~**Jahrmarkt-Welt / Grafik-Layout**~~ ✅ (Step 8): `StallBuilder.ts` komplett neu (Budenreihe + Wimpel-/Lichterketten + Riesenrad/Zelt-Fernkulisse, alles als 1 gemergte Toon-Geo + 1 Outline + instanced Birnen, ~6 Draw-Calls); `BasinBuilder.ts` schlanker Holz-Plankenrand (Toon+Outline) statt dickem Reifen. `buildStall()` liefert jetzt `{group, dispose}` (Game hält Ref + disposed). Gotcha „M4.6-Jahrmarkt-Welt" unten.
3. ~~**Juice + Bloom/Glow**~~ ✅ (Step 9): `src/fx/` (`reducedMotion`, `SplashFx`, `DuckGlowFx`) + `src/core/postprocessing/Postprocessing.ts` (Bloom). Splash · Catch-Pop (Skala-Overshoot in `FishingRod.updateReel`) · Perfect-Flash (`Reticle.flash`) · Mini-Screenshake (`CameraRig.addShake`, skaliert nach Rarität/Perfect) · HUD-Count-up (`UIRoot.animateHud`) · Threshold-Bloom (Quality-Guard `balance.quality`, coarse-pointer→low, 'off'→Direkt-Render) · Glow seltener Enten (nutzt `RARITY_DEFS.emissive`). reduced-motion überall gated. Gotcha „M4.6-Juice/Bloom" unten.
4. ~~**Tipp-Modal** schicker~~ ✅ (Step 10): `Tip.icon` (Pflichtfeld) + 12 Emojis in `data/tips.ts`; `CardReveal` setzt `card.dataset.rarity` + `--qc-accent` → CSS macht Glow/Theming (Puls nur epic/legendary), Emoji-Medaillon, Token-Count-up (rAF, reuse `lerp`/`clamp` + `BALANCE.juice.hud.countUpMs`, `prefersReducedMotion`-gated, rAF in `dismiss`/`dispose` gecancelt). Rarität-/Kategorie-Chips; `SummaryScreen`-Liste mit Emoji-Prefix. Gotcha „M4.6-Tipp-Modal" unten.
5. ~~**Optional:** Intro-Sequenz~~ ✅ (Step 11): `IntroScreen.ts` (3-Schritt-Storyboard, Bude/Ticket/Angel, „Überspringen") ersetzt `StartScreen.ts`; lebt in Phase `start` (**keine neue Phase**, kein Save-Eingriff, kein State-Machine-Eingriff). `UIRoot` tauscht nur den Screen. Gotcha „M4.6-Intro" unten.
6. Danach: Doku + `/code-review` über M4.6-Diff + Abnahme → zurück zur Roadmap (M5).

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
- **M2/M4.6-Zielen+Reichweite (OBSOLET seit Step 6):** Kein Center-Ray, kein Ray-Sphere, kein `reach`-ab-Haken-Anker mehr. Stattdessen Wasserpunkt W = Strahl ∩ Wasser-Ebene; Fang räumlich über XZ-Abstand zu W. Siehe „M4.6-Fang-Engine" unten.
- **Reel-Pose:** Reel nutzt eigenen `reelDummy` (Scale ≠ 1), `reeling`-Set überspringt gehakte Slots in `writeMatrices` (sonst bekämen alle Enten die Reel-Scale). Softlock-Schutz: `setPointerCapture` + `pointercancel`/`blur`→`cancel`.
- **M3-instanceColor:** `MeshStandardMaterial` multipliziert `vertexColor × instanceColor` → Körper/Kopf/Schwanz sind **weiß** gebacken, damit die Raritätsfarbe durchschlägt; Schnabel/Augen leicht getönt (ok). **Per-Instanz-Emissive/Glint geht nicht** auf geteilter Material-Instanz → DESIGN-Felder gepflegt, Render erst M8 (Shader).
- **M3-Perfect-Flag:** `hook:result` feuert vor `duck:landed` → RewardSystem cacht `perfect`, verbraucht es beim Landen, löscht es bei Miss/Snap + nach Nutzung (kein Leak).
- **M3-Reset-Vertrag:** `setPhase('playing')` resettet Timer/Score nur, wenn `from ≠ paused`. Beide Stellen, die das spiegeln müssen: `GameStateMachine.reset` UND `SummaryScreen` (Tipp-Sammlung leeren). Wer das vergisst → Runde resettet beim „Weiter".
- **M3-HUD-Score:** Score nur via `round:tick` (throttled) ins HUD — Fang pausiert aber sofort → `GameStateMachine` emittiert bei Score-Änderung einen Sofort-Tick (sonst Score-Lag im Modal).
- **M6-Shop:** Rod-Stats kommen jetzt aus der **ausgerüsteten Rute** (`Economy.getActiveRodStats` = Rute + gestapelte Upgrades), nicht mehr aus `BALANCE.hook` (Starter spiegelt die alten Werte → regressionsfrei). `Game` abonniert **`rod:statsChanged` VOR `save.load`** (sonst greift der Hydrate-Emit nicht). **Magnet mutiert bewusst den geteilten W-Vektor** (`HookRaycaster.nearestDuck`) = Fang-/Highlight-Punkt — einmal pro Frame aus frischem W, daher stabil (kein Aufschaukeln). **`luck` re-rollt den sichtbaren Pool** nur bei Änderung (`DuckSpawner.setLuck`, Guard `luck===this.luck`) — sonst behielten Boot-Enten `luck=0`; `DuckGlowFx` zieht die neue Rarität über seinen `lastRarity`-Cache pro Frame nach. **SaveData additiv** (kein Schema-Bump): `equippedRodId` muss owned+bekannt sein (sonst Starter), Upgrade-Stacks auf `maxStacks` geclamped, unbekannte IDs gefiltert. **Tier→Becken-Speed/Loot-Auswahl ist M7** — M6 verdrahtet nur die 6 Stats; `luck` shiftet die aktuelle `LOOT_TABLES[tier]`.
- **M7-Tier (Progression):** `DuckSpawner` alloziert die InstancedMesh **fix auf max-Kapazität** (`Math.max(...duckCountByTier)` = 14, kein neuer Magic-Wert) — die Größe lässt sich nicht nachträglich ändern. `activeCount = duckCountByTier[tier]`; Slots `>= activeCount` sind **geparkt** (`alive=false` + `parkMatrix` Null-Skala). Drei Stellen müssen das spiegeln, sonst tauchen Geister-Enten auf: `writeMatrices` (skippt `slot >= activeCount`), `setLuck`/`update` (skippen via `!alive`), `DuckGlowFx` (versteckt `!alive` — braucht keine Änderung, sizet auf `ducks.length`). `setTier` re-rollt beim Reaktivieren mit `tier+luck`, recomputed `speed`. **Handler-Reihenfolge:** `setLuck` **vor** `setTier` (finaler Reroll nutzt korrekten Tier+Luck). **Boot:** Konstruktion bleibt Tier 0; der `save.load`→`emitStatsChanged`-Emit ruft `setTier` mit dem gespeicherten Tier → kein Eingriff an der Konstruktions-Reihenfolge nötig. **Test-Falle:** `__qc.ducks.ducks.length` ist jetzt **immer 14** — „Becken voll" über `filter(d=>d.alive).length` prüfen (so in `catch_test.py` umgestellt).
- **M8-Audio/Mute:** `AudioContext` **lazy** bei erster Geste (Autoplay-Policy) — bis dahin sind alle Sounds No-ops (deshalb crasht Smoke ohne Geste nicht; deshalb ist Audio auch nicht headless testbar → manuell). Sound-Daten (`SOUNDS`) liegen **im AudioManager** (Content), nur `masterGain` in `balance.audio`; Haptik/Sparkle-Tunables in `balance.juice.haptics`/`.sparkle`. **Mute-Kanal = `audio:muteChanged` (Single Source):** Button emittiert → AudioManager mutet → SaveSystem persistiert; `save.load()` muss den Lade-Wert **vor** dem Abonnieren emittieren (sonst redundanter Write) und AudioManager/UIRoot müssen **vor** `save.load` existieren (sonst verpufft der Lade-Emit) — gleicher Vertrag wie `economy:changed`/`rod:statsChanged`. **`lowTick`** nur bei Sekundenwechsel (`round:tick` feuert mehrfach/Sek). **`SparkleFx`** braucht **HDR-Farbe** (`Color×1.6`, Kanäle >1), sonst blüht das Gold nicht über die Bloom-Threshold (wie `DuckGlowFx`, nicht der MeshBasic-`[0,1]`-Default); Mesh ist bis zum ersten Fang `visible=false`. **Smoke-Rauschen:** ein vereinzelter `MeshBasicMaterial VALIDATE_STATUS false`-Log ist intermittentes swiftshader-Rauschen (tritt auch auf clean HEAD auf, per `git stash` verifiziert) — kein Regress, Re-Run ist sauber.
- **M4-Save-Reihenfolge:** `SaveSystem.load()` läuft **nach** der UIRoot-Konstruktion (in `Game`), denn `economy.hydrate()` feuert `economy:changed` → nur ein bereits gebautes HUD zeigt den geladenen Saldo. Erst hydraten, **dann** `economy:changed` abonnieren (sonst löst der Boot-Emit einen redundanten Write/Loop aus).
- **M4-Korruptionssicher:** `load()` kapselt `getItem` (Private-Mode wirft), `JSON.parse` (korrupt) und einen feldweisen Validator. Version-Mismatch verwirft komplett (Migrations-Seam), einzelne kaputte Felder werden auf Default repariert. `setItem` ist in try/catch (Quota/Private-Mode schlucken — nie Gameplay crashen).
- **M4-Flush:** Debounce (`save.debounceMs` 400) coalesct Writes; `flush()` bei `pagehide` + `visibilitychange→hidden` sichert den letzten Fang. **Kein `beforeunload`** (Mobile unzuverlässig, blockt bfcache). `SaveSystem.dispose()` flusht → entfernt Listener/Timer/Sub (einzige neue Leak-Fläche in M4).
- **M4-Economy-Slice:** `Economy.snapshot()` liefert nur `{tokens, unlockedTips}` (kein Save-Schema-Wissen); `SaveSystem` komponiert das volle `SaveData` (+`schemaVersion`/`muted`). Entkopplung bleibt.
- **M4.6-Toon+Outline:** Enten = `MeshToonMaterial({vertexColors, gradientMap})` (instanceColor trägt durch `<color_vertex>`, in three 0.184 verifiziert). Outline = 2. `InstancedMesh` mit `OutlineMaterial` (BackSide, bläht entlang **`normal`** auf — `objectNormal` existiert im MeshBasic-Shader NICHT!), teilt `geometry`+`instanceMatrix` mit dem Enten-Mesh → Bewegung/Reel gratis gespiegelt. Beide Dispose in `DuckSpawner`. Die Rute nutzt denselben `buildToonGradient` (jetzt aus `DuckFactory` exportiert) + `buildOutlineMaterial`.
- **M4.6-Jahrmarkt-Welt (Step 8):** `buildStall()` liefert jetzt `{group, dispose}` (nicht mehr nackte Group) — die Toon-Gradient-**DataTexture** muss explizit disposed werden (`SceneManager.dispose()` disposed beim Traversen NUR `geometry`+`material`, **keine Texturen, kein `mesh.dispose()`**). Game hält die Ref + ruft `stall.dispose()`. Alle massiven Teile = **1 vertex-gefärbte gemergte Toon-Geo + 1 geteiltes Outline-Mesh** (Muster aus `RodBuilder.place()`); Streifen **flach ohne Outline** (sonst schwarze Linien zwischen den Streifen); Birnen = **1 `InstancedMesh`** und MUSS in `disposables` (sonst lecken `instanceMatrix`/`instanceColor` — wie `DuckSpawner.mesh.dispose()`). `mergeGeometries`: vor Merge auf `position/normal/uv/color` trimmen **und** alle indexed halten, sonst wirft es. **Fernkulisse-Framing:** Silhouetten brauchen Kontrast-Flachton (KEIN Himmel-Match, sonst unsichtbar) + sichtbarer Bogen-Top ≈ y3.0 (die eigene Vordergrund-Markise verdeckt den oberen Bildstreifen). `scripts/_ingame_shot.py` (dev) schießt einen In-Game-Screenshot ohne Start-Modal (`__qc.state.start()`); Output gitignored.
- **M4.6-Juice/Bloom (Step 9):** Juice ist **rein additiv** (kein Event-Typ neu, keine Timing/Emit-Änderung). FX triggern aus EINEM `hook:result`-Subscriber in `Game` (in `busUnsub`); Splash liest `FishingRod.getCatchPoint()` (Live-Ref auf W). Catch-Pop ändert nur den Per-Frame-**Skalawert** in `updateReel` (Settle-Ziel = `hook.reelEndScale`, Single Source). Screenshake = additiver abklingender Offset in `CameraRig.update` (vor `rotation.set`). **Bloom**: `Postprocessing` = `EffectComposer→RenderPass→UnrealBloomPass→OutputPass`; **`EffectComposer.dispose()` disposed NUR die RenderTargets, NICHT die Passes** → Bloom UND OutputPass explizit disposen (sonst Material-Leak). Threshold-Bloom (0.9): Glow-Farben müssen **HDR/ungeclamped** sein (`emissive × emissiveIntensity × intensity`), sonst blüht nichts. **Test-Falle:** Bloom drückt headless/swiftshader auf **~10 fps**; `dt` geclamped → Spielzeit langsamer → fixe Halte-Wartezeiten armen `dip` nicht. `catch_test`/`save_test` halten daher **zustandsbasiert** (`wait_for` `dip≥arm` + Belohnungskette). Echte GPU unbetroffen. `DuckGlowFx`: `instanceColor` nur bei Respawn hochladen (Per-Slot-Rarity-Cache), `instanceMatrix` pro Frame.
- **M4.6-Intro (Step 11):** `IntroScreen.ts` ist ein **reines DOM-Overlay in Phase `start`** (3 Steps, interner `step`-Index, `replaceChildren` je Step) — **keine neue `GamePhase`, keine `GameStateMachine`-/`SaveData`-Änderung**. `UIRoot` tauscht nur `StartScreen`→`IntroScreen` (gleiche API `constructor(parent,onStart)`/`setVisible`/`dispose`); Sichtbarkeit weiter an `to === 'start'`. „Überspringen" **und** letzter Step rufen `onStart` (→ `state.start()` → `playing`). **Tests unberührt**, weil `smoke/catch/save_test` über `__qc.state.start()` direkt starten (Overlay wird umgangen). Step-Animationen rein CSS (`qc-intro-pop`/`-rise`/`-slide`), im `@media (prefers-reduced-motion)`-Block gelistet. `StartScreen.ts` wurde durch IntroScreen ersetzt + gelöscht (war nur von `UIRoot` referenziert).
- **M4.6-Tipp-Modal (Step 10):** `Tip.icon` ist **Pflichtfeld** (kein Fallback-Magic) → alle Karten in `data/tips.ts` müssen es haben, sonst `tsc`-Fehler (gewollter Guard). **Save-sicher:** `SaveSystem` persistiert nur `unlockedTips` (IDs), nie volle `Tip`-Objekte → kein Schema-Eingriff. Glow ist **reine Präsentation → CSS, kein `balance.ts`-Tunable**: `CardReveal` setzt nur `data-rarity` + `--qc-accent`, die `box-shadow`-Stufen je Rarität leben in `styles.css` (`color-mix(in srgb, var(--qc-accent) …%, transparent)`). **Reduced-motion-Falle:** `.qc-card[data-rarity='epic'/'legendary']` hat den Puls — höhere Spezifität als `.qc-card`, also im `@media (prefers-reduced-motion)`-Block **explizit mitlisten**, sonst läuft der Puls trotzdem. Count-up nutzt den rAF-**Timestamp-Arg** (kein `Date.now`), rAF-Handle wird in `dismiss()`/`dispose()` **und** am Anfang von `show()` gecancelt (sonst doppelte Loops bei schnellem Re-Fang). Modal-Sichtprüfung: Wegwerf-Skript feuert `__qc.bus.emit('reward:granted', {tokens, tip, isNewTip})` je Rarität (nicht eingecheckt).
- **M4.6-Fang-Engine (räumlich, Step 6):** Feste Schräg-runter-Sicht aufs ganze Becken (kleiner Parallax, `balance.camera`). `HookRaycaster.resolveWaterPoint(camera, pointerNdc, waterY)` = Strahl ∩ Wasser-Ebene (y=0), auf das Becken-Oval geclamped (`basinInset`) → **Wasserpunkt W**. W ist Fadenkreuz-Ziel, Haken-Ziel und Fang-Mittelpunkt. `nearestDuck(W, ducks, catchRadius)` = Fang-Kandidat (XZ-Abstand), **effektiver Radius je Ente = `catchRadius × catchMulByRarity[rarity]`** (Step 7: gelb 1.0 → grün 0.62 → blau 0.4 → epic 0.3 → legendary 0.24; Drop-Zone-Ring + Perfect-Zone skalieren sichtbar mit). `FishingRod`-States: `idle | lowering | reel | cooldown` (KEIN Timing-Window). `press()` senkt immer; `release()`: `dip ≥ armProgress` **und** Ente ≤ `catchRadius` um W → Fang (mittig ≤ `perfectRadius` → Perfect); zu schwer → Snap. Reel zieht die Ente zur **Rutenspitze (world)**.
- **M4.6-Rute-Rig:** `buildRod()` liefert `{ stick, rig, line, hookGroup, tip, dispose }`. `stick` (Griff+Rute) = Kind der Kamera, schwenkt **stark** per yaw/pitch aus `aimNdc` (`swingAmount`). `rig` (Schnur+Haken+Schwimmer) = **world-space** (Game hängt es in die Szene), damit der Haken bis auf die Wasserlinie bei W reicht. Pro Frame: `tipWorld = stick.localToWorld(tip)`, `hookWorld = lerp(tipWorld, W, dip)`, `stretchLine`. Senken paced via `lowerDurationMs`, Heben gedämpft (`dipDampLambda`). `dispose()` gibt alle Geometrien/Materialien frei.
- **M4.6-Release-Timing-Falle (Tests):** `release()` läuft event-synchron **vor** dem nächsten Frame. Springt der Cursor unmittelbar vor `up()` weit, hängt die Kamera (aimInstant) ein Frame nach → W/Strahl inkonsistent. Im echten Spiel irrelevant (Cursor folgt flüssig). In `catch_test.py`/`save_test.py` deshalb **kein** Re-Aim/`evaluate` zwischen `down` und `up`; ruhig halten (~360 ms, bis `dip ≥ armProgress`), dann loslassen.

## AKTUELL: M6 — Upgrade-Shop ✅ (gepusht, reviewt)
- **Katalog `data/rods.ts`:** 4 Ruten (Tier-0 „Holzangel" gratis+equipped, Tier-1 „Glücksrute", Tier-2 „Magnetstab", Tier-3 „Goldene Kirmesrute") + 4 stapelbare Upgrades (Schnur/Rolle/Köder/Magnetclip) + `STARTER_ROD_ID`/`findRod`/`findUpgrade`. **Starter spiegelt die `BALANCE.hook`-Basiswerte** → Default-Spiel regressionsfrei. Katalog = Daten-of-Record (wie `RARITY_DEFS`); nur `magnetPullFraction`/`luckWeightFactor` liegen in `balance.shop`.
- **`Economy`:** `buyRod`/`equipRod`/`buyUpgrade` (Validierung Affordability/Ownership/maxStacks) + `getActiveRodStats` (equipped Rute + Summe gestapelter Upgrade-Deltas) + UI-Getter (`owns`/`isEquipped`/`getStacks`/`canAfford`/`getEquippedRodId`). `snapshot`/`hydrate` um 3 Felder erweitert.
- **`ui/ShopScreen` (Phase `shop`, lag im `GamePhase`-Union):** Ruten Kaufen/Ausrüsten/Ausgerüstet + Affordability-Dimming, Upgrades Stufe x/max, Stat-Chips, Token-Saldo. Lifecycle spiegelt `CodexScreen` (Esc, `economy:changed`-Re-Render). Einstieg aus Intro (letzter Step) + Summary; `Game.shopReturn` → reset-frei zurück (wie `codexReturn`).
- **Rod-Stats wirken:** `reach`→`catchRadius ×`, `castSpeed`/`reelSpeed`→`lowerDur`/`reelDur` geteilt, `lineStrength`→Snap-Gate, `magnetRadius`→`HookRaycaster.nearestDuck` zieht W, `luck`→`rollRarity(rng,tier,luck)`-Shift. `Game` abonniert **`rod:statsChanged` vor `save.load`** → `FishingRod.setStats` + `DuckSpawner.setLuck`. **`timingWindowMul` aus `RodStats` entfernt** (kein Konsument im räumlichen Engine). HUD-Rod-Chip folgt der Rute.
- **Save:** `ownedRodIds`/`equippedRodId`/`upgradeStacks` **additiv, kein Schema-Bump**; feldweise Validierung (`KNOWN_ROD_IDS`/`UPGRADE_MAX_STACKS` aus `data/rods.ts`, unbekannte IDs filtern, equipped muss owned sein, Stacks clampen).
- **Review-Fixes:** (1) Glück wirkte nur auf Respawns → `DuckSpawner.setLuck` re-rollt bei Änderung den lebenden Pool (Guard hält `luck=0`-Boot deterministisch); (2) HUD zeigte hartkodiert „Bambusrute" → folgt jetzt der ausgerüsteten Rute. Gotcha „M6-Shop" unten.

## AKTUELL: M8 — Juice + Audio ✅ (gepusht)
- **`systems/AudioManager` (prozeduraler WebAudio-Synth):** Töne aus Oszillatoren (square/triangle) + Gain-Hüllkurve — kein Asset (Projektregel). Sound-Definitionen (Noten/Dauern) als `const SOUNDS` **im Modul** (Content-Daten wie `RARITY_DEFS`/tips.ts), nur `masterGain` in `balance.audio`. Reagiert auf `hook:cast`/`hook:result`(hit/perfect/fail)/`duck:landed`(reel)/`reward:granted`(+`isNewTip`-Sparkle)/`round:ended`/`round:tick`(lowTick). **Lazy-Unlock:** `AudioContext` erst bei erster Geste (window-Listener pointerdown/keydown/touchstart, danach entfernt → `audio:unlocked`); davor alle `play()` No-ops (headless/Smoke-sicher).
- **Mute = ein Event (`audio:muteChanged {muted}`):** `ui/MuteButton` (🔊/🔇, fix oben rechts, **alle Phasen**, kein phase:changed-Gating) emittiert; AudioManager mutet den Master-Gain (Kontext bleibt offen); `SaveSystem` persistiert. **Reihenfolge:** AudioManager + UIRoot **vor** `save.load()`; `load()` emittiert den `muted`-Lade-Wert **vor** dem Abonnieren (kein redundanter Write, aber Icon+Audio korrekt gesetzt). `save.muted` greift jetzt (war seit M4 reserviert).
- **Rest-Juice:** `fx/SparkleFx` (Gold-Funken-`InstancedMesh`, additive **HDR-Farbe** `Color×1.6` → Bloom, deterministische Partikel je Index) im **bestehenden** `hook:result`-Subscriber nur bei epic/legendary. `fx/haptics` (`navigator.vibrate`, Guard: API vorhanden + nicht reduced-motion) — Fang kurz, Perfect Doppel-Buzz. Low-Time-**Puls** war schon CSS (`.qc-timer.low-time`); M8 ergänzt nur den `lowTick`-Ton.
- **Gotcha „M8-Audio/Mute" unten.** Doku/Review/Gate: siehe LESSONS 2026-06-23.

## AKTUELL: M7 — Progression koppeln ✅ (gepusht)
- **Tier-Kanal verdrahtet:** `rod:statsChanged: { stats, tier }` (einzige Emit-Stelle `Economy.emitStatsChanged`, `tier = findRod(equippedRodId)?.tier ?? 0`). `Game`-Handler ruft `fishingRod.setStats` → `ducks.setLuck` → `ducks.setTier`.
- **`DuckSpawner` auf max-Kapazität (`Math.max(...duckCountByTier)` = 14):** pro Tier sind `activeCount` Slots aktiv, der Rest **geparkt** (`alive=false` + `parkMatrix` = Null-Skala). Neuer `setTier(tier)` (Guard `tier===this.tier`) reaktiviert/parkt Slots, recomputed `speed` (Rotation) und re-rollt Loot mit `tier+luck`. `writeMatrices` überspringt `slot >= activeCount`; `reeling`-Guard schützt laufende Reels.
- **Behebt Boot-Bug:** Vorher konstruierte `Game` `DuckSpawner` hart mit Tier 0 und der `save.load`-Emit setzte nur `luck` → gespeicherte bessere Rute gab trotzdem Tier-0-Becken/-Loot. Jetzt greift der Tier am Boot.
- **Magnet + Legendary-Gating:** **kein neuer Code** — schon M6 (Magnet `HookRaycaster.nearestDuck`; Legendary-Gate `FishingRod.release` `weight > lineStrength` → Snap, Legendary nur mit Goldrute). In M7 verifiziert.
- **Test:** `catch_test.py` prüft jetzt `aliveCount == 8` (nicht Pool-Länge 14). Gotcha „M7-Tier" unten.

## Roadmap-Rest
**M4.6 ✅ + M5 ✅ + M4.5 ✅ (live) + M6 ✅ + M7 ✅ + M8 ✅** → **M9 Stretch** (optional, nur bei Zeit — mehrere Becken/Themes, DE/EN-Toggle, lokale Bestenliste, mehr Inhalte; nie auf Kosten der Stabilität). Roadmap-Kern abgeschlossen.

## AKTUELL: M4.5 — Vercel-Live-Deploy ✅ (live)
- **Live: https://quack-and-catch.vercel.app** — Vercel-Projekt `quack-and-catch` (Team `scholzer0303s-projects`), Vite auto-erkannt (Build `npm run build` → `dist/`, `base './'` greift), 0 Konsolenfehler.
- **Git-Auto-Deploy von `main` aktiv** (`vercel git connect`): jeder Push auf `main` deployt automatisch zu Production — verifiziert (Push → neues Prod-Deployment).
- **Setup-Gotcha:** Vercel CLI nicht global installiert → via `npx vercel …`. `vercel git connect` braucht **GitHub-App-Autorisierung** (einmalig im Nutzer-Account). `deploy_to_vercel`-MCP deployt nicht selbst (verweist auf CLI/Git); MCP-`list_deployments` gibt 403 (Scope) → Verifikation via `npx vercel ls quack-and-catch --scope scholzer0303s-projects`.
- **Manueller Re-Deploy** (falls je nötig): `npx vercel deploy --prod --yes` aus dem Repo-Root. `.vercel/` ist gitignored.
- **`__qc` ist DEV-only** (in Prod getreeshakt) → Live-Smoke-Checks können `__qc.state.start()` NICHT nutzen; nur Render/Konsolenfehler prüfen.

## AKTUELL: M5 — Tipp-Codex-Screen ✅ (gepusht, reviewt)
- **Inhalt:** `data/tips.ts` 12 → **54 geprüfte deutsche Karten** (9 Kategorien, alle Tiers; bestehende 12 IDs stabil — Economy/Save keyt darauf).
- **`ui/CodexScreen.ts`** (Phase `codex`, war schon im `GamePhase`-Typ): tier-gefärbtes Grid, **freigeschaltet → Icon + Titel + Klick-Detail**, **gesperrt → nur 🔒 + Tier-Farbe** (kein Spoiler), Kategorie-Filter-Chips, Fortschritt „X / 54". Esc steppt aus Detail zurück bzw. schließt. Folgt dem `SummaryScreen`-Lifecycle; `dispose()` entfernt window-keydown + bus-Sub + Overlay.
- **Navigation:** Einstieg aus **Intro (letzter Step)** + **Summary** via neue `UICallbacks.onOpenCodex`/`onCloseCodex`. `Game.codexReturn` merkt die Quelle → `onCloseCodex` kehrt **reset-frei** dorthin zurück (nie über `playing`). `UIRoot` bekommt jetzt `economy` durchgereicht (vor UIRoot angelegt).
- **Kein Save-Eingriff:** `KNOWN_TIP_IDS` aus `TIPS` abgeleitet → neue IDs automatisch bekannt, kein Schema-Bump. `firstTimeCodexBonus` lag bereits in `Economy`.
- **Review-Fix:** `hex()` nach `src/utils/color.ts` extrahiert (war in `CardReveal` + `CodexScreen` dupliziert). Details: `LESSONS_LEARNED.md` 2026-06-23.
