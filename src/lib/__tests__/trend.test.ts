
import { describe, it, expect } from 'vitest';
import { computeTrend2Points, isFiniteNumber } from '../trend';

describe('computeTrend2Points', () => {
  it('nicht genug Punkte', () => {
    const res = computeTrend2Points([]);
    expect(res.valid).toBe(false);
    expect(res.kgPerWeek).toBeNull();
    expect(res.pctPerWeek).toBeNull();
    expect(res.reason).toBe('not_enough_points');
  });

  it('gleiches Datum', () => {
    const res = computeTrend2Points([
      { date: '2023-01-01', weight: 80 },
      { date: '2023-01-01', weight: 80.2 },
    ]);
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('zero_days');
  });

  it('Startgewicht 0', () => {
    const res = computeTrend2Points([
      { date: '2023-01-01', weight: 0 },
      { date: '2023-01-08', weight: 0.2 },
    ]);
    expect(res.kgPerWeek).toBeNull();
    expect(res.pctPerWeek).toBeNull();
  });

  it('7 Tage, +0.20 kg bei Startgewicht 80', () => {
    const res = computeTrend2Points([
      { date: '2023-01-01', weight: 80 },
      { date: '2023-01-08', weight: 80.2 },
    ]);
    expect(res.valid).toBe(true);
    expect(res.kgPerWeek).toBeCloseTo(0.2, 2);
    expect(res.pctPerWeek).toBeCloseTo(0.25, 2);
  });
});

describe('isFiniteNumber', () => {
  it('works', () => {
    expect(isFiniteNumber(1)).toBe(true);
    expect(isFiniteNumber(NaN)).toBe(false);
    expect(isFiniteNumber(Infinity)).toBe(false);
    expect(isFiniteNumber(null)).toBe(false);
    expect(isFiniteNumber(undefined)).toBe(false);
  });
});
