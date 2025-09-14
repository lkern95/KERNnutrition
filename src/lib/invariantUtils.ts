// invariantUtils.ts
// Utilities to enforce and auto-fix all invariants for the KERN Planer

import { Slot } from './planner/computePlan';

export function checkInvariants(slots: Slot[], totals: {kcal: number, protein: number, carbs: number, fat: number}, wake: number, sleep: number, minGap: number) {
  const errors: string[] = [];

  // I1: Summen prüfen
  const sum = {
    kcal: slots.reduce((a, s) => a + s.kcal, 0),
    protein: slots.reduce((a, s) => a + s.p, 0),
    carbs: slots.reduce((a, s) => a + s.c, 0),
    fat: slots.reduce((a, s) => a + s.f, 0),
  };
  if (sum.kcal !== totals.kcal) errors.push(`Σ kcal(${sum.kcal}) ≠ kcal(${totals.kcal})`);
  if (sum.protein !== totals.protein) errors.push(`Σ Protein(${sum.protein}) ≠ Protein(${totals.protein})`);
  if (sum.carbs !== totals.carbs) errors.push(`Σ Carbs(${sum.carbs}) ≠ Carbs(${totals.carbs})`);
  if (sum.fat !== totals.fat) errors.push(`Σ Fat(${sum.fat}) ≠ Fat(${totals.fat})`);

  // I2: Zeitfenster
  slots.forEach(s => {
    if (s.t < wake || s.t > sleep) errors.push(`Mahlzeit ${s.label} (${s.t}) liegt außerhalb des Zeitfensters [${wake}, ${sleep}]`);
  });

  // I3: Keine negativen Makros, keine ungewollt 0-kcal-Mahlzeit
  slots.forEach(s => {
    if (s.p < 0 || s.c < 0 || s.f < 0) errors.push(`Negative Makros in Mahlzeit ${s.label}`);
    if (s.kcal < 5) errors.push(`Mahlzeit ${s.label} hat <5 kcal (evtl. entfernen)`);
  });

  // I4: Mindestabstand
  for (let i = 1; i < slots.length; i++) {
    if (slots[i].t - slots[i-1].t < minGap) errors.push(`Abstand zwischen ${slots[i-1].label} und ${slots[i].label} < Mindestabstand (${minGap})`);
  }

  return errors;
}

// Größtes-Rest-Verfahren für deterministische Rundung
export function distributeRoundingRemainder(values: number[], target: number, order: number[]): number[] {
  const rounded = values.map(Math.floor);
  let diff = Math.round(target - rounded.reduce((a, b) => a + b, 0));
  if (diff === 0) return rounded;
  // Sortiere nach größtem Rest, dann nach Reihenfolge
  const remainders = values.map((v, i) => ({i, rest: v - Math.floor(v)}));
  remainders.sort((a, b) => b.rest - a.rest || order.indexOf(a.i) - order.indexOf(b.i));
  for (let i = 0; i < Math.abs(diff); i++) {
    if (diff > 0) rounded[remainders[i].i]++;
    else rounded[remainders[i].i]--;
  }
  return rounded;
}

// Auto-Fix: Entferne Mahlzeiten <5 kcal (außer explizit gewünscht)
export function removeTinyMeals(slots: Slot[], minKcal = 5) {
  return slots.filter(s => s.kcal >= minKcal);
}
