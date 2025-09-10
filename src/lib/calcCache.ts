// NEU: Quellen-Typ
export type CalcSource = 'rechner' | 'checkin' | 'planer' | 'import' | 'unknown';
const KEY = 'kernnutrition:calcResult';

export type CalcResult = {
  dailyKcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  trainingDayKcal?: number | null;
  restDayKcal?: number | null;
  savedAt: string;
  // NEU: Quelle
  source?: CalcSource;
};

const isFiniteNum = (v: any): v is number => typeof v === 'number' && Number.isFinite(v);

export function saveCalcResult(res: Partial<CalcResult> & { source?: CalcSource }) {
  // Vorherige Quelle beibehalten, falls nicht explizit übergeben
  const prev = loadCalcResult();
  const data: CalcResult = {
    dailyKcal: isFiniteNum(res.dailyKcal) ? res.dailyKcal : 0,
    protein_g: isFiniteNum(res.protein_g) ? res.protein_g : 0,
    carbs_g:   isFiniteNum(res.carbs_g)   ? res.carbs_g   : 0,
    fat_g:     isFiniteNum(res.fat_g)     ? res.fat_g     : 0,
    trainingDayKcal: isFiniteNum(res.trainingDayKcal ?? null as any) ? (res.trainingDayKcal as number) : null,
    restDayKcal:     isFiniteNum(res.restDayKcal ?? null as any)     ? (res.restDayKcal as number)     : null,
    savedAt: new Date().toISOString(),
    source: res.source ?? prev?.source ?? 'rechner', // Standard: „Rechner“
  };
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function loadCalcResult(): CalcResult | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const j = JSON.parse(raw);
    if (!isFiniteNum(j?.dailyKcal)) return null;
    return {
      dailyKcal: Number(j.dailyKcal),
      protein_g: Number(j.protein_g ?? 0),
      carbs_g:   Number(j.carbs_g   ?? 0),
      fat_g:     Number(j.fat_g     ?? 0),
      trainingDayKcal: isFiniteNum(j.trainingDayKcal) ? j.trainingDayKcal : null,
      restDayKcal:     isFiniteNum(j.restDayKcal)     ? j.restDayKcal     : null,
      savedAt: j.savedAt || new Date().toISOString(),
      source: (j.source as CalcSource) || undefined, // Alt-Daten bleiben kompatibel
    };
  } catch { return null; }
}

export function clearCalcResult() {
  localStorage.removeItem(KEY);
}
