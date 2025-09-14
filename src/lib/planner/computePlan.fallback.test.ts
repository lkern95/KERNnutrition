import { computePlan } from '@/lib/planner/computePlan';
import { makePlannerInputs } from 'test/helpers/makePlannerInputs';
import { describe, it, expect } from 'vitest';

describe('computePlan anchor fallback', () => {
  it('füllt fehlendes anchor zur Laufzeit mit Defaults', () => {
    // @ts-expect-error: anchor absichtlich weggelassen
    const { slots } = computePlan({ ...makePlannerInputs(), anchor: undefined } as any);
    expect(slots.length).toBeGreaterThan(0);
  });
});
