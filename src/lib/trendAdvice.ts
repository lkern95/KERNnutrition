export type AdviceInput = {
  pctPerWeek: number | null;         // gemessener Trend (%, +/−)
  range: { minPct: number; maxPct: number }; // Zielbereich
  weightKg: number;                  // aktuelles Gewicht
};

export type Advice = {
  status: 'unter' | 'im' | 'ueber' | 'unverfuegbar';
  kcalPerDay: number | null;         // empfohlene Änderung (negativ = reduzieren)
  carbsDeltaG: number | null;        // g/Tag (+/-), 80% der Kcal-Diff
  fatDeltaG: number | null;          // g/Tag (+/-), 20% der Kcal-Diff
  rationale: string;                 // kurzer Text
};

const KCAL_PER_KG = 7700;

function roundToStep(x: number, step = 25) {
  return Math.round(x / step) * step;
}

function clamp(x: number, min: number, max: number) {
  return Math.max(min, Math.min(max, x));
}

export function classify(pct: number | null, range: {minPct:number; maxPct:number}) {
  if (pct == null || !Number.isFinite(pct)) return 'unverfuegbar' as const;
  if (pct < range.minPct) return 'unter' as const;
  if (pct > range.maxPct) return 'ueber' as const;
  return 'im' as const;
}

/**
 * Liefert Kcal-Anpassung pro Tag auf Basis Trend vs. Ziel (Mitte des Bereichs).
 * Vorzeichenkonvention: negatives Ergebnis = Kcal senken, positives = Kcal erhöhen.
 */
export function suggestKcalDeltaPerDay(input: AdviceInput): number | null {
  const { pctPerWeek, range, weightKg } = input;
  if (pctPerWeek == null || !Number.isFinite(pctPerWeek) || !Number.isFinite(weightKg) || weightKg <= 0) return null;

  const targetMid = (range.minPct + range.maxPct) / 2; // %
  const kgPerWeekActual  = (pctPerWeek / 100) * weightKg;
  const kgPerWeekTarget  = (targetMid   / 100) * weightKg;
  const kgDiffPerWeek    = kgPerWeekTarget - kgPerWeekActual; // >0 = zu wenig zunehmen/zu viel abnehmen
  const kcalPerDayRaw    = (kgDiffPerWeek * KCAL_PER_KG) / 7;

  // Sanfte Schritte: clamp ±600 kcal/Tag, runde auf 25er Schritte
  return clamp(roundToStep(kcalPerDayRaw, 25), -600, 600);
}

export function buildAdvice(input: AdviceInput): Advice {
  const status = classify(input.pctPerWeek, input.range);
  if (status === 'unverfuegbar') {
    return {
      status,
      kcalPerDay: null,
      carbsDeltaG: null,
      fatDeltaG: null,
      rationale: 'Trend aktuell nicht berechenbar – trage mehr Check-ins an unterschiedlichen Tagen ein.',
    };
  }
  if (status === 'im') {
    return {
      status,
      kcalPerDay: 0,
      carbsDeltaG: 0,
      fatDeltaG: 0,
      rationale: 'Alles im Zielbereich – bleib bei den aktuellen Kalorien, in 10–14 Tagen erneut prüfen.',
    };
  }

  const kcal = suggestKcalDeltaPerDay(input);
  if (kcal == null || kcal === 0) {
    return {
      status,
      kcalPerDay: null,
      carbsDeltaG: null,
      fatDeltaG: null,
      rationale: 'Trend/Angaben reichen nicht für eine verlässliche Anpassung.',
    };
  }

  // 80% KH, 20% Fett; Protein konstant lassen
  const carbsDeltaG = Math.round((kcal * 0.8) / 4); // 1g KH = 4 kcal
  const fatDeltaG   = Math.round((kcal * 0.2) / 9); // 1g Fett = 9 kcal

  const dir = (input.range.minPct + input.range.maxPct) >= 0 ? 'Aufbau' : 'Diät';
  const action =
    kcal < 0 ? `reduziere deine Kalorien um etwa ${Math.abs(kcal)} kcal/Tag`
             : `erhöhe deine Kalorien um etwa ${kcal} kcal/Tag`;

  const macroTxt =
    `${kcal < 0 ? 'Ziehe' : 'Füge hinzu'} ca. ${Math.abs(carbsDeltaG)} g Kohlenhydrate und ${Math.abs(fatDeltaG)} g Fett pro Tag. Protein konstant halten.`;

  const rationale =
    status === 'ueber'
      ? `${dir}: Du bist über dem Zielbereich. ${action}. ${macroTxt} Prüfe den Trend nach 10–14 Tagen erneut.`
      : `${dir}: Du bist unter dem Zielbereich. ${action}. ${macroTxt} Prüfe den Trend nach 10–14 Tagen erneut.`;

  return { status, kcalPerDay: kcal, carbsDeltaG, fatDeltaG, rationale };
}
