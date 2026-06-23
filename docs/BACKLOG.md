# BACKLOG — Quack & Catch

Meilenstein-Checkliste. Jeder Task ≈ ein Commit/Push (kurze deutsche Message). Verifikations-Gate je Meilenstein: `typecheck` + `lint` grün, `build` + `preview` fehlerfrei, **null Konsolenfehler**, ~60 fps Desktop + Mobile.

Legende: `[ ]` offen · `[x]` erledigt · `[~]` in Arbeit

---

## M0 — Setup & GitHub-Anbindung
- [x] `git init` (main), erstes Commit, `.gitignore` + `LICENSE`
- [x] Repo `Scholzer0303/quack-and-catch` (öffentlich) anlegen, `origin` setzen, Verbindungstest-Push
- [x] Projekt-`CLAUDE.md` mit Push-Regeln + Session-Routine
- [x] Planungsdokumente (STATUS, BACKLOG, DESIGN, LESSONS_LEARNED)
- [x] Vite + TS (strict) + Three.js scaffolden; `package.json`-Scripts (dev/build/preview/typecheck/lint/format)
- [x] `vite.config.ts` (`base: './'`, `outDir: 'dist'`), `tsconfig` strict-Flags
- [x] ESLint (flat config) + Prettier + `.gitattributes` (LF)
- [x] `index.html` + leeres `src/main.ts`, Smoke-Build grün (typecheck/lint/build/preview ✓)

## M1 — First-Person-Szene ✅
- [x] `core/RendererManager` + `SceneManager` + `CameraRig` (FP-Pose, pixelRatio-Cap, Resize)
- [x] `core/GameLoop` (geclampter dt) + `core/Game`
- [x] `config/balance.ts`-Skelett + `utils/math` (Oval, lerp/clamp) + `utils/rng`
- [x] `world/StallBuilder` (Stand/Theke/Markise/Backdrop)
- [x] `world/BasinBuilder` (ovaler Kanal) + Wasser-Shader (animiert)
- [x] `world/DuckFactory` + `systems/DuckSpawner` (8 rotierende Enten, InstancedMesh)
- [x] `world/RodBuilder` (Angel/Schnur/Haken im Vordergrund)
- [x] `events/EventBus` (typisiert)
- Verifiziert: typecheck/lint/build grün, Playwright-Screenshot (0 Konsolenfehler), Enten sichtbar auf der Bahn.

## M2 — Hak-Mechanik ✅
- [x] `systems/InputSystem` (Pointer Events, Aim normalisiert) + Kamera-Aim-Schwenk im Cone
- [x] `systems/HookRaycaster` (Aim-Ray vs. gecachte Bounding-Spheres, reach ab Haken)
- [x] `systems/FishingRod` State-Machine (Halten-Laden/Loslassen: idle→casting→window→reel→cooldown)
- [x] Timing-Window + Perfect-Sub-Window
- [x] Reel-Animation + `removeAndRespawn`
- [x] Miss-Handling + Cooldown, `ui/Reticle` (Timing-Feedback) + Hover-Highlight
- [x] `lineStrength`-Gate (schwere Enten reißen ab, kein Softlock)
- Verifiziert: typecheck/lint/build grün; Playwright-Smoke (0 Konsolenfehler) + `scripts/catch_test.py` (Hit→Reel→Respawn, Becken bleibt voll, Perfect & Softlock-Schutz).

## M3 — Belohnung + HUD + Screens ✅
- [x] `data/ducks.ts` Raritäten + per-Instanz-Farben (`instanceColor`); Loot-Roll (Tier 0–3)
- [x] `data/tips.ts` erste 12 Karten (Deutsch, geprüft)
- [x] `systems/RewardSystem` (Rarität→Tokens + Perfect-Bonus + Tipp) + `systems/Economy`
- [x] `ui/UIRoot` + `styles.css` + `ui/HUD` (Score/Tokens/Timer/Rod)
- [x] `core/GameStateMachine` (Phasen + Rundentimer + Score) + `ui/StartScreen`
- [x] `ui/CardReveal` (blockierendes Tipp-Modal, Pause) + `ui/SummaryScreen`
- Verifiziert: typecheck/lint/build grün; Smoke (0 Konsolenfehler) + `catch_test.py` (Hit→Reward→Pause, Tokens>0, Becken voll); Screenshots Start/HUD/Modal/Summary, Raritätsfarben sichtbar.

## M4 — Save + Deploy-Check ✅
- [x] `types/state.ts` (SaveData + `createDefaultSave`) + `systems/SaveSystem` (versioniert, debounced, korruptionssicher)
- [x] Persistenz: Tokens + freigeschaltete Tipps; Laden beim Boot (hydrate→HUD); `muted` reserviert für M8 (Rod/Stats folgen additiv mit M6/M7)
- [x] README ausbauen (Pitch, Features, Controls, Design Notes)
- [x] Prod-Härtung (pixelRatio-Cap ✓, dispose-Audit, Error-Boundary ✓), `build`+`preview` aus `dist/` (✓ `__qc` getreeshakt)
- Verifiziert: typecheck/lint/build/preview grün; `scripts/save_test.py` (Fang→Flush→Reload behält Tokens+Tipps; 3 Korruptionsfälle → sauberer Default); Smoke (0 Konsolenfehler) auf Dev + Prod-Build.

## M4.6 — Game-Feel & Bright-Comic-Overhaul (IN ARBEIT, höchste Priorität)
Eingeschoben nach Nutzer-Live-Test (Wettbewerb): Steuerung muss „cool" sein + Comic-Optik. Details/Feedback in `docs/HANDOVER.md` → „AKTUELL: M4.6".
- [x] Step 1: Direktes Fadenkreuz + Pointer-Raycast + Instant-Aim (Auswerfen funktioniert; `fc76f17`)
- [x] Step 2: Heller Comic-Tag (Himmel/Rasen/Wasser/Stand; `f6c716a`)
- [x] Step 3: Toon/Cel-Shading auf Enten (`a9ff24b`)
- [x] Step 4: Schwarze Comic-Outlines auf Enten (Inverted-Hull; `4d1a834`)
- [x] **Steuerungs-Redesign:** Rute schwenkt sichtbar; **Halten senkt Haken / Loslassen hebt**; **Lock bei Release** im grün/gold-Ring über einer Ente. (Step 5, `c0900e3`)
- [x] **Fang-Engine-Neumodell + Rute/Haken-Optik:** feste Schräg-Sicht aufs ganze Becken; Maus → **Wasserpunkt W** (`HookRaycaster.resolveWaterPoint`); Halten senkt Haken **echt ins Wasser** bei W (Schnur+Haken world-space, von der Spitze); **räumlicher Fang** (Ente ≤ `catchRadius`, Perfect = mittig ≤ `perfectRadius`); Rute schwenkt stark (yaw/pitch); Rute/Haken Toon+Outline + Schwimmer. (Step 6, `3378f59`)
- [x] **Schwierigkeit je Rarität:** `catchMulByRarity` verkleinert Fang-/Perfect-Zone je seltener (gelb 1.0 → grün 0.62 → blau 0.4 → epic 0.3 → legendary 0.24); Drop-Zone-Ring skaliert sichtbar mit. Basis-Balance: `catchRadius` 0.42, Enten etwas schneller. (Step 7, `7a92a69`)
- [x] **Jahrmarkt-Welt:** graue Wand weg → Comic-Jahrmarkt (Budenreihe, Wimpel-/Lichterketten, Riesenrad + Zirkuszelt als Fernkulisse); schlanker Holz-Plankenrand (Toon+Outline) statt dickem Reifen. Alles als gemergte Toon-Geo + 1 Outline + instanced Birnen (~6 Draw-Calls). (Step 8)
- [x] **Juice + Bloom/Glow:** Splash · Catch-Pop · Perfect-Flash · Mini-Screenshake (skaliert nach Rarität/Perfect) · HUD-Count-up (`src/fx/`) · Bloom-Postprocessing mit Mobile-Quality-Guards (`core/postprocessing/`) · Glow seltener Enten. reduced-motion respektiert. (Step 9)
- [x] **Tipp-Modal schicker:** Emoji-Medaillon je Tipp (`Tip.icon` Pflichtfeld + 12 Emojis) · Rarität-Glow/Theming (`data-rarity` + `--qc-accent`, Puls nur epic/legendary) · Token-Count-up · Rarität-/Kategorie-Chips; Summary-Liste mit Emoji-Prefix. reduced-motion gated. (Step 10)
- [x] **Intro-Sequenz:** 3-Schritt-CSS-Storyboard (Bude → Ticket an Verkäuferin → Angel → los) als Overlay in Phase `start`; „Weiter"/„Los geht's!" + „Überspringen". Neuer `IntroScreen.ts` ersetzt `StartScreen.ts`; **keine neue Phase, kein Save-Eingriff**; läuft einmal pro Seitenaufruf (Boot, Phase `start`), „Überspringen" springt zum Steuerungs-Schritt. reduced-motion gated. (Step 11)

## M4.5 — Vercel-Live-Deploy (nach MVP)
- [x] Vercel-Projekt `quack-and-catch` angelegt (Vite erkannt), **Prod-Deploy live**: https://quack-and-catch.vercel.app
- [x] Live-URL in README + STATUS eingetragen
- [x] **Git-Auto-Deploy von `main`** ✅ — nach GitHub-App-Autorisierung `vercel git connect` → „Connected". Jeder Push auf `main` deployt automatisch.

## M5 — Tipp-Codex-Screen ✅
- [x] `data/tips.ts` auf ~50–60 Karten ausbauen (54 Karten, 9 Kategorien, alle Tiers, geprüft)
- [x] `ui/CodexScreen` (Grid locked/unlocked, Tier-Farbe + Kategorie-Filter, Detail, Fortschritt)
- [x] Codex in State-Machine (Phase `codex`, Einstieg aus Intro/Summary) + `firstTimeCodexBonus` (lag bereits in `Economy`)
- Verifiziert: typecheck/lint/build grün; Smoke (0 Konsolenfehler bis auf swiftshader-Rauschen) + `save_test.py` (`ok:true`, neue IDs in `KNOWN_TIP_IDS`); Codex-Screenshots (Grid locked/unlocked + Detail) gesichtet.

## M6 — Upgrade-Shop ✅
- [x] `data/rods.ts` Katalog: 4 Ruten (Tier-0-Starter gratis+equipped, spiegelt `BALANCE.hook`-Basiswerte) + 4 stapelbare Upgrades; `STARTER_ROD_ID`/`findRod`/`findUpgrade`
- [x] `Economy` Kaufvalidierung/Equip/Upgrade-Stacking (`buyRod`/`equipRod`/`buyUpgrade`/`getActiveRodStats`); SaveData additiv (`ownedRodIds`/`equippedRodId`/`upgradeStacks`, kein Schema-Bump, feldweise validiert)
- [x] `ui/ShopScreen` (Phase `shop`): Ruten Kaufen/Ausrüsten/Ausgerüstet + Affordability-Dimming, Upgrades Stufe x/max, Stat-Chips, Token-Saldo; Einstieg aus Intro/Summary (reset-frei via `shopReturn`)
- [x] Rod-Stats wirken: `reach`→catchRadius×, `castSpeed`/`reelSpeed`→Tempo, `lineStrength`→Snap-Gate, `magnetRadius`→`HookRaycaster` zieht W, `luck`→`rollRarity`-Shift (`timingWindowMul` entfernt — kein Konsument im räumlichen Engine). HUD-Rod-Chip folgt der Rute.
- Verifiziert: typecheck/lint/build grün; Smoke (0 Konsolenfehler bis auf swiftshader-Outline-Rauschen); Funktions-/Persistenz-/Korruptions-Test via `__qc.economy` (Kauf/Equip/Stacking, maxStacks/Affordability blocken, Reload überlebt, unbekannte IDs/Over-Max → Default); ShopScreen-Screenshot gesichtet. Review (3 Finder-Angles): 2 Fixes (Glück wirkt sofort auf Pool, HUD-Rod-Name dynamisch).

## M7 — Progression koppeln ✅
- [x] Rod-Tier → Becken-Speed (Entenzahl 8/10/12/14 + Rotation ×1.0–1.8) — `DuckSpawner.setTier`, max-Kapazität-Pool (14) mit geparkten Slots
- [x] Rod-Tier → Loot-Table-Auswahl (`rollRarity(rng, tier, luck)`) + `luck`-Shift kombiniert; `tier` propagiert über `rod:statsChanged` (behebt Boot-Bug)
- [x] Magnet zieht nahe Enten; Legendary-Gating — **bereits durch M6 abgedeckt** (Magnet `HookRaycaster`, Legendary-Gate `lineStrength`-Snap in `FishingRod`); in M7 verifiziert, kein neuer Code
- Verifiziert: typecheck/lint/build grün; Smoke (0 Konsolenfehler) + `catch_test` (Pool 14, 8 aktiv/Tier 0, Respawn voll); M7-Wegwerf-Test: Gold → 14 aktiv + ~1.8× Rotation + Epic/Legendary; zurück → 8 aktiv; Reload → 14 aktiv (gespeicherter Tier greift am Boot).

## M8 — Juice + Audio ✅
- [x] `systems/AudioManager` (prozeduraler WebAudio-Synth: cast/hook/perfect/reel/reward/fail + roundEnd + lowTick, First-Gesture-Unlock → `audio:unlocked`, Mute über `audio:muteChanged`); persistenter 🔊-Button (`ui/MuteButton`, oben rechts, alle Phasen); `save.muted` greift jetzt
- [x] Visuelle Juice komplett: Catch-Pop · Splash-Ripple · Perfect-Flash · HUD-Count-up · Low-Time-Pulse (alle bereits M4.6) + **Legendary-Sparkle** neu (`fx/SparkleFx`, Gold-Burst bei epic/legendary, additiv → Bloom)
- [x] Camera-Punch (M4.6-Shake) + **Mobile-Haptik** (`fx/haptics`, `navigator.vibrate`, coarse-pointer + nicht-reduced-motion gated); reduced-motion respektiert (Sparkle/Haptik aus, Audio bleibt)
- Verifiziert: typecheck/lint/build grün; Smoke (0 Konsolenfehler; intermittentes swiftshader-MeshBasic-Rauschen unverändert vorhanden, auch auf clean HEAD). Audio braucht echte Geste → manuell geprüft.

## M9 — Lebhaftigkeit, Sog & Politur ✅
Nutzer-Wunsch nach Live-Test: mehr Leben/Atmosphäre + „süchtiger". Alle Tunables in `balance.{crowd,skyDeco,combo,stall,render}`, kein Schema-Bump.
- [x] **9.1 Zuschauer-Menge:** `world/CrowdBuilder` + `CharacterFactory` (InstancedMesh Toon + geteilte Outline, Muster wie DuckSpawner); wippen im Leerlauf, springen bei jedem Fang jubelnd (`crowd.cheer` auf `hook:result`). reduced-motion → statisch.
- [x] **9.2 Reaktive Welt:** `StallBuilder` Refactor — drehbares Riesenrad (eigene Group, Beine statisch im Merge) + pulsierende Lichterketten, die beim Fang aufblitzen (`update(dt,elapsed)`/`flash()`). reduced-motion → still.
- [x] **9.3 Himmel-Deko:** `fx/SkyDecoFx` — aufsteigende Ballons + ziehende Vögel (je 1 InstancedMesh, Bewegung aus `elapsed`); via NDC-Projektion ins einzige sichtbare Band über der hinteren Beckenhälfte platziert (Top-Down-Kamera + Vordergrund-Markise lassen kaum Himmel frei). reduced-motion → statisch.
- [x] **9.4 Abend-Stimmung:** Verlaufshimmel (CanvasTexture-Hintergrund, explizit disposed) + warmer Ambient-Wash + violettes Gegenlicht + mehr Bloom; `SceneManager`/`balance.render`. Hält die Comic-Helligkeit.
- [x] **9.5 Combo/Streak:** `systems/ComboSystem` zählt Fänge in Folge (Reset bei Miss/Snap + frischer Runde, NICHT im Tipp-Modal) → `combo:changed`; `RewardSystem` skaliert Tokens; HUD-Badge „🔥 Combo N · ×M" (Pop, reduced-motion-gated). Stufen 2/4/6/9 → ×1.25/1.5/2/3.
- [x] **9.6 Persistenter Highscore:** `systems/HighscoreSystem` wertet `round:ended` aus → `highscore:changed`; SaveData um `highScore` additiv erweitert (feldweise validiert); SummaryScreen zeigt Rekord-Zeile bzw. „🏆 Neuer Rekord!".
- [x] **9.7 Audit-Politur:** Vitest + jsdom (13 Tests: Economy Kauf/Equip/maxStacks + SaveSystem Defaults/Korruption/Version/Reparatur/Highscore-Persistenz); `:focus-visible` für Buttons/Mute; Highlight-Ring-Farbe → `balance.aim`. (SparkleFx + haptics hatten reduced-motion-Guards bereits → Audit-Befund war veraltet.)
- Verifiziert: typecheck/lint/build grün; `npm test` 13/13; Smoke `ok:true` (0 Konsolenfehler); Playwright-Proben für Combo (Serie/Reset/Token-Skalierung) + Highscore (Rekord überlebt Reload) + In-Game-Shots (Crowd/Deko/Abend/Combo-Badge).
- Review (8 Angles, high effort): **0 Korrektheits-Defekte**; 3 Cleanup/Kosmetik behoben (Bloom-Flicker `bulbMat`-Puls ≥1.0, `paint`→shared `bakeVertexColor`, toter `rotation.set`).

## M10 — Pause-Menü + Shop-Eskalation + Fang-Tuning ✅
Teil 1/3 des Nutzer-Feedback-Pakets nach Live-Test (Plan `~/.claude/plans/pipeline-soweit-erstmal-fertig-calm-kay.md`). Kein Schema-Bump.
- [x] **Step 1 Pause-Menü:** neue Phase `pausemenu` (getrennt vom Belohnungs-`paused`); `ui/PauseScreen` (Weiter/Runde beenden + Shop/Codex); Pause-Button oben links im HUD (touch-tauglich) + ESC (`Game`-Keydown, playing↔pausemenu); Becken/Enten frieren in beiden Pausen ein; `GameStateMachine.endRound()`; Reset-Vertrag (`isPauseState`) behält die Runde beim Resume (Spiegelstelle SummaryScreen mit-angepasst).
- [x] **Step 2 Shop-Preis-Eskalation:** `Economy.getUpgradePrice` = Basispreis × `shop.upgradePriceGrowth`^Stacks (z. B. Schnellrolle 35→60→101); `buyUpgrade` + ShopScreen-Button + Affordability nutzen ihn; +Vitest-Test.
- [x] **Step 3 Fang-Tuning:** `duck.speedMulByRarity` (seltenere Enten schneller, live in `DuckSpawner.update`); `duckCountByTier` 8/10/12/14 → 10/12/14/16 („mehr Enten"); `catch_test` auf 10 aktive Enten angepasst.
- Verifiziert: typecheck/lint grün; `npm test` 14/14; `build` grün; Smoke `ok:true` (0 Konsolenfehler); `catch_test` `ok:true` (10 aktiv, Fang→Reward→Pause); Pause-Flow per Playwright (Button-Klick + ESC beidseitig, Timer friert, Resume erhält Runde, „Ende"→Summary).

## M11 — Heilige Ente + Wissens-Kopplung + 100 Karten ✅
Teil 2/3 des Nutzer-Feedback-Pakets. Kein Schema-Bump (neue Rute in `ownedRodIds`, neue Tip-IDs in `unlockedTips`; `KNOWN_TIP_IDS` leitet sich aus `TIPS` ab). Hardcore-Chase-Tuning (Nutzer-Wunsch); Tipp-Fokus auf tiefes Wissen + Crossover statt heilig-Masse.
- [x] **Step 1 Rarität `'heilig'`:** `DuckRarity` erweitert + kanonische `RARITY_ORDER`-Konstante (`types/domain.ts`); `RARITY_DEFS.heilig` (cremeweiß + goldener Halo, `weight 6`, `baseValue 900`); `LOOT_TABLES` heilig-Spalte (Tier 0–2 = 0, Tier 3 = 1 für Alt-Weg, neue Tier-4-Tabelle = 4); `balance` heilig in `speedMulByRarity 1.45`/`catchMulByRarity 0.14`/`shake.byRarity 4.5`/`tokensByRarity [200,300]`; `duckCountByTier`/`rotationSpeedMulByTier` auf Länge 5; Sparkle-Gate (`Game.ts`) + `TIER_ORDER` (`CodexScreen`, aus `RARITY_ORDER` abgeleitet) decken heilig ab.
- [x] **Step 2 Tier-4-Rute:** `rod-heilig` „Heilige Kirmesrute" (tier 4, Preis 1200, `lineStrength 6`, Top-Stats); Alt-Weg bleibt: Gold-Rute (5) + 1× „Stärkere Schnur" → 6.
- [x] **Step 3 Wissens-Crossover:** `rewards.crossoverChance 0.12`; `RewardSystem.rollTipTier` wählt per `RARITY_ORDER` ein strikt höheres Tier (Top-Tier heilig → kein Crossover); Tokens bleiben rarität-gebunden (vor `pickTip` berechnet).
- [x] **Step 4 Tipp-Codex 54 → 100:** 46 neue Karten (common 14, uncommon 16, rare 18, epic 20, legendary 20, heilig 12); fortgeschrittenes Claude/Claude-Code-Wissen, heilig = Geheimwissen; bestehende 54 IDs unverändert.
- Verifiziert: typecheck/lint grün; `npm test` 19/19; `build` grün. **Faktencheck per Verifikations-Workflow** (6 Agents gegen aktuelle docs.claude.com): 7 Findings → 5 Karten präzisiert (Token-Zählung „geschätzt", Batch „halber Preis", adaptive Thinking, Subagent-Async, Skill-Frontmatter), 2 abgelehnt (Hook-Blocking + Streaming-Timeout sind laut Docs korrekt). **Code-Review (M11-Diff, 10 Angles, xhigh):** 0 Korrektheits-Defekte.

## M12 — Optik-Overhaul ✅ (Teil 3/3 des Feedback-Pakets)
Toon-Basis bleibt (kein Material-Wechsel → instanceColor/Outline/Bloom unangetastet). Je Sub-Step ein Commit/Push. Kein Schema-Bump.
- [x] **Step 1 Enten:** rundere/pummeligere Geo + größerer runder Kopf; **echte Augen** (weiße Sklera + dunkle Pupille) + **roter glänzender Schnabel** via neuem **Detail-Mesh** (3. InstancedMesh, teilt instanceMatrix by reference, KEIN instanceColor → über alle Raritäten farbecht); **Gummi-Gloss** via `onBeforeCompile` (weicher Specular-Hotspot + Fresnel-Himmel-Tint) auf der geteilten `MeshToonMaterial` (kein envMap, Cel-Bänder bleiben); Rim-Licht leicht kräftiger.
- [x] **Step 2 Wasser:** analytische Wellen-Normale (Sinus-Ableitungen) → blickwinkelabhängige Reflexe; **Fresnel-Himmel-Reflexion** (heller am flachen Blickwinkel) + **Crest-Glitzer** (scharfes Sonnen-Specular) mit wanderndem **Caustics-Schimmer**; sattere Tiefenfarbe. Rein im Shader (kein Render-Target → Mobile-sicher).
- [x] **Step 3 Grading:** **Grade-Pass ersetzt OutputPass** (ACES-Filmic-Tonemapping + Sättigungs-Boost + Linear→sRGB in einem Pass, läuft NACH dem Bloom → Bloom-Threshold in linearem HDR unberührt); Renderer bleibt `NoToneMapping` im Composer-Pfad (kein doppeltes Tonemapping); Quality-Guards (coarse-pointer/postFx) respektiert.
- Verifiziert: typecheck/lint/build/preview grün; Smoke `ok:true` (0 Konsolenfehler) + `catch_test` `ok:true` (Fang→Reward→Pause, `duckCount 18`/`aliveCount 10`); In-Game-Shots (Gloss, weiße Augen + roter Schnabel rarität-unabhängig, Wasser-Fresnel/Glitzer, ACES-Sättigung) gesichtet.
- **Code-Review (M12-Diff, 5 Dimensionen adversarisch verifiziert):** 2 echte Findings behoben — (1) MEDIUM: Wasser-Funkeln ohne reduced-motion-Gate → `u_shimmerAmp`=0 bei `prefersReducedMotion()`; (2) LOW: `'off'`-Fallback-ACES divergierte gegen das rohe Wasser-ShaderMaterial → entfernt (rendert wie vor M12). Reduced-motion-Probe: `u_shimmerAmp=0` bestätigt.

## Offene Reste (optional, nie auf Kosten der Stabilität)
- [ ] Mehrere Becken/Themes
- [ ] DE/EN-Sprachtoggle
- [ ] `lil-gui` (dev-only, aus Prod getreeshakt)
