import { describe, it, expect } from 'vitest';
import { computePlan } from '@/lib/planner/computePlan';
import { validatePlanCore } from '@/lib/planner/validatePlan';

const TEST_TOTALS = { kcal: 2000, protein: 150, carbs: 220, fat: 60 };
const BASE_INPUT = {
  wake: '07:00', sleep: '23:00', isTrainingDay: true, mealsTarget: 4, minGapMin: 120, targetGapMin: 180,
  kcal: TEST_TOTALS.kcal, protein: TEST_TOTALS.protein, carbs: TEST_TOTALS.carbs, fat: TEST_TOTALS.fat,
  preset: 'standard', anchor: {
    breakfastAfterWakeMin: 30, breakfastAfterWakeMax: 60, preType: 'auto', preSnackMin: 30, preSnackMax: 60,
    preMealMin: 120, preMealMax: 180, postSnackMin: 0, postSnackMax: 60, postMealMin: 60, postMealMax: 120,
    preSleepMin: 60, preSleepMax: 90
  }
};

const PRESETS = ['standard','amCarbs','pmCarbs','backload','restEven','restAM','even','leanPM'];

describe('Σ-Test pro Preset (3–6 Meals)', () => {
  for (const preset of PRESETS) {
    for (let meals = 3; meals <= 6; meals++) {
      it(`Σ P/C/F exact, kcal ±1 for preset=${preset}, meals=${meals}`, () => {
        const input = { ...BASE_INPUT, preset, mealsTarget: meals };
        const res = computePlan(input);
        const slots = res?.slots ?? res?.meals ?? res?.plan?.meals ?? [];
  const sumP = Math.round(slots.reduce((a: number, s: any) => a + (s.p || 0), 0));
  const sumC = Math.round(slots.reduce((a: number, s: any) => a + (s.c || 0), 0));
  const sumF = Math.round(slots.reduce((a: number, s: any) => a + (s.f || 0), 0));
  const sumKcal = Math.round(slots.reduce((a: number, s: any) => a + (s.kcal || 0), 0));
        expect(sumP).toBe(TEST_TOTALS.protein);
        expect(sumC).toBe(TEST_TOTALS.carbs);
        expect(sumF).toBe(TEST_TOTALS.fat);
        expect(Math.abs(sumKcal - TEST_TOTALS.kcal)).toBeLessThanOrEqual(1);
        // validatePlanCore throws if not valid
        validatePlanCore({ meals: slots }, { kcal: TEST_TOTALS.kcal, p: TEST_TOTALS.protein, c: TEST_TOTALS.carbs, f: TEST_TOTALS.fat });
      });
    }
  }
});
