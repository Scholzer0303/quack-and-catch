# DESIGN — Quack & Catch (Game-Design-Doc)

## Pitch
Ein als Jahrmarkt-Fahrgeschäft getarntes Lernspiel. First-Person an einem Stand, davor ein ovaler Wasserkanal mit treibenden Gummienten. Der Spieler hakt Enten im richtigen Moment (Timing-Skill), zieht sie hoch und erhält je nach Rarität einen echten, gestuften Claude-/Claude-Code-Tipp + Tokens. Tokens kaufen bessere Angeln → seltenere Enten / schnelleres Becken. Spannungsbogen für den Walkthrough: erste Fänge → erste Rare → Shop → bessere Angel → Jagd auf Legendary.

## Core-Loop
angeln → Belohnung (Tipp-Karte + Tokens) → Shop (bessere Angel/Upgrade) → seltenere Enten → wiederholen. Runde mit Timer; Score = Summe der Entenwerte (+ Codex-Fortschritt).

## Steuerung
- First-Person, **fixe** Standpose. Maus/Touch bewegt Blick + Angel.
- Angel/Haken im Vordergrund (Hand-Feel). Zielen über Pointer-Position; Auslösen per Klick/Tap.
- Vereinheitlicht über **Pointer Events** (Maus + Touch + Pen). Pointer-Lock **nie** zwingend.

## Hak-Mechanik (Skill)
- Haken über eine vorbeitreibende Ente bringen, im **Timing-Window** auslösen, einholen.
- `baseWindowMs` 280 — Zeitfenster, in dem eine Ente „fangbar" am Aim-Ray vorbeizieht.
- `perfectWindowMs` 90 — zentrales Sub-Window → „Perfect": +25 % Tokens, Extra-Juice.
- Fehlversuch: kurzer Cooldown `hookCooldownMs` 250 (fair, kein Spam).
- `lineStrength`-Gate: zu schwere Enten reißen ab (Feedback) — nie Softlock.

## Raritäten
Visuell klar unterscheidbar; Loot-Table-getrieben; seltene erscheinen seltener / erst mit besseren Angeln.

| Rarität | Score-Wert | Gewicht (Linie) | Farbe | Emissive |
|---|---|---|---|---|
| Common | 10 | 1 | Gelb `0xffd24a` | – |
| Uncommon | 25 | 2 | Grün `0x4ad27a` | schwach 0.1 |
| Rare | 60 | 3 | Blau `0x4a9bd2` | 0.25 |
| Epic | 140 | 4 | Lila `0xb24ad2` | 0.5 + Glint |
| Legendary | 350 | 5 | Gold `0xffcf3f` | 0.9 + Sparkle |

## Loot-Tables (relative Gewichte je Rod-Tier; bei Roll normalisiert)
| Rod-Tier | Common | Uncommon | Rare | Epic | Legendary |
|---|---|---|---|---|---|
| 0 (Start) | 70 | 23 | 6 | 1 | 0 |
| 1 | 55 | 28 | 12 | 4 | 1 |
| 2 | 42 | 30 | 18 | 8 | 2 |
| 3 | 30 | 30 | 23 | 13 | 4 |

`luck` verschiebt pro Punkt ~6 % Gewicht von Common nach Epic+Legendary (gedeckelt), berechnet in `derived.effectiveLootTable`.

## Token-Rewards (Range, mit RNG gerollt)
Common 1–2 · Uncommon 3–5 · Rare 8–12 · Epic 20–30 · Legendary 60–90. `firstTimeCodexBonus` +5 beim ersten Freischalten einer Karte. Perfect-Fang: +25 %.

## Rods & Upgrades
| id | Name | Preis | Tier | reach | castSpeed | reelSpeed | timing× | luck | magnet | lineStr |
|---|---|---|---|---|---|---|---|---|---|---|
| rod_bamboo | Bambusrute (Start) | 0 | 0 | 3.2 | 1.0 | 1.0 | 1.0 | 0 | 0 | 3 |
| rod_carbon | Carbonrute | 120 | 1 | 4.0 | 1.3 | 1.3 | 1.1 | 0 | 0 | 4 |
| rod_magnet | Magnetrute | 320 | 2 | 4.6 | 1.4 | 1.5 | 1.15 | 1 | 1.0 | 5 |
| rod_gold | Goldrute | 750 | 3 | 5.2 | 1.6 | 1.8 | 1.3 | 2 | 1.6 | 5 |

| id | Name | Preis | Effekt | wiederholbar | maxStacks |
|---|---|---|---|---|---|
| up_luck | Glücksamulett | 200 | luck +1 | ja | 3 |
| up_magnet | Magnetmodul | 180 | magnetRadius +0.8 | ja | 2 |
| up_line | Stahlsehne | 150 | lineStrength +1 | nein | 1 |
| up_reel | Schnellrolle | 160 | reelSpeed +0.25 | ja | 2 |

## Progression-Kopplung
`equippedRod.tier` wählt **gleichzeitig** Becken-Speed-Tier (Entenzahl 8/10/12/14 + Rotation ×[1.0, 1.25, 1.5, 1.8]) **und** Loot-Table. Bessere Angel = sichtbar volleres/schnelleres Becken + bessere Drops.

## Becken / Szene
Ovales Becken `radiusX` 4.0 / `radiusZ` 2.4. Basis-Rotation 0.045 t/s (≈22 s/Runde) bei Tier 0. Lane-Jitter ±0.12, Bob-Amplitude 0.05. Rundendauer 75 s, Low-Time-Warnung bei 10 s. Kamera FOV 60, Pose (0, 1.6, 3.2). pixelRatio-Cap 2.0.

## Audio (WebAudio-Synthese)
master 0.5; cast = kurzer Noise-Burst; hook = 660 Hz Blip; perfect = 880→1320 Hz Arp; reel = steigender Saw 200→500 Hz; reward = Dur-Dreiklang je Tier; fail = 160 Hz Square-Thunk. Mute persistent; Unlock bei erster Geste.

## Bildschirme
Startscreen · Spiel-HUD (Score/Tokens/Timer/aktuelle Angel) · Shop · Tipp-Codex · Runden-Zusammenfassung/Game-Over.

---

## Tipp-Codex — Inhaltskonzept
Echte, **faktisch korrekte** Tipps zu Claude & Claude Code (Lernapp). Eigener Wortlaut, geprüft gegen offizielle Docs. Feld `kategorie` zusätzlich zu `tier`; Codex filtert nach beidem. Tier = Schwierigkeit (Common=Basics → Legendary=Expert).

**Kategorien:**
1. Grundlagen & Einstieg
2. Projekt-Setup & CLAUDE.md
3. Kontext & Effizienz (/clear, /compact, Kosten, Plan-Modus)
4. Skills & Slash-Commands
5. MCP & Integrationen (GitHub, Vercel)
6. Memory & Agentic OS (Subagents, Hooks)
7. Workflows & Qualität (Planen, TDD, Code-Review, Worktrees, parallele Agents)
8. Prompting-Meisterschaft
9. Pro / Business / Skalierung

**Zielverteilung (~54):** Common ~12 · Uncommon ~12 · Rare ~12 · Epic ~10 · Legendary ~8.

**Datenschema** (`src/data/tips.ts`): `{ id: string; tier: DuckRarity; kategorie: string; titel: string; text: string }`.
