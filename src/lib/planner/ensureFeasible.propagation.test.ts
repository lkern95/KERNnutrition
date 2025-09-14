import { describe, it, expect } from 'vitest';
import { ensureFeasible } from '@/lib/planner/validatePlan';

// Feasible-Propagation: Induziere Konflikt (MealsTarget < Fixpunkte)
describe('ensureFeasible propagation', () => {
  it('sets includePostMeal=false if mealsTarget < fixpoints', () => {
    const input = {
      wake: '07:00', sleep: '23:00', isTrainingDay: true, mealsTarget: 2, minGapMin: 120, targetGapMin: 180,
      kcal: 2000, protein: 150, carbs: 220, fat: 60,
      preset: 'standard' as any, anchor: {
        breakfastAfterWakeMin: 30, breakfastAfterWakeMax: 60, preType: 'auto' as 'auto', preSnackMin: 30, preSnackMax: 60,
        preMealMin: 120, preMealMax: 180, postSnackMin: 0, postSnackMax: 60, postMealMin: 60, postMealMax: 120,
        preSleepMin: 60, preSleepMax: 90
      },
      includePostMeal: true // will be set to false by ensureFeasible
    };
    const feas = ensureFeasible(input);
    expect(feas.inputs.includePostMeal).toBe(false);
  });
});
