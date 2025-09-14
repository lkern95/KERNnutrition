
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mocks (müssen vor dem Import der Hooks stehen!)
vi.mock('@/store/appStore', () => ({
  useAppStore: (selector: any) => selector({ profile: { age: 30, height: 180, weight: 80, gender: 'male' } }),
}));
vi.mock('@/lib/derived', () => ({
  getEffective: () => ({ dailyKcal: 2800, P: 180, C: 340, F: 80 }),
}));
vi.mock('@/lib/calcCache', () => ({
  loadCalcResult: () => undefined,
}));

import { useTotals, useProfile, usePlannerInputs } from './plannerSources';

describe('plannerSources hooks', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });


  it('useTotals: nimmt getEffective als Primärquelle', async () => {
    const { result } = renderHook(() => useTotals());
    expect(result.current).toEqual({ kcal: 2800, protein: 180, carbs: 340, fat: 80 });
  });

  it('useTotals: fällt auf calcCache zurück, wenn derived fehlt', async () => {
    // Override Mocks für diesen Test
    vi.doMock('@/lib/derived', () => ({ getEffective: () => undefined }));
    vi.doMock('@/lib/calcCache', () => ({
      loadCalcResult: () => ({ dailyKcal: 2500, protein_g: 160, carbs_g: 300, fat_g: 70 }),
    }));
    // Neu importieren, damit die neuen Mocks greifen
    const { useTotals: useTotalsFallback } = await import('./plannerSources');
    const { result } = renderHook(() => useTotalsFallback());
    expect(result.current).toEqual({ kcal: 2500, protein: 160, carbs: 300, fat: 70 });
  });

  it('useProfile: liest aus Zustand-Store', async () => {
    const { result } = renderHook(() => useProfile());
    expect(result.current).toEqual({ age: 30, height: 180, weight: 80, gender: 'male' });
  });

  it('usePlannerInputs: liest/schreibt LocalStorage (kernNutrition_planer_inputs)', async () => {
    // Seed
    localStorage.setItem('kernNutrition_planer_inputs', JSON.stringify({
      wake: '06:30', sleep: '22:30', gymStart: '17:00', gymEnd: '18:30',
      isTrainingDay: true, mealsTarget: 5, minGapMin: 120, targetGapMin: 180,
    }));
    const { result } = renderHook(() => usePlannerInputs());
    // liest initial
    expect(result.current[0].sleep).toBe('22:30');

    // schreiben
    act(() => result.current[1]({ sleep: '23:00' }));
    const stored = JSON.parse(localStorage.getItem('kernNutrition_planer_inputs')!);
    expect(stored.sleep).toBe('23:00');
  });
});
