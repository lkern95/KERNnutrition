import { describe, it, expect } from 'vitest';
import { useTotals } from '@/adapters/plannerSources';

// Immutability-Test (Runtime)
describe('useTotals immutability', () => {
  it('should freeze the totals object', () => {
    const t = useTotals();
    expect(() => { (t as any).kcal = 0; }).toThrow();
  });
});
