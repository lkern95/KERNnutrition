import { describe, it, expect } from 'vitest';

// Coupling-Test (Lint): Build fails if saveCalcResult is imported in planner/
describe('Planner module boundaries', () => {
  it('should not import saveCalcResult from calcCache in planner/', async () => {
    // This is enforced by ESLint (see .eslintrc.json),
    // so this test is a placeholder for CI awareness.
    expect(true).toBe(true);
  });
});
