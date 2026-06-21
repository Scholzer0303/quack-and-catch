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

## M1 — First-Person-Szene
- [ ] `core/RendererManager` + `SceneManager` + `CameraRig` (FP-Pose, pixelRatio-Cap, Resize)
- [ ] `core/GameLoop` (geclampter dt) + `core/Game`
- [ ] `config/balance.ts`-Skelett + `utils/math` (Oval, lerp/clamp) + `utils/rng`
- [ ] `world/StallBuilder` (Stand/Theke/Markise/Backdrop)
- [ ] `world/BasinBuilder` (ovaler Kanal) + Wasser-Shader (animiert)
- [ ] `world/DuckFactory` + `systems/DuckSpawner` (8 rotierende Enten, InstancedMesh)
- [ ] `world/RodBuilder` (Angel/Schnur/Haken im Vordergrund)
- [ ] `events/EventBus` (typisiert)

## M2 — Hak-Mechanik
- [ ] `systems/InputSystem` (Pointer Events, Aim normalisiert)
- [ ] `systems/HookRaycaster` (Aim-Ray vs. gecachte Bounding-Spheres)
- [ ] `systems/FishingRod` State-Machine (aim→cast→hook→reel→land)
- [ ] Timing-Window + Perfect-Sub-Window
- [ ] Reel-Animation + `removeAndRespawn`
- [ ] Miss-Handling + Cooldown, Aim-Reticle/Hover-Highlight
- [ ] `lineStrength`-Gate (schwere Enten reißen ab, kein Softlock)

## M3 — Belohnung + HUD + Screens
- [ ] `data/ducks.ts` Raritäten + `DuckFactory`-Materialien; Loot-Roll (Tier 0)
- [ ] `data/tips.ts` erste ~12 Karten (Deutsch)
- [ ] `systems/RewardSystem` (Rarität→Tokens + Tipp) + `systems/Economy`
- [ ] `ui/UIRoot` + `styles.css` + `ui/HUD` (Score/Tokens/Timer/Rod)
- [ ] `core/GameStateMachine` + `ui/StartScreen` + Rundentimer
- [ ] `ui/CardReveal` (Karten-Reveal-Animation) + `ui/SummaryScreen`

## M4 — Save + Deploy-Check
- [ ] `types/state.ts` final + `systems/SaveSystem` (versioniert, debounced, korruptionssicher)
- [ ] Persistenz: Tokens/Rod/Tipps/Stats/Settings; Laden beim Boot; Mute persistent
- [ ] README ausbauen (Pitch, Features, Controls, Design Notes)
- [ ] Prod-Härtung (pixelRatio-Cap, dispose-Audit, Error-Boundary), `build`+`preview` aus `dist/`

## M4.5 — Vercel-Live-Deploy (nach MVP)
- [ ] GitHub-Repo mit Vercel verbinden (Auto-Deploy von `main`), Live-URL holen
- [ ] Live-URL in README + STATUS eintragen

## M5 — Tipp-Codex-Screen
- [ ] `data/tips.ts` auf ~50–60 Karten ausbauen (alle Tiers + Kategorien, geprüft)
- [ ] `ui/CodexScreen` (Grid locked/unlocked, Tier-Farbe + Kategorie-Filter, Detail, Fortschritt)
- [ ] Codex in State-Machine + `firstTimeCodexBonus`

## M6 — Upgrade-Shop
- [ ] `data/rods.ts` Katalog (Rods + Upgrades)
- [ ] `Economy` Kaufvalidierung/Equip/Upgrade-Stacking
- [ ] `ui/ShopScreen` (Preise, owned/equipped, Affordability, Buy/Equip)
- [ ] Rod-Stats wirken in `FishingRod`/`HookRaycaster` (reach/speed/timing/magnet/luck/line)

## M7 — Progression koppeln
- [ ] Rod-Tier → Becken-Speed (Entenzahl + Rotation)
- [ ] Rod-Tier → Loot-Table-Auswahl + `luck`-Shift
- [ ] Magnet zieht nahe Enten; Legendary-Gating

## M8 — Juice + Audio
- [ ] `systems/AudioManager` (Synth: cast/hook/perfect/reel/reward/fail, First-Gesture-Unlock, Mute)
- [ ] Visuelle Juice (Catch-Pop, Splash-Ripple, Perfect-Flash, Legendary-Sparkle, HUD-Count-up, Low-Time-Pulse)
- [ ] Camera-Punch, Mobile-Haptik, reduced-motion respektieren

## M9 — Stretch (nur bei Zeit, nie auf Kosten der Stabilität)
- [ ] Mehrere Becken/Themes
- [ ] DE/EN-Sprachtoggle
- [ ] Lokale Bestenliste
- [ ] Mehr Enten/Tipps; optional `lil-gui` (dev-only, aus Prod getreeshakt)
