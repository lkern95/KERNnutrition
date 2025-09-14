// AnchorTiming-Defaults (Minuten)
export const ANCHOR_DEFAULT = {
  breakfastAfterWakeMin: 30, breakfastAfterWakeMax: 60,
  preType: 'auto' as 'auto'|'snack'|'meal',
  preSnackMin: 30, preSnackMax: 60,
  preMealMin: 120, preMealMax: 180,
  postSnackMin: 0,  postSnackMax: 60,
  postMealMin: 60,  postMealMax: 120,
  preSleepMin: 60,  preSleepMax: 90,
};
import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_PLANNER_INPUTS, LS_KEY } from '@/lib/planner/defaults';
import { useAppStore } from '@/store/appStore';
import { getEffective } from '@/lib/derived';
import { loadCalcResult } from '@/lib/calcCache';

export type CalcTotals = Readonly<{ kcal: number; protein: number; carbs: number; fat: number }>;
export type Profile = { age?: number; height?: number; weight?: number; gender?: 'male'|'female'|string };
// neu: Presets inkl. Abend fettarm
export type DistributionPreset =
  'standard'   | // Pre 30 / Post 40 / Rest gleich
  'even'       | // alles gleich
  'amCarbs'    | // morgens höher
  'pmCarbs'    | // abends höher
  'backload'   | // stark abends (Post/Abend)
  'restEven'   | // Ruhetag: gleich
  'restAM'     | // Ruhetag: morgens höher
  'leanPM';      // **Abend fettarm** (Fett-Deckel abends)
// Neue Struktur für Timing-Feinsteuerung (Minuten)
export type AnchorTiming = {
  breakfastAfterWakeMin: number;  // 30
  breakfastAfterWakeMax: number;  // 60
  preType: 'snack' | 'meal' | 'auto'; // Snack=30–60 vor WO, Meal=120–180 vor WO
  preSnackMin: number;            // 30
  preSnackMax: number;            // 60
  preMealMin: number;             // 120
  preMealMax: number;             // 180
  postSnackMin: number;           // 0
  postSnackMax: number;           // 60
  postMealMin: number;            // 60
  postMealMax: number;            // 120
  preSleepMin: number;            // 60
  preSleepMax: number;            // 90
};

export type PlannerInputs = {
  wake: string;
  sleep: string;
  gymStart?: string;
  gymEnd?: string;
  isTrainingDay: boolean;
  mealsTarget: number;
  minGapMin: number;
  targetGapMin: number;
  preset: DistributionPreset;      // << hierüber steuern
  anchor: AnchorTiming;
};


type AnyInputs = Partial<PlannerInputs> & Record<string, any>;

function loadInputs(): PlannerInputs {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_PLANNER_INPUTS;
    const parsed = JSON.parse(raw);
    // defensiv mergen – aber nichts „korrigieren“
    return {
      ...DEFAULT_PLANNER_INPUTS,
      ...(parsed || {}),
    };
  } catch {
    return DEFAULT_PLANNER_INPUTS;
  }
}

function saveInputs(state: any) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
}

// Optional: Tageskalorien je nach Training/Ruhetag
export function useTotals(): CalcTotals {
  let eff: any;
  try { eff = getEffective(); } catch { eff = undefined; }
  const cache = (() => { try { return loadCalcResult?.(); } catch { return undefined; } })();
  const [inp] = usePlannerInputs();
  let kcal = Math.round(eff?.dailyKcal ?? cache?.dailyKcal ?? 0);
  if (inp?.isTrainingDay === true && eff?.trainKcal) {
    kcal = Math.round(eff.trainKcal);
  } else if (inp?.isTrainingDay === false && eff?.restKcal) {
    kcal = Math.round(eff.restKcal);
  }
  const protein = Math.round(eff?.P ?? cache?.protein_g ?? 0);
  const carbs   = Math.round(eff?.C ?? cache?.carbs_g   ?? 0);
  const fat     = Math.round(eff?.F ?? cache?.fat_g     ?? 0);
  // Freeze the return value for runtime immutability
  return Object.freeze({ kcal, protein, carbs, fat });
}

export function useProfile(): Profile {
  const p = useAppStore(s => s.profile) as any;
  return { age: p?.age, height: p?.height, weight: p?.weight, gender: p?.gender };
}

export function usePlannerInputs(): [any, (patch: Partial<any>) => void, () => void] {
  const [st, setSt] = useState<any>(() => ({ ...DEFAULT_PLANNER_INPUTS, ...loadInputs() }));
  // Debounced persist (250ms) to avoid localStorage spam
  const timer = useRef<number | null>(null);
  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => saveInputs(st), 250);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [st]);
  const set = (patch: Partial<any>) => setSt((prev: any) => ({ ...prev, ...patch }));
  const reset = () => setSt({ ...DEFAULT_PLANNER_INPUTS, ...loadInputs() });
  return [st, set, reset];
}
