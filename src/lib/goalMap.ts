
// src/lib/goalMap.ts

export type GoalKey =
  | 'maintenance'
  | 'lean_bulk'
  | 'conservative_bulk'
  | 'diet'
  | 'aggressive_diet'
  | 'aggressive_bulk' // optional, falls genutzt
  | 'custom';

export type TrendRangePct = { minPct: number; maxPct: number };

// Deutsche Labels (wie in "Rechner")
export const GOAL_LABELS: Record<GoalKey, string> = {
  maintenance: 'Erhaltung (TDEE) – Gewicht halten',
  lean_bulk: 'Lean Bulk (+200–350 kcal)',
  conservative_bulk: 'Konservativer Aufbau (+150–250 kcal)',
  diet: 'Diät (−300–500 kcal)',
  aggressive_diet: 'Aggressive Diät (−600 kcal, kurzfristig!)',
  aggressive_bulk: 'Aggressiver Aufbau (+0.5–0.75%/Woche)',
  custom: 'Benutzerdefiniert',
};

// Optional kurze Hinweise
export const GOAL_NOTE: Partial<Record<GoalKey, string>> = {
  aggressive_diet: '⚠️ Nur kurzfristig und mit Betreuung.',
};

// Mapping Ziel → Prozentbereich pro Woche
export function goalToTrendRange(goal: GoalKey): TrendRangePct {
  switch (goal) {
    case 'maintenance':
      return { minPct: -0.1, maxPct: 0.1 }; // ~Gewicht halten
    case 'lean_bulk':
      return { minPct: 0.25, maxPct: 0.5 }; // Lean Bulk
    case 'conservative_bulk':
      return { minPct: 0.2, maxPct: 0.4 }; // konservativer Aufbau
    case 'aggressive_bulk':
      return { minPct: 0.5, maxPct: 0.75 }; // aggressiver Aufbau
    case 'diet':
      return { minPct: -0.5, maxPct: -1.0 }; // moderate Diät
    case 'aggressive_diet':
      return { minPct: -1.0, maxPct: -1.5 }; // aggressive Diät
    case 'custom':
    default:
      return { minPct: 0, maxPct: 0 };
  }
}

// (optional, falls irgendwo genutzt)
export function classifyTrend(pctPerWeek: number | null, range: TrendRangePct) {
  if (pctPerWeek == null || !Number.isFinite(pctPerWeek)) return 'unknown' as const;
  if (pctPerWeek < range.minPct) return 'below' as const;
  if (pctPerWeek > range.maxPct) return 'above' as const;
  return 'in' as const;
}
