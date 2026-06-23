// EINZIGE Quelle für alle Tunables (keine Magic Numbers in der Logik).
// Werte sind bewusst zentral und kommentiert, damit Balancing leicht fällt.

export const BALANCE = {
  loop: {
    maxDt: 0.05, // dt-Clamp (s) gegen große Sprünge nach Tab-Wechsel
  },

  render: {
    pixelRatioCap: 2, // schützt die Füllrate auf Mobile
    fov: 60,
    near: 0.1,
    far: 100,
    fogNear: 18, // luftiger Himmel — Fog erst spät, kaum Culling
    fogFar: 80,
    // Abend-/Golden-Hour-Stimmung (M9): vertikaler Himmel-Verlauf (oben Dämmerblau,
    // unten warmer Horizont) statt flachem Hellblau. Hält die Comic-Helligkeit, wird
    // nur gemütlicher. clearColor = Fog-Ton (am Horizont), Hintergrund ist der Verlauf.
    clearColor: 0xf3c98f, // warmer Horizont-/Fog-Ton
    skyTop: 0x6f8fd6, // Dämmerblau oben
    skyBottom: 0xffd7a3, // warmes Pfirsich am Horizont
    ambientColor: 0xfff0d8, // warmer Grundton (Golden-Hour-Wash über die ganze Szene)
    ambientIntensity: 1.0, // helle, gleichmäßige Grundausleuchtung
    dirColor: 0xffe2b0, // warmes Abendsonnenlicht
    dirIntensity: 1.2,
    dirPosition: [3.5, 7, 4] as [number, number, number],
    rimColor: 0xb6a6ff, // weiches violettes Gegenlicht (Abend)
    rimIntensity: 0.68, // M12: etwas kräftiger für Subway-Surfers-Kantenglanz
    rimPosition: [-4, 3, -5] as [number, number, number],
  },

  camera: {
    // Feste Schräg-runter-Sicht ins ganze Becken (Maus bewegt Ziel/Rute, nicht den Blick).
    position: [0, 2.75, 3.5] as [number, number, number],
    lookAt: [0, -0.15, -2.2] as [number, number, number],
    aimInstant: true, // true → Blick folgt dem Zeiger sofort (kein Nachfaden)
    aimYawRange: 0.05, // nur dezenter Parallax-Schwenk (rad); Zielen läuft über den Wasserpunkt
    aimPitchRange: 0.03, // nur dezenter vertikaler Parallax
    aimSmooth: 6, // Dämpfung nur im Fallback (aimInstant=false)
  },

  // Direktes Fadenkreuz: zeigt auf den Zeiger, Fang-Strahl geht durch die
  // Zeigerposition (nicht die Bildmitte). Farben signalisieren Fangbarkeit.
  aim: {
    crosshairColorTarget: '#5cf2a0', // grün = Ente fangbar
    crosshairColorNoTarget: 'rgba(255,255,255,0.55)', // neutral = kein Ziel
    crosshairColorCooldown: 'rgba(255,255,255,0.22)', // gedämpft = Cooldown
    ringColor: 0x5cf2a0, // Drop-Zone-Ring auf dem Wasser (gleiches Grün wie das Ziel-Fadenkreuz)
    ringOpacity: 0.85,
  },

  basin: {
    radiusX: 4.0,
    radiusZ: 2.35,
    centerZ: -2.2, // Becken liegt vor dem Spieler
    waterY: 0.0,
    rimY: 0.05,
    rimThickness: 0.11, // schlanker Holz-Plankenrand (statt dickem Reifen)
    waveAmplitude: 0.06,
    waveFrequency: 1.9,
    rippleSpeed: 0.65,
    waterColor: 0x49d6ef, // helles Türkis (Comic-Wasser)
    waterDeepColor: 0x127bb8, // M12: sattere, tiefere Blau-Tiefe
    // M12 Wasser-Politur: Fresnel-Himmel-Reflexion + Crest-Glitzer + Caustics-
    // Schimmer (rein im Shader, kein Render-Target → Mobile-sicher).
    waterFresnelColor: 0xc7ecff, // heller Himmel-Tint am flachen Blickwinkel
    waterFresnelPower: 3.5, // höher = schmalerer heller Rand
    waterFresnelStrength: 0.5, // Mischanteil Richtung Himmel
    waterSpecColor: 0xffffff, // Sonnen-Glitzer auf den Wellenkämmen
    waterSpecShininess: 80, // hoch = kleine scharfe Glitzerpunkte
    waterSpecStrength: 0.85, // Glitzer-Intensität (Spitzen blühen leicht in Bloom)
    rimColor: 0xcf9352, // warmer Holz-Plankenton (passend zu den Buden)
    innerWallColor: 0x2f9fce, // helle Innenwand (kein dunkles Loch mehr)
    innerWallHeight: 0.5,
    innerWallDrop: 0.2, // wie weit die Innenwand unter die Wasserlinie reicht
    // Progression: Index = Beckenspeed-Tier (= Rod-Tier). Mehr Enten im Becken
    // (Nutzer-Wunsch „mehr Enten"), gelb dominiert über die Loot-Table.
    duckCountByTier: [10, 12, 14, 16, 18],
    baseRotationSpeed: 0.055, // t/s bei Tier 0 — etwas schneller = Enten als Ziel anspruchsvoller
    rotationSpeedMulByTier: [1.0, 1.25, 1.5, 1.8, 2.0],
    trackInset: 0.72, // Entenbahn-Radius = Beckenradius × Faktor (innerhalb des Rands)
    duckFloatY: 0.08, // Schwimmhöhe über der Wasserlinie
    laneJitter: 0.18, // radialer Versatz (Welteinheiten)
    bobAmplitude: 0.05,
    bobSpeed: 1.25,
    speedVariance: 0.18, // ± individuelle Geschwindigkeit pro Ente
  },

  // Jahrmarkt-Stand-Farben (heller Comic-Tag). Früher hart in StallBuilder.
  // Geometrie/Layout liegt bewusst inline im StallBuilder (Projekt-Konvention seit M1:
  // Farben zentral, Konstruktions-Koordinaten beim Mesh) — hier nur die Tunables-Farben.
  stall: {
    wood: 0xd99a52, // helles Karamell-Holz
    woodDark: 0xb87836, // gesättigtes dunkleres Holz
    stripeRed: 0xf2564e, // kräftiges Markisen-Rot
    stripeCream: 0xfff3da, // helles Creme
    floor: 0x86c64e, // grüner Jahrmarkt-Rasen (freundlich, hell)
    // Hintergrund-Budenreihe: farbige Rückwand-Paneele je Bude (zyklisch)
    boothPanels: [0x4fb0c6, 0xf2c14e, 0xef798a] as number[], // Teal · Sonnengelb · Rosa
    // Fernkulisse — flache, KONTRASTREICHE Silhouetten (kein Sky-Match, sonst
    // unsichtbar): distinkte Comic-Farben + schwarze Outline lesen klar gegen den Himmel.
    ferrisColor: 0x6f7bd0, // Indigo-Blau (Riesenrad-Gerüst) — deutlich gegen Himmel
    ferrisCabin: 0xffd36b, // warme gelbe Gondeln (Pop)
    tentRoof: 0xe8717a, // sattes Zelt-Rot
    tentTip: 0xfaf0dd, // helle Zeltspitze/Fähnchen
    tentBase: 0xf3ece0, // helle Zeltwand
    // Lichterketten (emissive Glühbirnen, abwechselnd warm/cool)
    bulbWarm: 0xfff1b0, // warmes Glühbirnen-Gelb
    bulbCool: 0xfff7e6, // helles Cremeweiß
    // Reaktive Welt (M9): Riesenrad-Drehung + pulsierende/aufblitzende Lichterketten.
    ferrisRpm: 1.6, // Umdrehungen pro Minute (gemächliche Jahrmarkt-Drehung)
    bulbPulseAmp: 0.22, // Helligkeits-Pulsieren der Birnen (± um 1.0)
    bulbPulseSpeed: 2.4, // Pulsier-Frequenz (rad/s)
    bulbFlashGain: 0.9, // zusätzliche Helligkeit beim Fang-Aufblitzen
    bulbFlashDecaySec: 0.5, // Aufblitzen klingt über diese Zeit ab
  },

  // Zuschauer-Menge (M9): kleine Comic-Figuren im Bogen hinter dem Becken, die
  // wippen und bei jedem Fang jubelnd hochspringen. Eine InstancedMesh (Toon) +
  // eine Outline (wie Enten). Ganze Figur trägt die Kleidungsfarbe (instanceColor).
  crowd: {
    count: 14, // Figuren (1 InstancedMesh + 1 Outline)
    scale: 0.8, // Gesamtgröße der Figur
    arcWidth: 9.4, // x-Spannweite des Zuschauerbogens
    backZ: -5.4, // Basis-z (hinter dem Becken, vor der Budenreihe bei z=-7)
    bowDepth: 1.7, // Bogen: die Ränder kommen Richtung Kamera nach vorn
    floorY: -0.33, // Fußhöhe (knapp über dem Boden bei -0.35)
    posJitter: 0.28, // zufällige Positions-Streuung (Welteinheiten)
    scaleJitter: 0.14, // ± Größen-Varianz pro Figur
    // Kräftige Comic-Kleidungsfarben (ganze Figur ist einfarbig → liest als Menge)
    clothColors: [
      0xf2564e, 0x4fb0c6, 0xf2c14e, 0xef798a, 0x8e6fd0, 0x5ec56a, 0xff9f43, 0xf25fa0,
    ] as number[],
    faceColor: 0x1c2230, // dunkle Augenpunkte
    bobAmp: 0.045, // Leerlauf-Wippen (Welteinheiten)
    bobSpeed: 2.2, // Wipp-Frequenz
    cheerJump: 0.5, // Sprunghöhe beim Jubeln (Welteinheiten)
    cheerFreq: 9, // Hüpf-Frequenz während des Jubels (rad/s)
    cheerDecaySec: 1.1, // Jubel klingt über diese Zeit ab
  },

  // Himmel-Deko (M9): aufsteigende Ballons + ziehende Vögel hinter der Welt.
  // Zwei InstancedMeshes (1 Draw-Call je). Bewegung rein aus `elapsed` abgeleitet
  // (deterministisch, kein Aufintegrieren). Reduced-motion → statisch.
  skyDeco: {
    balloonCount: 7,
    balloonScale: 0.62,
    balloonColors: [0xf2564e, 0x4fb0c6, 0xf2c14e, 0xef798a, 0x8e6fd0, 0x5ec56a] as number[],
    balloonZ: -3.5, // über der hinteren Beckenhälfte (einzige sichtbare Deko-Zone)
    balloonSpreadX: 7, // x-Streuung: zu den Rändern hin, hält die Beckenmitte freier
    balloonYMin: 0.9, // sichtbares Band (NDC ≤ ~0.46; darüber verdeckt die Markise)
    balloonYMax: 1.8, // oben driften sie hinter die Markise und wrappen unten neu („losgelassen")
    balloonRiseSpeed: 0.35, // Welteinheiten/s nach oben (wrappt am oberen Rand)
    balloonSwayAmp: 0.3, // seitliches Pendeln
    balloonSwaySpeed: 0.7,
    birdCount: 6,
    birdColor: 0x2a3340, // dunkle Silhouette (liest klar gegen den hellen Himmel)
    birdScale: 0.5,
    birdY: 1.35, // über der hinteren Beckenhälfte, skimmt durchs Bild (unter der Markise)
    birdZ: -3.8,
    birdRowGap: 0.22, // vertikaler Versatz zwischen den Vögeln
    birdSpeed: 1.5, // Welteinheiten/s seitlich (wrappt über die Breite)
    birdSpreadX: 8, // halbe Flugbreite (x ∈ [-spreadX, +spreadX])
    birdBobAmp: 0.12, // sanftes Auf/Ab im Flug
    birdBobSpeed: 2.0,
  },

  duck: {
    scale: 0.42, // Gesamtgröße
    bodyRadius: 0.5,
    headRadius: 0.36, // M12: größerer runder Kopf (näher am Gummiente-Foto)
    headOffset: [0.0, 0.46, 0.32] as [number, number, number],
    beakColor: 0xff3b2f, // M12: glänzendes Rot (Gummiente) statt Orange
    eyeColor: 0x141c28, // Pupille (dunkel); Sklera separat (eyeScleraColor)
    eyeScleraColor: 0xf7f8fc, // M12: weißes Auge — eigenes Detail-Mesh, NICHT von instanceColor getönt
    // M12: Gummi-Gloss (onBeforeCompile auf der Toon-Basis). Weicher Specular-
    // Hotspot (Blinn-Phong) + Fresnel-Himmel-Tint am Rand — kein envMap, Cel-
    // Bänder bleiben. lightDir/colors in VIEW-Space (Kamera fast fix).
    gloss: {
      lightDir: [0.25, 0.55, 1.0] as [number, number, number], // View-Space-Glanzrichtung (rechts-oben-vorn)
      color: 0xffffff, // weißer Glanzfleck
      shininess: 16, // niedrig = großer weicher Fleck (Gummi-Look)
      strength: 0.55, // Glanz-Intensität (zu hoch → bläht über Bloom-Threshold aus)
      fresnelColor: 0xbfe6ff, // kühler Himmel-Tint am Silhouetten-Rand
      fresnelPower: 3.0, // höher = schmalerer Rand
      fresnelStrength: 0.32,
    },
    // Schwierigkeit je Rarität: seltenere Enten driften schneller (schwerer zu
    // verfolgen) — zusätzlich zur kleineren Fang-Zone (hook.catchMulByRarity).
    // Bewusst moderat, damit Legendary fordernd, aber fair fangbar bleibt.
    speedMulByRarity: {
      common: 1.0,
      uncommon: 1.08,
      rare: 1.16,
      epic: 1.24,
      legendary: 1.32,
      heilig: 1.45, // heilige Ente driftet am schnellsten (Hardcore-Chase)
    } as Record<string, number>,
  },

  // Cel-Shading: diskrete Helligkeitsstufen (Comic-Bänder). Kein 0.0, damit die
  // Raritätsfarbe auch im Schatten sichtbar bleibt.
  toon: {
    gradientStops: [0.45, 0.72, 1.0] as number[],
  },

  // Schwarze Comic-Kontur um die Enten (Inverted-Hull, als 2. InstancedMesh).
  outline: {
    enabled: true,
    color: 0x16202a, // sehr dunkles Blau-Schwarz (weicher als reines Schwarz)
    thickness: 0.02, // Aufblähung entlang der Normalen (Objektraum-Einheiten)
  },

  round: {
    durationSec: 75,
    lowTimeWarnSec: 10,
  },

  // Fang-Serie (M9): aufeinanderfolgende Fänge bauen einen Token-Multiplikator auf,
  // ein Miss/Snap bricht ihn. Badge erscheint ab `showAtStreak`. `tiers` aufsteigend
  // nach `streak`; der Multiplikator ist der höchste erreichte Tier (sonst ×1).
  combo: {
    showAtStreak: 2, // ab dieser Serienlänge erscheint das HUD-Badge
    tiers: [
      { streak: 2, mult: 1.25 },
      { streak: 4, mult: 1.5 },
      { streak: 6, mult: 2 },
      { streak: 9, mult: 3 },
    ] as { streak: number; mult: number }[],
  },

  hook: {
    // Räumliches Fang-Modell: Maus → Wasserpunkt W; Halten senkt den Haken zu W,
    // Loslassen mit Ente nahe W fängt (kein Timing-Fenster).
    lowerDurationMs: 260, // Haken-Senkdauer 0→1 (Dip)
    armProgress: 0.6, // ab diesem Dip zählt ein Fang (Haken „im Wasser")
    catchRadius: 0.42, // räumliche Fang-Toleranz um W (XZ) — Basis (× catchMulByRarity)
    perfectRadius: 0.14, // Ente so nah an W → Perfect (Basis, × catchMulByRarity)
    // Schwierigkeit je Rarität: multipliziert catchRadius UND perfectRadius.
    // Seltener = kleinere Fang-Zone = präziser zielen. (gelb=common, grün=uncommon, blau=rare)
    catchMulByRarity: {
      common: 1.0,
      uncommon: 0.62,
      rare: 0.4,
      epic: 0.3,
      legendary: 0.24,
      heilig: 0.14, // winzigste Fang-Zone — präzisestes Zielen nötig
    } as Record<string, number>,
    basinInset: 0.96, // W aufs Wasser-Oval clampen (knapp innerhalb des Rands)
    perfectTokenBonus: 0.25, // +25 % Tokens bei Perfect
    reelDurationMs: 600, // Einhol-Dauer (Ente → Rutenspitze)
    cooldownMs: 250, // kurze Sperre nach einem Versuch
    baseLineStrength: 3, // Tier-0-Linienstärke (zu schwere Ente reißt ab), bis M6 echte Rods
    reelEndScale: 0.6, // Ente schrumpft beim Einholen (Juice)
    // Rute-Feel: schwenkt deutlich Richtung Zeiger; Haken senkt/hebt gedämpft.
    dipDampLambda: 9, // Dämpfung Senken/Heben (höher = strammer)
    swingAmount: 0.5, // Rute-Neigung Richtung Zeiger (rad) — deutlich sichtbar
    swingDampLambda: 8, // Dämpfung des Schwenks
  },

  // Game-Feel-FX (rein additiv, keine Gameplay-Wirkung). Durations in ms.
  juice: {
    splash: {
      poolSize: 4, // gleichzeitige Ringe (Draw-Call-Budget)
      durationMs: 520, // Lebensdauer eines Rings (ausdehnen + ausblenden)
      startRadius: 0.12, // Welteinheiten, nah am Haken
      endRadius: 0.95, // dehnt sich ~auf die Fang-Zone aus
      tubeRadius: 0.02, // Ring-Dicke (Highlight nutzt 0.03)
      radialSegments: 6, // low-poly, mobil-günstig
      tubularSegments: 28,
      yOffset: 0.045, // knapp über waterY (Highlight nutzt +0.04)
      startOpacity: 0.8, // fadet auf 0
      color: 0xeaffff, // helle Schaumfarbe auf Türkis (blüht in Bloom)
    },
    catchPop: {
      // Gehakte Ente überschwingt kurz über 1.0, bevor sie auf reelEndScale (0.6)
      // einläuft. Settle-Ziel ist BALANCE.hook.reelEndScale (Single Source).
      peakScale: 1.18, // Overshoot (saftig & spürbar)
      peakAt: 0.22, // Anteil des Reel-Progress p am Peak
    },
    shake: {
      // Mini-Screenshake (additiver, abklingender Kamera-Rotations-Offset, rad).
      catchIntensity: 0.01, // Basis-Impuls bei common
      byRarity: {
        common: 1,
        uncommon: 1.4,
        rare: 2.0,
        epic: 2.7,
        legendary: 3.5,
        heilig: 4.5,
      } as Record<string, number>,
      perfectBonus: 0.008, // Extra-Punch bei Perfect
      maxIntensity: 0.05, // Deckel (kein Übel-Shake)
      frequency: 38, // Schwing-Frequenz (rad/s) des abklingenden Shakes
      dampLambda: 12, // Abklingen zu 0 (höher = schneller)
    },
    perfectFlash: {
      // Reticle-Puls bei Perfect (Canvas-2D, goldener Expand-Ring).
      durationMs: 260,
      maxRadiusPx: 46, // dehnt sich über den Dip-Ring (RING_R=30) hinaus
      color: '#ffcf3f', // gleiches Gold wie das Perfect-Fadenkreuz
    },
    hud: {
      countUpMs: 360, // Score + Tokens zählen hoch statt zu springen
    },
    glow: {
      // Additives Halo um seltene Enten (füttert Bloom). Nur bei aktivem postFx.
      // Helligkeit = emissive × emissiveIntensity × intensity (KEIN [0,1]-Clamp → HDR):
      // seltener = heller, epic/legendary überschreiten die Bloom-Threshold deutlich,
      // uncommon/rare bleiben ein sanfter farbiger Schimmer.
      minEmissive: 0.1, // ab uncommon (RARITY_DEFS.emissiveIntensity) leuchten
      haloScale: 1.05, // Halo-Durchmesser (Welteinheiten), etwas größer als die Ente
      intensity: 3.5, // Helligkeitsfaktor × emissiveIntensity
    },
    sparkle: {
      // Gold-Funken-Burst bei epic/legendary-Fang (additiv, füttert Bloom).
      // Ein Burst zur Zeit (seltene Top-Momente); Partikel poppen aus dem Fangpunkt
      // nach außen/oben und fallen mit Gravitation zurück, während sie ausblenden.
      count: 14, // Partikel pro Burst (1 InstancedMesh)
      durationMs: 720,
      size: 0.05, // Partikelgröße (Welteinheiten)
      spread: 0.9, // horizontale Reichweite (Welteinheiten)
      rise: 0.7, // vertikaler Anfangs-Pop
      gravity: 1.8, // zieht die Partikel zurück (Welteinheiten/s²)
      color: 0xffe066, // helles Gold
      hdrBoost: 1.6, // HDR-Faktor (Farbkanäle > 1) → überschreitet die Bloom-Threshold (vgl. glow.intensity)
    },
    haptics: {
      // Mobile-Vibration (navigator.vibrate; auf Desktop fehlt die API → No-op). Nur wenn nicht reduced-motion.
      catchMs: 18, // kurzer Impuls bei jedem Fang
      perfectPattern: [12, 30, 14] as number[], // Doppel-Buzz bei Perfect
    },
  },

  // Postprocessing-Qualität (Bloom). Mobile (coarse pointer) wird herabgestuft.
  quality: {
    postFx: 'high' as 'off' | 'low' | 'high', // Desktop-Default
    coarsePointerPostFx: 'low' as 'off' | 'low' | 'high', // Mobile: Bloom in halber Auflösung
    bloomResolutionScale: { low: 0.5, high: 1.0 } as Record<string, number>,
    bloomStrength: 0.65, // Abend: Lichterketten/Ferris glühen etwas kräftiger
    bloomRadius: 0.4,
    bloomThreshold: 0.9, // hoch → nur die hellsten Elemente blühen (heller Comic-Tag bleibt klar)
    // M12 Grading (Subway-Surfers-Look): ACES-Filmic-Tonemapping + Sättigungs-
    // Boost im finalen Grade-Pass (ersetzt OutputPass, läuft NACH dem Bloom →
    // Bloom-Threshold unberührt). Im 'off'-Fallback (kein Composer) macht der
    // Renderer das ACES direkt (ohne Sättigungs-Boost — vernachlässigbar).
    gradeExposure: 1.08, // Belichtung vor dem Tonemapping
    gradeSaturation: 1.22, // > 1 = sattere Farben (Comic-Pop)
  },

  // Upgrade-Shop (M6): Engine-Mapping-Konstanten. Der Katalog-Inhalt (Ruten/
  // Upgrades inkl. Preise/Stats) lebt als Daten-of-Record in `data/rods.ts`
  // (Präzedenz: RARITY_DEFS in data/ducks.ts) — hier nur die reinen Tunables,
  // die festlegen, WIE Stats auf die Engine wirken.
  shop: {
    // Magnet: zieht den Wasserpunkt W pro Auflösung anteilig zur nächsten Ente
    // im Magnet-Radius (0 = an W, 1 = ganz zur Ente). Bewusst moderat, damit es
    // assistiert statt auto-aimt.
    magnetPullFraction: 0.45,
    // Glück: skaliert die Loot-Gewichte selten-wärts. Effektives Gewicht =
    // weight × (1 + luck × luckWeightFactor)^rang (rang: common=0 … legendary=4).
    luckWeightFactor: 1.0,
    // Preis-Eskalation stapelbarer Upgrades: jede weitere Stufe kostet mehr
    // (Standard in Aufbau-Spielen). Preis(Stufe n, 0-indiziert) = Basispreis ×
    // growth^n. Bsp. Schnellrolle (35): 35 → 60 → 102.
    upgradePriceGrowth: 1.7,
  },

  rewards: {
    // Token-Spanne [min, max] je Rarität
    tokensByRarity: {
      common: [1, 2],
      uncommon: [3, 5],
      rare: [8, 12],
      epic: [20, 30],
      legendary: [60, 90],
      heilig: [200, 300], // Hardcore-Belohnung für die seltenste Ente
    } as Record<string, [number, number]>,
    firstTimeCodexBonus: 5,
    // Wissens-Crossover (M11): mit dieser Wahrscheinlichkeit gibt eine Ente eine
    // Karte aus einem HÖHEREN Tier preis (auch eine gewöhnliche Ente bringt so
    // „hier und da" Top-Wissen). Tokens bleiben rarität-gebunden (unabhängig davon).
    crossoverChance: 0.12,
  },

  audio: {
    masterGain: 0.5,
  },

  save: {
    storageKey: 'quack-and-catch:v1',
    schemaVersion: 1,
    debounceMs: 400, // Schreib-Zusammenfassung; Flush bei pagehide sichert den Rest
  },

  ui: {
    hudThrottleMs: 100,
    cardRevealMs: 700,
    toastMs: 1600, // Anzeigedauer kurzer Hinweis-Einblendungen (z. B. Linie gerissen)
  },
};
