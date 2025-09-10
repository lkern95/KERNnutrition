// src/lib/adviceEngine.ts
export type TrendRange = { minPct: number; maxPct: number };
export type Advice = {
  kcalPerDay: number | null;      // empfohlene Tages-Änderung (±), bereits „geclamped“
  targetPct?: number;             // Zielmitte in %/Woche
  deltaPct?: number;              // Ist - Zielmitte
  rationale: string;
  flags: string[];
  stepMode?: 'progressive';
  reviewAfterDays?: number;       // z. B. 10-14 Tage
  rampDays?: number;              // z. B. 3
  phasePercents?: number[];       // z. B. [0.4, 0.7, 1.0]
};


export const KCAL_PER_KG = 7700;      // Näherung
export const ATTENUATION = 0.6;       // Dämpfung (Wasser/Adaptation)
export const ROUND_STEP = 50;
export const CLAMP_SOFT = 350;
export const CLAMP_HARD = 500;
export const MIN_MEASURES = 4;
export const MIN_DAYS = 10;

// Fett-Untergrenzen (pro kg und prozentual)
export const FAT_FLOOR_G_PER_KG = 0.5;
export const FAT_FLOOR_PCT_KCAL = 0.20;

export function roundTo(x: number, step = ROUND_STEP) {
  return Math.round(x / step) * step;
}

export function buildAdviceFromTrend(params: {
  pctPerWeek: number | null;
  range: TrendRange;
  weightKg: number;
  daysCovered: number;
  measuresCount: number;
}): Advice {
  const { pctPerWeek, range, weightKg, daysCovered, measuresCount } = params;
  const flags: string[] = [];

  if (
    pctPerWeek == null || !Number.isFinite(pctPerWeek) ||
    measuresCount < MIN_MEASURES || daysCovered < MIN_DAYS || weightKg <= 0
  ) {
    return {
      kcalPerDay: null,
      rationale: "Zu wenige oder instabile Daten – bitte mind. 4 Messungen über ≥10 Tage erfassen.",
      flags,
    };
  }

  // Zielmitte (z.B. Maintenance: -0.1 bis +0.1 => Mitte ≈ 0.0)
  const targetPct = (range.minPct + range.maxPct) / 2;
  const deltaPct = pctPerWeek - targetPct; // + => zu schnell rauf, - => zu schnell runter

  // Theoretisches kcal/Tag (gedämpft)
  let kcalDay = (deltaPct / 100) * weightKg * (KCAL_PER_KG / 7) * ATTENUATION;

  // Clamp auf sinnvolle Schritte
  const abs = Math.abs(kcalDay);
  if (abs > CLAMP_HARD) {
    flags.push("Sehr starke Abweichung – Schrittweise vorgehen, Wasser/Salz-Schwankungen berücksichtigen.");
    kcalDay = Math.sign(kcalDay) * CLAMP_HARD;
  } else if (abs > CLAMP_SOFT) {
    kcalDay = Math.sign(kcalDay) * CLAMP_SOFT;
  }
  kcalDay = roundTo(kcalDay, ROUND_STEP);

  // Unter 100 kcal → Beobachten statt Eingreifen
  if (Math.abs(kcalDay) < 100) {
    return {
      kcalPerDay: 0,
      targetPct,
      deltaPct,
      rationale: "Abweichung klein – zunächst beobachten und in 10–14 Tagen erneut prüfen.",
      flags,
      stepMode: 'progressive',
      reviewAfterDays: 12,
      rampDays: 3,
      phasePercents: [0.4, 0.7, 1.0],
    };
  }

  return {
    kcalPerDay: Math.trunc(kcalDay),
    targetPct,
    deltaPct,
    rationale: `Trend ${pctPerWeek.toFixed(2)} %/Woche vs. Zielmitte ${targetPct.toFixed(2)} % → Δ≈ ${Math.trunc(kcalDay)} kcal/Tag.`,
    flags,
    stepMode: 'progressive',
    reviewAfterDays: 12,
    rampDays: 3,
    phasePercents: [0.4, 0.7, 1.0],
  };
}

// Bei absurden Trends (wie +77.78 %) wird kcalDay hart gekappt (±500) ⇒ progressive Korrektur statt „0→100“.
