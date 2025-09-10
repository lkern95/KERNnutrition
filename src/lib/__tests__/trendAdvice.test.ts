import { buildAdvice } from '../trendAdvice';

describe('buildAdvice', () => {
  it('Aggressiver Aufbau: pct=2.17, range 0.50–0.75, weight=80', () => {
    const advice = buildAdvice({ pctPerWeek: 2.17, range: { minPct: 0.5, maxPct: 0.75 }, weightKg: 80 });
    expect(advice.status).toBe('ueber');
    expect(advice.kcalPerDay).toBeLessThan(0);
    expect(typeof advice.carbsDeltaG).toBe('number');
    expect(typeof advice.fatDeltaG).toBe('number');
  });

  it('Lean Bulk: pct=0.10, range 0.25–0.50, weight=80', () => {
    const advice = buildAdvice({ pctPerWeek: 0.10, range: { minPct: 0.25, maxPct: 0.5 }, weightKg: 80 });
    expect(advice.status).toBe('unter');
    expect(advice.kcalPerDay).toBeGreaterThan(0);
  });

  it('Diät: pct=−1.20, range −1.00 bis −0.50, weight=80', () => {
    const advice = buildAdvice({ pctPerWeek: -1.20, range: { minPct: -1.0, maxPct: -0.5 }, weightKg: 80 });
    expect(advice.status).toBe('unter');
    expect(advice.kcalPerDay).toBeGreaterThan(0);
  });

  it('pct=null → unverfuegbar', () => {
    const advice = buildAdvice({ pctPerWeek: null, range: { minPct: 0.25, maxPct: 0.5 }, weightKg: 80 });
    expect(advice.status).toBe('unverfuegbar');
    expect(advice.kcalPerDay).toBeNull();
  });

  it('Clamp/Rundung: |kcalPerDay| ≤ 600, Schritte 25er Raster', () => {
    // Large difference
    const advice = buildAdvice({ pctPerWeek: -10, range: { minPct: 0.5, maxPct: 0.75 }, weightKg: 100 });
    expect(Math.abs(advice.kcalPerDay!)).toBeLessThanOrEqual(600);
    expect(advice.kcalPerDay! % 25).toBe(0);
  });
});
