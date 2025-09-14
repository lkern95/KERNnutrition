import { describe, it, expect } from 'vitest';
import { computePlan } from '@/lib/planner/computePlan';
import { ANCHOR_DEFAULT } from '@/adapters/plannerSources';

const presets = ['standard','even','amCarbs','pmCarbs','backload','restEven','restAM','leanPM'] as const;

describe('planner invariants', () => {
  it.each(presets)('ΣP/ΣC/ΣF/Σkcal == Totals (%s)', (preset) => {
    const totals = { kcal: 2700, protein: 180, carbs: 330, fat: 70 };
    const { slots } = computePlan({
      wake:'06:30', sleep:'23:00',
      gymStart:'17:30', gymEnd:'19:00',
      isTrainingDay: preset.startsWith('rest') ? false : true,
      mealsTarget: 6, minGapMin:120, targetGapMin:180,
      preset,
      ...totals, bodyWeightKg: 85,
  anchor: ANCHOR_DEFAULT,
    } as any);

    const sP = slots.reduce((a,s)=>a+s.p,0);
    const sC = slots.reduce((a,s)=>a+s.c,0);
    const sF = slots.reduce((a,s)=>a+s.f,0);
    const sK = slots.reduce((a,s)=>a+s.kcal,0);
    expect(sP).toBe(totals.protein);
    expect(sC).toBe(totals.carbs);
    expect(sF).toBe(totals.fat);
    expect(sK).toBe(4*totals.protein + 4*totals.carbs + 9*totals.fat);
  });
});
