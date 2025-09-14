import { describe, it, expect } from 'vitest';
import { supplements } from './supplements';

describe('Supplements Dosis-Berechnung', () => {
  it('Kreatin: immer 5 g/Tag', () => {
    const kreatin = supplements.find(s => s.id === 'creatine')!;
    expect(kreatin.dose({ weightKg: 80 })).toBe('5 g/Tag');
  });

  it('Omega-3: 0.03 g/kg, min 2 g, max 3 g', () => {
    const omega3 = supplements.find(s => s.id === 'omega3')!;
    expect(omega3.dose({ weightKg: 50 })).toBe('2.00 g/Tag'); // 1.5 < 2
    expect(omega3.dose({ weightKg: 70 })).toBe('2.10 g/Tag'); // 2.1
    expect(omega3.dose({ weightKg: 100 })).toBe('3.00 g/Tag'); // 3.0
    expect(omega3.dose({ weightKg: 120 })).toBe('3.00 g/Tag'); // 3.6 > 3
  });

  it('Vitamin D3: immer 2000 IE/Tag', () => {
    const d3 = supplements.find(s => s.id === 'vitaminD3')!;
    expect(d3.dose({ weightKg: 80 })).toBe('2000 IE/Tag');
  });

  it('Magnesium: immer 300–400 mg, abends', () => {
    const mg = supplements.find(s => s.id === 'magnesium')!;
    expect(mg.dose({ weightKg: 80 })).toBe('300–400 mg, abends');
  });

  it('Zink: immer 10–25 mg, morgens', () => {
    const zn = supplements.find(s => s.id === 'zinc')!;
    expect(zn.dose({ weightKg: 80 })).toBe('10–25 mg, morgens');
  });

  it('Whey/Casein: Hinweis nur bei highProtein', () => {
    const whey = supplements.find(s => s.id === 'whey')!;
    expect(whey.dose({ weightKg: 80, highProtein: true })).toContain('hohem Proteinbedarf');
    expect(whey.dose({ weightKg: 80, highProtein: false })).toBe('Optional');
  });
});
