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
    fogNear: 9,
    fogFar: 42,
    clearColor: 0x0b2942, // tiefes Nachtblau (Jahrmarkt-Stimmung)
    ambientIntensity: 0.75,
    dirIntensity: 1.05,
    dirPosition: [3.5, 7, 4] as [number, number, number],
    rimColor: 0x5fa8d8, // kühles Gegenlicht für Tiefe
    rimIntensity: 0.35,
    rimPosition: [-4, 3, -5] as [number, number, number],
  },

  camera: {
    position: [0, 1.85, 2.7] as [number, number, number],
    lookAt: [0, 0.0, -2.4] as [number, number, number],
    aimYawRange: 0.32, // max. horizontaler Blick-Offset (rad) durch Zielen
    aimPitchRange: 0.18, // max. vertikaler Blick-Offset (rad)
    aimSmooth: 6, // Glättungsfaktor fürs Zielen
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
    waterColor: 0x2f7fb5,
    waterDeepColor: 0x123a59,
    rimColor: 0x6b4a2f, // Holzrand
    innerWallColor: 0x10384f, // dunkle Innenwand (Tiefe)
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

  duck: {
    scale: 0.42, // Gesamtgröße
    bodyRadius: 0.5,
    headRadius: 0.3,
    headOffset: [0.0, 0.42, 0.34] as [number, number, number],
    beakColor: 0xff8c1a,
    eyeColor: 0x14202a,
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
  },

  ui: {
    hudThrottleMs: 100,
    cardRevealMs: 700,
  },
};
