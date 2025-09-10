import { FAT_FLOOR_G_PER_KG, FAT_FLOOR_PCT_KCAL } from './adviceEngine';
import { useAppStore } from '../store/appStore';

// Vorschau mit Fett-Untergrenzen
export function buildPreviewWithFloors(current: { kcal: number; P: number; C: number; F: number }, kcalDelta: number) {
  const eff = getEffective();
  const weightKg = (useAppStore.getState()?.profile?.weight ?? 0) as number;

  const newKcal = Math.max(1200, Math.round(current.kcal + kcalDelta));
  const proteinG = current.P;

  const fatFloorByKg  = Math.ceil(weightKg * FAT_FLOOR_G_PER_KG);
  const fatFloorByPct = Math.ceil((newKcal * FAT_FLOOR_PCT_KCAL) / 9);
  const fatFloorG     = Math.max(fatFloorByKg, fatFloorByPct, 20);

  let fatG = Math.round(current.F);
  if (kcalDelta < 0 && fatG < fatFloorG) fatG = fatFloorG;

  const kcalAfterPF = newKcal - (proteinG * 4 + fatG * 9);
  const carbsG = Math.max(0, Math.round(kcalAfterPF / 4));

  return {
    daily: { kcal: newKcal, P: proteinG, C: carbsG, F: fatG },
    train: eff.trainKcal ? { kcal: eff.trainKcal + kcalDelta } : null,
    rest:  eff.restKcal  ? { kcal: eff.restKcal  + kcalDelta } : null,
  };
}

// Rampen-Vorschau (Bruchteile des Deltas)
export function buildRampedPreviews(current: { kcal: number; P: number; C: number; F: number }, kcalDelta: number, phases = [0.4, 0.7, 1.0]) {
  return phases.map(p => ({
    phase: p,
    preview: buildPreviewWithFloors(current, kcalDelta * p),
  }));
}

import { saveCalcResult } from './calcCache';
import { getEffective } from './derived';

export type ApplyMode = 'kcal_only_keep_split' | 'kcal_and_macros_delta';

export type Advice = {
  kcalPerDay: number | null;
  carbsDeltaG: number | null;
  fatDeltaG: number | null;
};

export type AdvicePreview = {
  daily: { kcal: number; P: number; C: number; F: number };
  train?: { kcal: number } | null;
  rest?:  { kcal: number } | null;
  meta: { mode: ApplyMode };
};

const isNum = (x: any): x is number => typeof x === 'number' && Number.isFinite(x);
const R = (x: number) => Math.round(x);

export function buildAdjustedPreview(_: unknown, advice: Advice, mode: ApplyMode = 'kcal_only_keep_split'): AdvicePreview | null {
  if (!advice || advice.kcalPerDay == null) return null;

  // Basis ausschließlich aus derived (profile + getSettings + Cache)
  const eff = getEffective(); // { dailyKcal, P, C, F, trainKcal, restKcal }

  const newDaily = Math.max(0, R(eff.dailyKcal + (advice.kcalPerDay ?? 0)));
  let newP = eff.P, newF = eff.F, newC = eff.C;

  if (mode === 'kcal_only_keep_split') {
    newC = Math.max(0, R((newDaily - (newP * 4 + newF * 9)) / 4));
  } else {
    const dC = isNum(advice.carbsDeltaG) ? advice.carbsDeltaG : 0;
    const dF = isNum(advice.fatDeltaG)   ? advice.fatDeltaG   : 0;
    newC = Math.max(0, eff.C + dC);
    newF = Math.max(0, eff.F + dF);
    const diff = newDaily - (newP * 4 + newF * 9 + newC * 4);
    if (Math.abs(diff) >= 4) newC = Math.max(0, newC + R(diff / 4));
  }

  // Kein Planer im Store -> train/rest nicht neu berechnen; aus Eff falls vorhanden
  const train = isNum(eff.trainKcal) ? { kcal: eff.trainKcal! } : null;
  const rest  = isNum(eff.restKcal)  ? { kcal: eff.restKcal! }  : null;

  return {
    daily: { kcal: newDaily, P: R(newP), C: R(newC), F: R(newF) },
    train, rest,
    meta: { mode },
  };
}

/** Übernahme = Cache aktualisieren (Store hat keine calculator/planer Slices) */
export function applyPreviewToStore(preview: AdvicePreview) {
  if (!preview?.daily) return;
  saveCalcResult({
    dailyKcal: preview.daily.kcal,
    protein_g: preview.daily.P,
    carbs_g:   preview.daily.C,
    fat_g:     preview.daily.F,
    trainingDayKcal: preview.train?.kcal ?? null,
    restDayKcal:     preview.rest?.kcal  ?? null,
    source: 'checkin', // Herkunft markieren
  });
}
