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
