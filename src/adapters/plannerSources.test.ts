
import { vi, it, expect, beforeEach, describe } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as plannerSources from './plannerSources';

// Mock getEffective to return fixed totals
vi.mock('@/lib/derived', () => ({
  getEffective: () => ({ dailyKcal: 2800, P: 180, C: 340, F: 80 })
}));

// Mock localStorage for persistence

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string): string | null => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value + ''; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    getAll: () => store
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

beforeEach(() => {
  window.localStorage.clear();
});

describe('plannerSources', () => {
  it('useTotals returns numbers from getEffective', () => {
    const { result } = renderHook(() => plannerSources.useTotals());
    const totals = result.current;
    expect(typeof totals.kcal).toBe('number');
    expect(totals.kcal).toBe(2800);
    expect(totals.protein).toBe(180);
    expect(totals.carbs).toBe(340);
    expect(totals.fat).toBe(80);
  });

  it('usePlannerInputs persists to localStorage', () => {
    const { result } = renderHook(() => plannerSources.usePlannerInputs());
    const [, setInp] = result.current;
    act(() => {
      setInp({ wake: '06:30', sleep: '23:00' });
    });
    const raw = window.localStorage.getItem('kernNutrition_planer_inputs');
    expect(raw).not.toBeNull();
    const stored = raw ? JSON.parse(raw) : {};
    expect(stored.wake).toBe('06:30');
    expect(stored.sleep).toBe('23:00');
  });
});
