function normalizeTargetsForValidator(
  raw: any,
  plan: { meals: { kcal?: number; p?: number; c?: number; f?: number }[] }
): { kcal: number; p: number; c: number; f: number } {
  const sum = (k: 'kcal'|'p'|'c'|'f') => plan.meals.reduce((a,m)=>a+(m[k]||0),0);
  // akzeptiere viele mögliche Keys
  let kcal = raw?.kcal ?? raw?.kcals ?? raw?.calories ?? raw?.targets?.kcal ?? raw?.macros?.kcal;
  let p    = raw?.p    ?? raw?.protein ?? raw?.Protein ?? raw?.targets?.p ?? raw?.macros?.p;
  let c    = raw?.c    ?? raw?.carbs   ?? raw?.Carbs   ?? raw?.targets?.c ?? raw?.macros?.c;
  let f    = raw?.f    ?? raw?.fat     ?? raw?.Fat     ?? raw?.targets?.f ?? raw?.macros?.f;
  // Fallbacks: aus Plan-Summen befüllen, damit nichts undefined bleibt
  if (!Number.isFinite(kcal)) kcal = sum('kcal');
  if (!Number.isFinite(p))    p    = sum('p');
  if (!Number.isFinite(c))    c    = sum('c');
  if (!Number.isFinite(f))    f    = sum('f');
  return { kcal, p, c, f };
}
import type { PlannerInputs } from '@/adapters/plannerSources';

// kleine Helfer (wie in computePlan)
const DAY = 1440;
const t2m = (t:string)=>{ const m=t?.match?.(/^(\d{1,2}):(\d{2})$/); if(!m) return 0; return +m[1]*60 + +m[2]; };
const mid = (a:number,b:number)=> Math.round((a+b)/2);
const snap15 = (m:number)=> Math.round(m/15)*15;

export type Issue = {
  severity: 'error' | 'warn' | 'info';
  code: string;
  msg: string;
  fix?: { label: string; patch: Partial<PlannerInputs> };
};

export type Feasible = {
  // evtl. korrigierte Inputs (nur Timing/Flags; Preset/Totals bleiben unberührt)
  inputs: PlannerInputs & { includePostMeal?: boolean };
  notes: Issue[]; // sortiert: error > warn > info
};

export function ensureFeasible(inp: PlannerInputs): Feasible {
  const out: PlannerInputs & { includePostMeal?: boolean } = JSON.parse(JSON.stringify(inp));
  const notes: Issue[] = [];

  const W0 = t2m(inp.wake);
  const S0 = t2m(inp.sleep);
  const W = W0;
  const S = (S0 <= W ? S0 + DAY : S0);
  const hasGym = !!(inp.isTrainingDay && inp.gymStart && inp.gymEnd);
  const GS = hasGym ? t2m(inp.gymStart!) : 0;
  const GE = hasGym ? (()=>{ const e=t2m(inp.gymEnd!); return (e<=GS ? e+DAY : e); })() : 0;

  // Frühstückszeit (für Abstandsprüfung)
  const breakfastMid = snap15(mid(inp.anchor.breakfastAfterWakeMin, inp.anchor.breakfastAfterWakeMax));
  const breakfastT = W + breakfastMid;

  // --- Pre-Workout: auto-switch auf Snack, wenn „meal“ zeitlich nicht passt
  if (hasGym) {
    const preMealMid  = snap15(mid(inp.anchor.preMealMin,  inp.anchor.preMealMax));  // 120–180
    const preSnackMid = snap15(mid(inp.anchor.preSnackMin, inp.anchor.preSnackMax)); // 30–60
    const preDelta = inp.anchor.preType === 'meal'
      ? preMealMid
      : (inp.anchor.preType === 'snack' ? preSnackMid : (inp.mealsTarget >= 5 ? preMealMid : preSnackMid));
    const preT = GS - preDelta;

    // Zu nah am Wake? -> auf Snack umstellen (leise Auto-Korrektur)
    if (inp.anchor.preType !== 'snack' && (preT - W) < 90) {
      out.anchor.preType = 'snack';
      notes.push({ severity:'info', code:'pre_auto_snack',
        msg:'Pre-Workout liegt zeitlich zu nah → automatisch „Snack (30–60 min)“ gewählt.' });
    }

    // Nähe Frühstück: Empfehlungen
    const gapToBreakfast = preT - breakfastT;
    if (gapToBreakfast < 60) {
      notes.push({
        severity: gapToBreakfast < 30 ? 'warn' : 'info',
        code: gapToBreakfast < 30 ? 'pre_very_close_breakfast' : 'pre_close_breakfast',
        msg: gapToBreakfast < 30
          ? 'Pre-Workout < 30 min nach Frühstück → nur sehr leicht/Shake.'
          : 'Pre-Workout < 60 min nach Frühstück → leicht/flüssig empfohlen.'
      });
    }
  }

  // --- Post-Workout Snack: hart auf ≤60 min clampen
  if (hasGym) {
    const snackMid = snap15(mid(out.anchor.postSnackMin, out.anchor.postSnackMax));
    if (snackMid > 60) {
      out.anchor.postSnackMin = 15; out.anchor.postSnackMax = 60;
      notes.push({ severity:'info', code:'post_clamp_60', msg:'Post-Workout-Snack auf ≤60 min begrenzt.' });
    }
  }

  // --- Schlaf-Snack: auf ≥45 min vor Schlaf begrenzen
  if (out.anchor.preSleepMin < 45) {
    out.anchor.preSleepMin = 45;
    out.anchor.preSleepMax = Math.max(out.anchor.preSleepMax, 60);
    notes.push({ severity:'info', code:'sleep_min_45', msg:'„Vor dem Schlafen“ auf ≥45 min vor Schlaf begrenzt.' });
  }

  // --- Fixpunkte: harte (wake, sleep, ggf. pre/post) vs. optionale (postMeal)
  let hardAnchors = 2; // wake + sleep
  if (hasGym) hardAnchors += 2; // pre + post
  out.includePostMeal = hasGym; // optionaler zusätzlicher Fixpunkt, kann wegfallen

  // Falls Ziel < harte Fixpunkte: optionalen Post-Meal rausnehmen, dann ggf. Quick-Fix anbieten
  if (out.mealsTarget < hardAnchors) {
    if (out.includePostMeal) {
      out.includePostMeal = false;
      notes.push({ severity:'info', code:'drop_postmeal', msg:'Ziel < Fixpunkte → Post-Training-Vollmahlzeit wird automatisch zusammengelegt/übersprungen.' });
    }
    if (out.mealsTarget < hardAnchors) {
      notes.push({
        severity:'error', code:'meals_too_low',
        msg:`Mahlzeitenziel (${out.mealsTarget}) ist kleiner als erforderliche Fixpunkte (${hardAnchors}). Bitte Ziel erhöhen oder Zeiten anpassen.`,
        fix:{ label:`Mahlzeitenziel auf ${hardAnchors} setzen`, patch:{ mealsTarget: hardAnchors } }
      });
    }
  }

  // --- Späte Post-Snack Warnung (>90 min)
  if (hasGym) {
    const postSnackMid = snap15(mid(out.anchor.postSnackMin, out.anchor.postSnackMax));
    if (postSnackMid > 60) {
      notes.push({ severity:'warn', code:'post_late', msg:'Post-Workout >60–90 min – Snack/Shake früher einplanen.' });
    }
  }

  // sortiere: error > warn > info
  notes.sort((a,b)=>{
    const w = {error:3, warn:2, info:1} as const;
    return w[b.severity]-w[a.severity];
  });
  // Nach erfolgreichem Auto-Fix: Info ausgeben, wenn alles passt
  if (!notes.some(n => n.severity === 'error')) {
    notes.push({
      severity: 'info',
      code: 'validator_ok',
      msg: 'Nach Auto-Fix bleiben kcal/Makro-Summen exakt (Validator OK).'
    });
  }

  return { inputs: out, notes };
}

// Hilfsfunktion analog computePlan
function isFiniteNum(x: any): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

// validatePlan prüft einen Plan auf Konsistenz (Abstände, Fenster, Summen etc.)
// KCAL_EPS = 1 Toleranz für kcal
const KCAL_EPS = 1;
export function validatePlanCore(plan: any, targets: { kcal:number; p:number; c:number; f:number }) {
  // Sanity-Check: Meals und Zeiten
  if (!plan || !Array.isArray(plan.meals)) {
    throw new Error("Interner Fehler: Plan ohne Meals.");
  }
  for (let i = 0; i < plan.meals.length; i++) {
    const m = plan.meals[i];
    if (!m) throw new Error(`Interner Fehler: Meal[${i}] ist leer (sparse array).`);
    if (!isFiniteNum(m.t)) {
      throw new Error(`Interner Fehler: Meal[${i}] hat keine gültige Zeit 't' (Backfill fehlgeschlagen).`);
    }
  }

  // ...bestehende Checks (Abstände, Fenster, Summen etc.)...

  // Σ-Prüfungen: Nur hier!
  const sumKcal = plan.meals.reduce((a: number, m: any) => a + (m.kcal || 0), 0);
  const sumP = plan.meals.reduce((a: number, m: any) => a + (m.p || 0), 0);
  const sumC = plan.meals.reduce((a: number, m: any) => a + (m.c || 0), 0);
  const sumF = plan.meals.reduce((a: number, m: any) => a + (m.f || 0), 0);

  if (Math.abs(sumKcal - targets.kcal) > KCAL_EPS) {
    throw new Error(`Σ kcal stimmt nicht: ${sumKcal} vs. Ziel ${targets.kcal}`);
  }
  if (sumP !== targets.p) {
    throw new Error(`Σ Protein stimmt nicht: ${sumP} vs. Ziel ${targets.p}`);
  }
  if (sumC !== targets.c) {
    throw new Error(`Σ Carbs stimmt nicht: ${sumC} vs. Ziel ${targets.c}`);
  }
  if (sumF !== targets.f) {
    throw new Error(`Σ Fat stimmt nicht: ${sumF} vs. Ziel ${targets.f}`);
  }
}
// Safe-Wrapper für validatePlanCore
export function validatePlanSafe(plan: any, rawTargets: any) {
  // Dichte + Zeit-Guards
  if (!plan || !Array.isArray(plan.meals)) throw new Error("Interner Fehler: Plan ohne Meals.");
  if (plan.meals.some((m:any)=>!m)) throw new Error("Interner Fehler: plan.meals enthält leere Einträge (sparse array).");
  for (let i=0;i<plan.meals.length;i++){
    const m = plan.meals[i];
    if (!Number.isFinite(m.t)) throw new Error(`Interner Fehler: Meal[${i}] hat keine Zeit 't'.`);
    if (!Number.isFinite(m.kcal)) throw new Error(`Interner Fehler: Meal[${i}] hat keine kcal.`);
  }
  const targets = normalizeTargetsForValidator(rawTargets, plan);
  if (typeof import.meta !== "undefined" ? import.meta.env?.DEV : process.env.NODE_ENV !== "production") {
    console.debug("validatePlanSafe → normalized targets", targets);
  }
  return validatePlanCore(plan, targets);
}
