// src/lib/planner/fix-macros-with-bounds.ts

import type { Macro, MealBounds } from './macro-bounds';
import { remainderOrderSeeded, normSeed, lrIntSplitSeeded } from './lr-seeded';

const isNum = (x:any): x is number => typeof x === 'number' && Number.isFinite(x);
const sum = (xs:number[]) => xs.reduce((a,b)=>a+b,0);
const grams = (x:any) => (isNum(x) ? Math.round(x) : 0);

// Stable Remainder-Order jetzt zentral in lr-seeded.ts

type SlotClass = 'neutral'|'presetSoft'|'blocked';

// Kandidatenklassen pro Slot & Makro bestimmen
function classify(meal:any, bound:MealBounds, m:Macro): SlotClass {
  const b = bound[m];
  if (bound.explicitZero) return 'blocked';
  // user-Quelle ist hart: nicht antasten jenseits min/max
  if (b.source === 'user') return 'blocked';
  // preset ist weich (darf abgeschwächt werden, aber nachrangig)
  if (b.source === 'preset') return 'presetSoft';
  return 'neutral';
}

function capacityAdd(meals:any[], bounds:MealBounds[], m:Macro): number[] {
  return meals.map((meal,i)=>{
    const b = bounds[i][m];
    const v = grams(meal?.[m]);
    return Math.max(0, b.max - v);
  });
}

function capacitySub(meals:any[], bounds:MealBounds[], m:Macro): number[] {
  return meals.map((meal,i)=>{
    const b = bounds[i][m];
    const v = grams(meal?.[m]);
    return Math.max(0, v - b.min);
  });
}

// Verteile delta (in Gramm) innerhalb der Grenzen und Klassen
function distributeDeltaInt(meals:any[], bounds:MealBounds[], m:Macro, delta:number, cls:SlotClass, seed?: number): number {
  if (delta === 0) return 0;
  const sign = Math.sign(delta);
  const need = Math.abs(delta);

  // Roh-Kapazitäten ermitteln (add/sub je nach Vorzeichen)
  const rawCaps = sign > 0 ? capacityAdd(meals, bounds, m) : capacitySub(meals, bounds, m);

  // Nur Slots der gewünschten Klasse zulassen
  const allow = meals.map((meal,i)=> classify(meal, bounds[i], m) === cls ? 1 : 0);

  // Infinity → große endliche Zahl (keine NaNs in Verhältnissen)
  const capLimit = rawCaps.map((c,i) => allow[i] ? (Number.isFinite(c) ? c : 1e9) : 0);

  const totalCap = capLimit.reduce((a,b)=>a+b,0);
  if (totalCap <= 0) return 0;

  const take = Math.min(need, totalCap);

  // proportional nach Kapazität verteilen (Wasserfüllung + stable LR)
  // Seeded, capacity-respecting split
  const n = meals.length;
  const weights = capLimit;
  const split = lrIntSplitSeeded(take, weights, seed ?? 0);

  // Anwenden
  let totalAssigned = 0;
  for (let i=0;i<meals.length;i++) {
    const step = split[i];
    if (!step) continue;
    meals[i][m] = (Math.round(meals[i][m] || 0)) + (sign > 0 ? step : -step);
    totalAssigned += step;
  }
  return sign * totalAssigned;
}

// Hauptfunktion: korrigiert P/C/F sequenziell unter Bounds
export function fixMacroSumsRespectingBounds(
  plan:any, targets:any, bounds:MealBounds[],
  order:Macro[] = ['c','f','p'], warnings:any[] = [],
  seed?: number
) {
  const meals:any[] = Array.isArray(plan?.meals) ? plan.meals : [];
  const tgt = (k:Macro) => grams(targets?.[k]);

  for (const m of order) {
    const current = grams(meals.reduce((a,meal)=> a + grams(meal?.[m]), 0));
    let delta = tgt(m) - current;
    if (delta === 0) continue;

    // 1) neutrale Slots
  let done = distributeDeltaInt(meals, bounds, m, delta, 'neutral', seed);
    delta -= done;

    if (delta !== 0) {
      // 2) presetSoft (darf abgeschwächt werden, aber melde Warning)
      const before = delta;
  done = distributeDeltaInt(meals, bounds, m, delta, 'presetSoft', seed);
      delta -= done;
      if (before !== delta) {
        warnings.push({ type:'WARNING', code:`${m.toUpperCase()}_PRESET_WEAKENED`,
          message:`Preset-Grenzen für ${m.toUpperCase()} wurden abgeschwächt, um die Gesamtsumme zu treffen.`,
        });
      }
    }

    if (delta !== 0) {
      // 3) nicht möglich ohne User-Limits zu verletzen
      warnings.push({ type:'ERROR', code:`${m.toUpperCase()}_TARGET_UNACHIEVABLE_WITH_LIMITS`,
        message:`${m.toUpperCase()}-Ziel kann unter den per-Slot-Limits nicht exakt erreicht werden (Rest: ${delta} g).`,
        hint:'Preset schwächen oder Limits anpassen.',
      });
      // breche nicht hart ab – I6 erlaubt Fehler+Vorschlag; Validator folgt.
    }
  }
}
