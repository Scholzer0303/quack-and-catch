# Pipeline — Nächste Ausbaustufen (Roadmap M13–M18)

> **Stand:** Audit nach Meilenstein **M12**. Die hier beschriebenen Stufen sind **noch nicht umgesetzt** — sie sind die priorisierte Roadmap für den Weiterbau. Die abgegebene Version ist der M12-Stand (live, getestet).

Grundlage: ein Gesamt-Audit (Architektur, UI/UX, Grafik) plus ein Design-Review aus fünf Perspektiven (Game-Design, Technical-Art, UI/UX, Art-Direction, Mobile/Perf). Leitlinie aus dem Audit: die **Toon-/Comic-Identität bleibt** — sie wird premium poliert, nicht ersetzt. Alle Änderungen prozedural, mobil-sicher (~60 fps), `prefers-reduced-motion` respektiert, UI auf Deutsch, Tunables zentral in `src/config/balance.ts`.

## Leit-These

Mut auf **drei Signaturen** statt vieler Kosmetik:

1. **Skill-Gate ab der ersten Ente** — ein kurzes Timing-Fenster auf dem bestehenden räumlichen Fang (der Dip-Ring im `Reticle` wird zum schließenden Timing-Ring) plus engere Commons. Das ist die Trennlinie zwischen „netter Clicker" und „eine Runde noch".
2. **Eigenständige Identität um ein Element** — der Belohnungs-Reveal als **Kirmes-Los/Prize-Ticket** (cremefarbenes Papier, Perforation, „GEWONNEN"-Stempel), getragen von einem eigenen SVG-Icon-Satz (ersetzt alle Emoji) und einer warmen Kirmes-Palette statt dunklem Glas.
3. **Erdung + responsive Kamera** — der FOV-Fix macht die Bude auf dem Handy vollständig sichtbar, Schatten lassen die Szene auf dem PC hochwertig wirken. Der Combo-Multiplikator wirkt auf den **sichtbaren** Punktestand, nicht nur auf die Tokens.

## Quick Wins (hohe Wirkung, kleiner Aufwand — zuerst)

- Responsive horizontale FOV in `CameraRig.resize()` (behebt den Hochkant-Beschnitt auf dem Handy).
- Safe-Area-Insets (`env(safe-area-inset-*)`) für HUD/Steuerung/Overlays.
- Combo-Multiplikator auf den sichtbaren Punktestand + pulsierendes Badge je Stufe.
- Fliegende Trefferzahlen am Fangpunkt (`+60` / `PERFEKT!` / `×3`).
- `HemisphereLight` statt `AmbientLight` (kostenloser Volumen-Eindruck).
- Tap-Ziele ≥ 44 px; `@media (pointer: coarse)` → 48 px.
- Vignette im bestehenden Grade-Shader (nahezu gratis).
- Mobile `pixelRatio` ~1.5 statt 2 (Rechenbudget für Schatten/Schaum).

---

## M13 — Mobile-Korrektheit & Performance-Fundament  [P0]

Ziel: Auf dem Smartphone vollständig sichtbar, fingertauglich, ~60 fps. Chirurgisch, ohne die Art-Identität anzufassen.

- **Responsive horizontale FOV:** in `CameraRig` die vertikale FOV aus einer Ziel-Horizontal-FOV ableiten — `vfov = 2·atan(tan(hfovTarget/2) / aspect)`, geklemmt auf `fovMax`; gleiche Rechnung im Konstruktor statt FOV-Literal. Neue Tunables `render.hfovTarget` (~78°), `render.fovMax` (~82°). → `CameraRig.ts`, `balance.ts`.
- **Portrait-Framing:** bei sehr schmalem Seitenverhältnis (< ~0.62) die Kamera leicht entlang der Blickrichtung zurückziehen bzw. die Ziel-FOV so wählen, dass das Becken ~85 % der Breite füllt. → `CameraRig.ts`, `balance.ts`.
- **Safe-Area-Insets:** `--qc-safe-*` aus `env(safe-area-inset-*)`; HUD, Steuerung, Rod-Chip und Overlays referenzieren sie; `dvh` statt `100%`. → `styles.css`, `index.html`.
- **Tap-Ziele ≥ 44 px:** Mute/Pause (aktuell ~41,6 px), Codex/Shop-Chips, Intro-Skip, Kauf-Buttons; bei Touch 48 px, ≥ 8 px Abstand. → `styles.css`.
- **Per-Gerät-Performance:** `pixelRatio`-Cap mobil 1,5 vs. Desktop 2; dreistufiger Qualitäts-Resolver (high/medium/low) anhand Touch + `hardwareConcurrency`/`deviceMemory`; optionaler FPS-Wächter, der bei anhaltend < 60 fps **einmalig** eine Stufe heruntergeht. → `RendererManager.ts`, `Game.ts`, `balance.ts`.
- **Orientierungs-Hinweis (kein Lock):** dismissibler „Querformat empfohlen"-Hinweis bei Hochkant; `visualViewport`-Resize abonnieren (iOS-Toolbar-Reflow). → `Game.ts`, `UIRoot.ts`, `styles.css`.
- **Aim-Mapping verifizieren:** sicherstellen, dass der Wasserpunkt durch die Live-Kamera unprojiziert wird, damit Fadenkreuz und Fang-Ring nach der FOV-Änderung deckungsgleich bleiben. → `FishingRod.ts`, `HookRaycaster.ts`.

## M14 — Skill-Gate & Treffer-Feedback  [P0]

Ziel: Schon die erste Ente verlangt Präzision; gutes Spiel ist sichtbar belohnt; der Spielfluss wird nicht mehr von einem Modal pro Fang unterbrochen.

- **Schwierigkeits-Tuning (hinter Flag):** `catchRadius` 0,42 → ~0,30, `perfectRadius` 0,14 → ~0,11, Grund-Rotationsgeschwindigkeit 0,055 → ~0,075; die heilige Ente bleibt winzig. → `balance.ts`.
- **Timing-Fenster im Fang:** ab Erreichen des Haken-Tiefpunkts öffnet ein ~280 ms „Biss"-Fenster; Loslassen außerhalb = Fehlversuch (bricht die Combo). Hinter `hook.timingGateEnabled`. → `FishingRod.ts`, `balance.ts`.
- **Timing-Ring im Reticle:** den vorhandenen Dip-Ring zu einem schließenden Timing-Ring umbauen, Sweet-Spot = Perfect; bei reduzierter Bewegung statisch. → `Reticle.ts`, `FishingRod.ts`.
- **Combo neu tarieren + auf den Punktestand wirken:** Stufen ×1,5 (3) / ×2 (5) / ×3 (8) / ×4 (12); Multiplikator auf den **sichtbaren** HUD-Score, Badge wächst je Stufe, steigender Audio-Pitch. → `ComboSystem.ts`, `HUD.ts`, `RewardSystem.ts`, `balance.ts`.
- **Fliegende Trefferzahlen:** am Fangpunkt eingeblendet (`+N` / `PERFEKT!` / `×N`), Farbe je Rarität; bei reduzierter Bewegung ohne Flug. → `HUD.ts`, `fx/`, `RewardSystem.ts`.
- **Belohnungs-Fluss entkoppeln:** gewöhnliche Fänge ohne Modal (nur fliegende Zahl + Codex-Eintrag/Toast); das Reveal nur für **neue** Tipps und seltene+ Enten; die Summary bündelt die Runden-Tipps. → `CardReveal.ts`, `RewardSystem.ts`, `SummaryScreen.ts`, `balance.ts`.
- **Längere Sperre nach Fehlversuch** als nach Treffer — bestraft gieriges Loslassen, schafft Risiko/Belohnung. → `FishingRod.ts`, `balance.ts`.

## M15 — Premium-Diorama: Schatten, Licht, Post, Wasser  [P1]

Ziel: der größte wahrgenommene Qualitätssprung — Enten/Objekte geerdet, Toon-Flächen mit Volumen, die Bude liest sich als gepflegtes Miniatur-Diorama. PC nutzt echte Schatten, Mobile bleibt bei 60 fps.

- **HemisphereLight** statt reinem Ambient (Himmel warm / Boden kühl), Key leicht senken, damit Glanzlichter nicht über die Bloom-Schwelle blasen. → `SceneManager.ts`, `balance.ts`.
- **Kontaktschatten:** mobil weiche Blob-Schatten (instanziert, ~1 Draw-Call) unter Enten/Objekten; auf dem PC echte Schattenkarte (PCFSoft, enge Frustum, sorgfältige Bias-Werte). → `DuckFactory.ts`, `SceneManager.ts`, `RendererManager.ts`, `balance.ts`.
- **Echtes PC-„high"-Tier** als ein Schalter, den Renderer/Szene/Post lesen: echte Schatten + Vignette + Hemisphere + stärkeres Bloom + Voll-Auflösung. Mobile „low": Blob-Schatten, halbauflösendes Bloom. → `balance.ts`, `SceneManager.ts`, `Postprocessing.ts`.
- **Vignette** im bestehenden Grade-Shader (dezent, beide Plattformen ~gratis). → `Postprocessing.ts`, `balance.ts`.
- **Wasser-Politur:** lappender Schaumrand und ein Tiefen-Read im Shader (ohne zusätzliches Render-Target); der Glitzer bleibt bewegungsreduziert-gated. → `world/shaders/water.ts`, `BasinBuilder.ts`, `balance.ts`.
- **Himmel & Nebel:** warmer Sonnen-Glow im Verlaufshimmel, exponentieller Nebel für weicheren Übergang. → `SceneManager.ts`, `balance.ts`.
- **4-Band-Toon-Ramp** für große Objekte (Stall/Rand) bei mehr Form; Enten behalten die 3-Band-Ramp für den klaren Comic-Look. → `DuckFactory.ts`, `balance.ts`.

## M16 — UI-Identität: eigenständige Kirmes-Designsprache  [P1]

Ziel: eine unverwechselbare Entenangel-Bude-Identität — eigener Icon-Satz statt Emoji, warme Palette statt dunklem Glas, ein einprägsames Signatur-Element.

- **Eigener Inline-SVG-Icon-Satz** (`src/ui/icons.ts`): einheitliche Strichstärke, `currentColor`; ersetzt **alle** Emoji-Icons (Ton, Pause, Angel, Combo, Token, Codex, Shop, Ziel …). → alle UI-Dateien.
- **Kirmes-Palette:** warme Tokens (Creme, Lack-Rot, Messing, Lampen-Glow, Tinte); Nachtblau nur noch als Abdunkler. WCAG-AA-Kontrast bleibt. → `styles.css`, `index.html`.
- **Signatur — Belohnung als Kirmes-Los:** cremefarbenes Ticket statt dunkler Glaskarte, perforierter Stanzrand, „GEWONNEN"-Stempel, Losnummer-Streifen, Rarität als farbiges Siegel; sanftes Hochschieben, bewegungsreduziert nur Fade. → `CardReveal.ts`, `styles.css`.
- **Display-Schrift** (akzeptierter Tradeoff): eine lokal gebündelte Subset-`woff2` für Titel/Punktestand; Fließtext bleibt System-Schrift. → `index.html`, `styles.css`.
- **Steuer-Cluster** statt zweier freischwebender Kreis-Buttons; differenzierte Oberflächen je Screen statt einer wiederholten Glaskarte; Buttons im Bude-Schild-Look; Intro ohne Emoji. → `styles.css`, `HUD.ts`, `MuteButton.ts`, `IntroScreen.ts`.
- **Modal-Barrierefreiheit:** `role="dialog"` + `aria-modal`, Fokus-Falle und -Rückgabe. → Codex/Shop/Summary.

## M17 — Spannungsbogen, erstes „Wow" & Bindung  [P1]

Ziel: aus der flachen Runde einen Eskalations-Bogen mit Endspurt-Höhepunkt machen; jede erste Session enthält einen Aha-Moment.

- **Eskalation innerhalb der Runde:** die Enten-Geschwindigkeit steigt über die Rundenzeit (unabhängig vom Angel-Tier). → `DuckSpawner.ts`, `balance.ts`.
- **Endspurt** (letzte ~15 s): kurzzeitig höhere Seltenheits-Chance + Punkte-/Token-Verdopplung + visuelles/akustisches Signal + „Endspurt!"-Hinweis. → `DuckSpawner.ts`, `HUD.ts`, `balance.ts`.
- **Erstes „Wow":** eine seltene Spezial-Ente, die bereits mit der Starter-Angel landbar ist. → `data/ducks.ts`, `data/rods.ts`, `DuckSpawner.ts`, `balance.ts`.
- **Live-Rekordmarke + Runden-Statistiken:** der Punktestand blitzt beim Überbieten des Highscores; die Summary zeigt beste Combo / Perfects / seltenste Ente. → `HUD.ts`, `SummaryScreen.ts`.
- **(P2)** Combo in den Endspurt tragen erhöht den End-Multiplikator; subtiles Ausweichen seltener Enten (bewegungsreduziert deaktiviert).

## M18 — Desktop-Layout & Modal-Robustheit  [P2]

Ziel: Auf großen Monitoren als bewusst komponiertes Desktop-Layout lesen (kein aufgeblasenes Handy-UI); Modals auf kurzen Querformat-Handys nie scroll-gefangen.

- **Echte Breakpoints** (≥ 768 px, ≥ 1200 px): größere Karten/Abstände, mehrspaltige Codex-/Shop-Ansicht, gedeckelte HUD-Insets. → `styles.css`, `HUD.ts`, `SummaryScreen.ts`.
- **HUD-Vereinheitlichung** als ein zusammenhängendes Schild (Score | Timer | Tokens), Combo am Score integriert, dünne Zeit-Leiste. → `HUD.ts`, `styles.css`.
- **Modal-Scroll-Sicherheit:** Primäraktion auf kurzen Bildschirmen immer erreichbar (Sticky-Footer/`dvh`). → `styles.css`.
- **Daumen-Zone auf dem Handy:** Hauptaktion am unteren Rand; Desktop behält Eck-/Inline-Platzierung. → `styles.css`, `SummaryScreen.ts`, `IntroScreen.ts`.

---

## Risiken & bewusst Vermiedenes

**Wichtige Risiken:** Skill-Gate-Überkorrektur (Tuning hinter Flag, zuerst, auf der ersten Ente prüfen) · Mobile-Performance (echte Schatten nur Desktop, FPS-Wächter) · Identitäts-Scope (Icon-Satz + Palette zuerst, das Los als einziges Hero-Element) · Schatten-Artefakte (enge Frustum, Bias) · Aim-Versatz nach Reframe.

**Bewusst nicht:** harter Orientierungs-Lock (Softlock-Risiko) · echte Tiefenunschärfe (zu teuer mobil) · Wasser-Ripples pro Ente · Ausweichen aller Enten · tägliche Streak-Meta · ganze Schrift-Familie selbst hosten · Umbau des soliden EventBus/Core-Loops.

## Reihenfolge bei Fortsetzung

**M13 → M14** (beide P0) zuerst: Mobile entsperren + echtes Skill-Game. Dann **M15 → M16** (visueller Sprung + eigenständige Identität — der eigentliche Hebel). Dann **M17** (Spannungsbogen/Bindung), **M18** zuletzt. Jeder Meilenstein ist einzeln auslieferbar; pro Meilenstein gilt das Qualitäts-Gate (`typecheck`/`lint`/`build`/`preview`/`test` grün, keine Konsolenfehler, ~60 fps auf PC und Handy, `prefers-reduced-motion`) plus Code-Review vor dem Push.
