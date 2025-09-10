const KEY = 'kernnutrition:goalKey';

export type GoalKey =
  | 'maintenance'
  | 'lean_bulk'
  | 'conservative_bulk'
  | 'diet'
  | 'aggressive_diet'
  | 'custom';

export function saveGoalPref(key: GoalKey) {
  try { localStorage.setItem(KEY, key); } catch {}
}

export function loadGoalPref(): GoalKey | null {
  try { return (localStorage.getItem(KEY) as GoalKey) || null; } catch { return null; }
}

// Optional: falls dein Rechner-Select Labels statt Keys liefert:
export function mapRechnerLabelToKey(label: string): GoalKey {
  const s = (label || '').toLowerCase();
  if (s.includes('erhaltung') || s.includes('gewicht halten')) return 'maintenance';
  if (s.includes('aggressiv') && s.includes('aufbau')) return 'aggressive_diet' as any; // falls du Aggressiver Aufbau hast -> 'aggressive_bulk'
  if (s.includes('aggressiv') && s.includes('diät')) return 'aggressive_diet';
  if (s.includes('konservativ') || s.includes('aufbau')) return 'conservative_bulk';
  if (s.includes('lean') && s.includes('bulk')) return 'lean_bulk';
  if (s.includes('diät')) return 'diet';
  if (s.includes('benutzerdef')) return 'custom';
  return 'maintenance';
}
