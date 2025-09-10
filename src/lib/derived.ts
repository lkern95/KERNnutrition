// src/lib/derived.ts
import { useAppStore } from '../store/appStore';
import { loadCalcResult } from './calcCache';

type Sex = 'male' | 'female' | 'other';
const isNum = (x: any): x is number => typeof x === 'number' && Number.isFinite(x);
const R = (x: number) => Math.round(x);

function bmrMifflin(kg: number, cm: number, age: number, sex: Sex) {
  const base = 10 * kg + 6.25 * cm - 5 * age + (sex === 'female' ? -161 : 5);
  return Math.max(0, R(base));
}

export type Effective = {
  bmr: number;
  tdee: number;
  dailyKcal: number;
  P: number; C: number; F: number; // g/Tag
  trainKcal: number | null;
  restKcal: number | null;
};

/**
 * Liefert die aktuell wirksamen Werte aus:
 * - profile (Gewicht, Größe, Alter, Geschlecht, Aktivitätsfaktor)
 * - getSettings() (v.a. protein_gkg, fat_gkg)
 * - calcCache (dailyKcal + P/C/F + optional train/rest)
 */
export function getEffective(): Effective {
  const state = useAppStore.getState();
  const profile: any = state?.profile ?? {};
  const settings: any = state?.getSettings ? state.getSettings() : {};

  const weight = Number(profile.weight) || 0;
  const height = Number(profile.height) || 0;
  const age    = Number(profile.age)    || 0;
  const sex    = (profile.gender ?? 'male') as Sex;
  const act    = Number(profile.activityFactor ?? 1.4);

  const bmr  = bmrMifflin(weight, height, age, sex);
  const tdee = R(bmr * (isNum(act) ? act : 1.4));

  // kcal-Priorität: Cache -> TDEE
  const cache = loadCalcResult();
  const dailyKcal = isNum(cache?.dailyKcal) ? cache!.dailyKcal : tdee;

  // Makros: Cache -> g/kg aus Settings -> Rest über KH
  let P = Number(cache?.protein_g);
  let C = Number(cache?.carbs_g);
  let F = Number(cache?.fat_g);

  if (!(isNum(P) && isNum(C) && isNum(F))) {
    const gkgP = Number(settings?.protein_gkg);
    const gkgF = Number(settings?.fat_gkg);
    if (!isNum(P) && isNum(gkgP) && weight > 0) P = R(weight * gkgP);
    if (!isNum(F) && isNum(gkgF) && weight > 0) F = R(weight * gkgF);
    if (!isNum(C)) C = Math.max(0, R((dailyKcal - (R(P || 0) * 4 + R(F || 0) * 9)) / 4));
  }

  if (!isNum(P)) P = 0;
  if (!isNum(C)) C = Math.max(0, R(dailyKcal / 4)); // letzter Fallback
  if (!isNum(F)) F = 0;

  // Planer-Werte: es gibt keinen Planer im Store -> nur Cache übernehmen, falls vorhanden
  const trainKcal = isNum(cache?.trainingDayKcal) ? cache!.trainingDayKcal : null;
  const restKcal  = isNum(cache?.restDayKcal)     ? cache!.restDayKcal     : null;

  return { bmr, tdee, dailyKcal: R(dailyKcal), P: R(P), C: R(C), F: R(F), trainKcal, restKcal };
}
