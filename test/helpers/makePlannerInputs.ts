import { ANCHOR_DEFAULT } from '@/adapters/plannerSources';
import type { PlannerInputs } from '@/adapters/plannerSources';

export function makePlannerInputs(overrides: Partial<PlannerInputs> = {}): PlannerInputs {
  const base: PlannerInputs = {
    wake: '06:30',
    sleep: '23:00',
    isTrainingDay: true,
    gymStart: '17:30',
    gymEnd: '19:00',
    mealsTarget: 6,
    minGapMin: 120,
    targetGapMin: 180,
    kcal: 2700,
    protein: 180,
    carbs: 330,
    fat: 70,
    preset: 'standard',
    anchor: { ...ANCHOR_DEFAULT },
  };
  // Anchor separat mergen, damit Teil-Overrides funktionieren
  const anchor = { ...base.anchor, ...(overrides as any).anchor };
  return { ...base, ...overrides, anchor };
}
