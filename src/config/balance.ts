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
    fogNear: 18, // luftiger heller Tag — Fog erst spät, kaum Culling
    fogFar: 80,
    clearColor: 0x9ed8ff, // heller sonniger Himmel (Comic-Tag)
    ambientIntensity: 1.05, // helle, gleichmäßige Grundausleuchtung
    dirColor: 0xfff4d6, // warmes Sonnenlicht
    dirIntensity: 1.25,
    dirPosition: [3.5, 7, 4] as [number, number, number],
    rimColor: 0x9bd6ff, // helles, kühles Gegenlicht
    rimIntensity: 0.45,
    rimPosition: [-4, 3, -5] as [number, number, number],
  },

  camera: {
    position: [0, 1.85, 2.7] as [number, number, number],
    lookAt: [0, 0.0, -2.4] as [number, number, number],
    aimInstant: true, // true → Blick folgt dem Zeiger sofort (kein Nachfaden)
    aimYawRange: 0.16, // dezenter horizontaler Parallax-Schwenk (rad); 0 = fix
    aimPitchRange: 0.1, // dezenter vertikaler Parallax-Schwenk (rad)
    aimSmooth: 6, // Dämpfung nur im Fallback (aimInstant=false)
  },

  // Direktes Fadenkreuz: zeigt auf den Zeiger, Fang-Strahl geht durch die
  // Zeigerposition (nicht die Bildmitte). Farben signalisieren Fangbarkeit.
  aim: {
    crosshairColorTarget: '#5cf2a0', // grün = Ente fangbar
    crosshairColorNoTarget: 'rgba(255,255,255,0.55)', // neutral = kein Ziel
    crosshairColorCooldown: 'rgba(255,255,255,0.22)', // gedämpft = Cooldown
  },

  basin: {
    radiusX: 4.0,
    radiusZ: 2.35,
    centerZ: -2.2, // Becken liegt vor dem Spieler
    waterY: 0.0,
    rimY: 0.16,
    rimThickness: 0.32,
    waveAmplitude: 0.06,
    waveFrequency: 1.9,
    rippleSpeed: 0.65,
    waterColor: 0x49d6ef, // helles Türkis (Comic-Wasser)
    waterDeepColor: 0x1f93c9, // sattes Blau in der Tiefe
    rimColor: 0xe0a35a, // heller Karamell-Holzrand
    innerWallColor: 0x2f9fce, // helle Innenwand (kein dunkles Loch mehr)
    innerWallHeight: 0.5,
    innerWallDrop: 0.2, // wie weit die Innenwand unter die Wasserlinie reicht
    // Progression: Index = Beckenspeed-Tier (= Rod-Tier)
    duckCountByTier: [8, 10, 12, 14],
    baseRotationSpeed: 0.045, // t/s (≈22 s pro Runde) bei Tier 0
    rotationSpeedMulByTier: [1.0, 1.25, 1.5, 1.8],
    trackInset: 0.72, // Entenbahn-Radius = Beckenradius × Faktor (innerhalb des Rands)
    duckFloatY: 0.08, // Schwimmhöhe über der Wasserlinie
    laneJitter: 0.18, // radialer Versatz (Welteinheiten)
    bobAmplitude: 0.05,
    bobSpeed: 1.25,
    speedVariance: 0.18, // ± individuelle Geschwindigkeit pro Ente
  },

  // Jahrmarkt-Stand-Farben (heller Comic-Tag). Früher hart in StallBuilder.
  stall: {
    wood: 0xd99a52, // helles Karamell-Holz
    woodDark: 0xb87836, // gesättigtes dunkleres Holz
    stripeRed: 0xf2564e, // kräftiges Markisen-Rot
    stripeCream: 0xfff3da, // helles Creme
    floor: 0x86c64e, // grüner Jahrmarkt-Rasen (freundlich, hell)
    back: 0x83bdec, // helle Hintergrundwand (geht in den Himmel über)
  },

  duck: {
    scale: 0.42, // Gesamtgröße
    bodyRadius: 0.5,
    headRadius: 0.3,
    headOffset: [0.0, 0.42, 0.34] as [number, number, number],
    beakColor: 0xff8c1a,
    eyeColor: 0x14202a,
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

  hook: {
    baseReach: 3.2, // Welteinheiten (Tier 0)
    baseWindowMs: 280, // Zeitfenster, in dem eine Ente fangbar ist
    perfectWindowMs: 90, // zentrales Sub-Window -> „Perfect"
    perfectTokenBonus: 0.25, // +25 % Tokens bei Perfect
    castDurationMs: 220, // Tier 0 (geteilt durch castSpeed)
    reelDurationMs: 600, // Tier 0 (geteilt durch reelSpeed)
    cooldownMs: 250, // nach einem Fehlversuch
    catchRadius: 0.45, // räuml. Ziel-Toleranz (Enten-Body ~0.21 + Puffer)
    baseLineStrength: 3, // Tier-0-Linienstärke (Bambus), bis M6 echte Rods kommen
    reelEndScale: 0.6, // Ente schrumpft beim Einholen (Juice)
  },

  rewards: {
    // Token-Spanne [min, max] je Rarität
    tokensByRarity: {
      common: [1, 2],
      uncommon: [3, 5],
      rare: [8, 12],
      epic: [20, 30],
      legendary: [60, 90],
    } as Record<string, [number, number]>,
    firstTimeCodexBonus: 5,
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
  },
};
