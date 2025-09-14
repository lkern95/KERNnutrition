import { lrIntSplitSeeded } from './lr-seeded';
// Baseline-Zuteilung mit Seeded Largest-Remainder
export function assignMacroBaselineSeeded(plan:any, targets:any, inputs:any){
  const meals:any[] = Array.isArray(plan?.meals) ? plan.meals : [];
  const n = meals.length || 1;
  const seed = (inputs?.offset ?? 0) % n;

  // Falls du preset-Gewichte hast, hier statt 1,1,... diese Gewichte einsetzen.
  const wC = meals.map(() => 1); // KH-Gewichte (oder aus Preset)
  const wF = meals.map(() => 1); // Fett-Gewichte (oder aus Preset)
  const wP = meals.map(() => 1); // Protein ggf. auch seed-stabil

  const cSplit = lrIntSplitSeeded(Math.round(targets.c), wC, seed);
  const fSplit = lrIntSplitSeeded(Math.round(targets.f), wF, seed);
  const pSplit = lrIntSplitSeeded(Math.round(targets.p), wP, seed); // optional, aber deterministisch

  for (let i=0;i<n;i++){
    meals[i].c = (meals[i].c ?? 0) || 0; meals[i].c = cSplit[i];
    meals[i].f = (meals[i].f ?? 0) || 0; meals[i].f = fSplit[i];
    // Wenn Protein schon via Leitplanke gesetzt wird, hier nur auffüllen falls 0:
    if (!Number.isFinite(meals[i].p) || meals[i].p === 0) meals[i].p = pSplit[i];
  }
}
import type { MealBounds } from './macro-bounds';

const isNum = (x:any): x is number => typeof x === 'number' && Number.isFinite(x);
const kcalOf = (m:any)=> 4*(m.p||0) + 4*(m.c||0) + 9*(m.f||0);

function syncKcal(meals:any[]){ for(const m of meals){ m.kcal = kcalOf(m); } }

function canInc(meal:any, b:MealBounds, macro:'c'|'f'){ 
  const v = (meal?.[macro]||0); return v < b[macro].max && b[macro].source !== 'user';
}
function canDec(meal:any, b:MealBounds, macro:'c'|'f'){
  const v = (meal?.[macro]||0); return v > b[macro].min; // min darf 'user' sein → hart
}

export function reconcileKcalExactBounded(meals:any[], targetKcal:number, bounds:MealBounds[], warnings:any[]){
  const sum = ()=> meals.reduce((a,m)=> a + kcalOf(m), 0);
  let delta = targetKcal - sum();
  if (!isNum(delta) || delta === 0){ syncKcal(meals); return; }

  // leanPM: kcal-Delta bevorzugt über Fett (Preset-Gewichte), KH neutral lassen
  const isLeanPM = (meals[0]?.inputs?.preset ?? meals[0]?.preset) === 'leanPM';
  if (isLeanPM) {
    // Fett-Gewichte: alle außer Pre/Post/Abend/Schlaf
    const n = meals.length;
    const fatWeights = meals.map((m,i) => {
      const role = m.role ?? (m.tags?.[0] ?? 'neutral');
      return (role !== 'pre' && role !== 'post' && role !== 'sleep' && role !== 'wake') ? 1 : 0;
    });
    // Versuche, Delta über Fett zu verteilen
    const abs = Math.abs(delta);
    const sign = Math.sign(delta);
    const parts = lrIntSplitSeeded(abs, fatWeights, `f-delta|${n}`.length);
    let applied = 0;
    for (let i = 0; i < n; i++) {
      if (fatWeights[i] > 0) {
        const before = meals[i].f;
        meals[i].f = Math.max(0, meals[i].f + sign * parts[i]);
        applied += Math.abs(meals[i].f - before) * 9;
      }
    }
    // Rest ggf. über KH (ebenfalls gewichtet, aber nur falls Fett nicht reicht)
    let newDelta = targetKcal - sum();
    if (Math.abs(newDelta) > 0) {
      const weightsC = meals.map((m,i) => 1); // oder buildCarbPresetWeights(inputs, meals) falls inputs verfügbar
      const absC = Math.abs(newDelta/4);
      const signC = Math.sign(newDelta);
      const partsC = lrIntSplitSeeded(Math.round(absC), weightsC, `c-delta|${n}`.length);
      for (let i = 0; i < n; i++) {
        meals[i].c = Math.max(0, meals[i].c + signC * partsC[i]);
      }
    }
    syncKcal(meals);
    return;
  }

  // Standard: wie gehabt
  const inc = (macro:'c'|'f')=>{
    for(let i=0;i<meals.length;i++){ if (canInc(meals[i], bounds[i], macro)) { meals[i][macro] = (meals[i][macro]||0)+1; return true; } }
    return false;
  };
  const dec = (macro:'c'|'f')=>{
    for(let i=0;i<meals.length;i++){ if (canDec(meals[i], bounds[i], macro)) { meals[i][macro] = (meals[i][macro]||0)-1; return true; } }
    return false;
  };

  // Schritt 1: delta mod 4 via Fett (9 ≡ 1 mod 4), falls erlaubt
  let mod = ((delta % 4) + 4) % 4;
  while (mod>0){
    const ok = delta>0 ? inc('f') : dec('f');
    if (!ok) break;
    delta = targetKcal - sum(); mod = ((delta % 4) + 4) % 4;
  }

  // Schritt 2: restliche 4er-Schritte via Carbs/Fett
  let steps = Math.trunc(Math.abs(delta)/4);
  while (steps>0){
    const ok = delta>0 ? (inc('c') || inc('f')) : (dec('c') || dec('f'));
    if (!ok) break;
    steps--;
  }

  const finalDelta = targetKcal - sum();
  if (finalDelta !== 0) {
    warnings.push({ type:'ERROR', code:'KCAL_TARGET_UNACHIEVABLE_WITH_LIMITS',
      message:`Zielkcal nicht exakt erreichbar unter Bounds (Rest: ${finalDelta} kcal).`,
      hint:'Preset schwächen oder per-Slot-Limits anpassen.'
    });
  }
  syncKcal(meals);
}

// ...existing code...
function getValidatorTargets(
  raw: any,
  plan: { meals: {kcal?:number; p?:number; c?:number; f?:number}[] }
): { kcal: number; p: number; c: number; f: number } {
  const sum = (k: 'kcal'|'p'|'c'|'f') => plan.meals.reduce((a,m)=>a+(m[k]||0),0);

  // Versuche verschiedene Property-Namen und Verschachtelungen
  let kcal =
    raw?.kcal ?? raw?.kcals ?? raw?.calories ?? raw?.targets?.kcal ?? raw?.macros?.kcal;
  let p =
    raw?.p ?? raw?.protein ?? raw?.Protein ?? raw?.targets?.p ?? raw?.macros?.p;
  let c =
    raw?.c ?? raw?.carbs ?? raw?.Carbs ?? raw?.targets?.c ?? raw?.macros?.c;
  let f =
    raw?.f ?? raw?.fat ?? raw?.Fat ?? raw?.targets?.f ?? raw?.macros?.f;

  // Fallbacks: aus Plan-Totals ergänzen, damit Validator Zahlen bekommt
  if (!Number.isFinite(kcal)) kcal = sum('kcal');
  if (!Number.isFinite(p))    p    = sum('p');
  if (!Number.isFinite(c))    c    = sum('c');
  if (!Number.isFinite(f))    f    = sum('f');

  return { kcal, p, c, f };
}
const __DEV__ =
  typeof import.meta !== "undefined"
    ? !!import.meta.env?.DEV
    : process.env.NODE_ENV !== "production";
// End-Validator für Plan (nutzt validatePlanSafe)
import { validatePlanSafe } from './validatePlan';
import { computeTotals, distributeKcalEven, allocateMacrosBaseline } from './computePlan';

export function finalizeAndValidate(plan: any, targets: any, bounds?: MealBounds[], warnings: any[] = []) {
  const totals0 = computeTotals(plan.meals);
  if (totals0.sumKcal === 0 && targets.kcal > 0) {
    distributeKcalEven(plan.meals, targets.kcal);
    if (__DEV__) console.debug("Finalizer: kcal gleichmäßig verteilt (vor Validate)");
  }
  const totals1 = computeTotals(plan.meals);
  if (totals1.sumP === 0 && totals1.sumC === 0 && totals1.sumF === 0) {
    assignMacroBaselineSeeded(plan, targets, plan.inputs || {});
    if (__DEV__) console.debug("Finalizer: Makro-Baseline zugeteilt (vor Validate)");
  }
  if (__DEV__) console.debug("Pre-validate totals", computeTotals(plan.meals));
  // ... Makro-Baseline ist gesetzt
  // kcal exakt ans Ziel ziehen (rundet P/C/F minimal nach, bleibt nicht-negativ)
  if (bounds) {
    reconcileKcalExactBounded(plan.meals, targets.kcal, bounds, warnings);
  } else {
    // fallback: allow old behavior if bounds not provided
    // (optional: could throw or warn)
    // legacy reconcileKcalExact removed
    reconcileKcalExactBounded(plan.meals, targets.kcal, plan.meals.map(()=>({p:{min:0,max:Infinity,source:'none'},c:{min:0,max:Infinity,source:'none'},f:{min:0,max:Infinity,source:'none'}})), warnings);
  }
  // danach sind m.kcal mit P/C/F synchron
  const validatorTargets = getValidatorTargets(targets, plan);
  if (__DEV__) console.debug("Validator targets", validatorTargets);
  return validatePlanSafe(plan, validatorTargets);
}
