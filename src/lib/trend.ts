export type TrendResult = {
  kgPerWeek: number | null;
  pctPerWeek: number | null;   // Prozent pro Woche
  valid: boolean;
  reason?: 'not_enough_points' | 'zero_days' | 'invalid_weights';
  from?: { date: string; weight: number };
  to?: { date: string; weight: number };
};

export function computeTrend2Points(checkins: { date: string; weight: number }[]): TrendResult {
  const pts = (checkins ?? [])
    .filter(p => Number.isFinite(p?.weight) && p.weight > 0 && !!p.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (pts.length < 2) {
    return { kgPerWeek: null, pctPerWeek: null, valid: false, reason: 'not_enough_points' };
  }

  const a = pts[pts.length - 2];
  const b = pts[pts.length - 1];
  const tA = Date.parse(a.date);
  const tB = Date.parse(b.date);
  const days = (tB - tA) / (1000 * 60 * 60 * 24);

  if (!(days > 0)) {
    // gleicher Tag oder falsche Reihenfolge → keine Trendberechnung
    return {
      kgPerWeek: null, pctPerWeek: null, valid: false, reason: 'zero_days',
      from: a, to: b
    };
  }

  const deltaKg = b.weight - a.weight;
  const weeks = days / 7;
  const kgPerWeek = deltaKg / weeks;

  // Prozent pro Woche relativ zum Startgewicht (a.weight)
  const pctPerWeek = a.weight > 0 ? (deltaKg / a.weight) / weeks * 100 : null;

  return {
    kgPerWeek: Number.isFinite(kgPerWeek) ? kgPerWeek : null,
    pctPerWeek: Number.isFinite(pctPerWeek!) ? pctPerWeek! : null,
    valid: Number.isFinite(kgPerWeek) && days > 0,
    from: a, to: b
  };
}

export function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}
