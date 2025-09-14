import { ANCHOR_DEFAULT } from '@/adapters/plannerSources';
import { lrIntSplitSeeded } from './lr-seeded';
import { buildCarbPresetWeights } from './preset-weights';
// Protein-Baseline für Hauptmahlzeiten (Prompt P-BASE)
function applyProteinBaseline(meals:any[], bounds:any[], minPerMain=20){
  const isMain = (m:any, i:number, n:number) => {
    const role = m?.role ?? (i===n-1 ? 'sleep' : 'neutral');
    return role === 'neutral'; // passe ggf. an, z.B. exclude pre/post/sleep
  };
  for (let i=0;i<meals.length;i++){
    const m = meals[i];
    const b = bounds[i]?.p;
    if (!isMain(m, i, meals.length)) continue;
    const cur = Math.round(m?.p || 0);
    const min = Math.max(0, Math.min(minPerMain, b?.max ?? Infinity));
    if (cur < min && (b?.min ?? 0) <= min) {
      m.p = min;
    }
  }
}
/**
 * TECHNISCHE LEITPLANKEN (Planer-Logik, Stand 2025-09-12)
 *
 * Rundung & Rechnen:
 *   - Intern werden alle Makros in Gramm (g) verarbeitet.
 *   - kcal wird immer aus Gramm abgeleitet: kcal = p*4 + c*4 + f*9 (keine separate Speicherung).
 *   - Die finale Rundung erfolgt erst am Ende (z.B. auf 5g-Schritte).
 *   - Reste werden mit dem größtes-Rest-Verfahren (I5) verteilt, sodass die Zielsumme exakt erreicht wird.
 *
 * Determinismus:
 *   - Bei jeder stochastisch anmutenden Wahl (gleich gute Kandidaten) gewinnt immer der früheste Slot (Index).
 *   - Als zweiter Schlüssel wird das höchste ursprüngliche Gewicht verwendet.
 *
 * Idempotenz:
 *   - Gleiche Inputs führen immer zu gleichen Outputs (inkl. Auto-Fix).
 *
 * Change-Log:
 *   - Jede automatische Änderung wird als {rule, before, after, reason} im Plan gesammelt (plan.changeLog[]).
 *   - Für UI-Hinweise und Nachvollziehbarkeit.
 *
 * Validierungs-API:
 *   - validate(plan): Issue[] mit Typ (ERROR/WARNING), Code (eindeutig), Message, Fix (optional: function/patch).
 *
 * Auto-Fix-Strategie (Option autoFixLevel):
 *   - off:      Keine Änderungen, nur Fehlermeldungen + Fix-Vorschläge.
 *   - safe:     (Default) Klippen von Fenstern, Re-Spacing ≤ 15 % vom Zielabstand,
 *               Preset-Abschwächung zulässig, keine Änderung der Mahlzeitenanzahl.
 *   - aggressive: Darf Mahlzeitenanzahl ändern (innerhalb [min,max]), Zielabstand neu schätzen,
 *               Preset-Blöcke auflösen/zusammenziehen.
 *
 * Reihenfolge der Auto-Fixes (safe/aggressive):
 *   1. Fenster klippen (auf erlaubte Werte begrenzen)
 *   2. Re-Spacing (Abstände zwischen Mahlzeiten anpassen, safe: max ±15 %)
 *   3. Preset schwächen (Vorgaben lockern, z. B. optionale Vorgaben ignorieren)
 *   4. Makro-Rebalance (Makronährstoffverteilung anpassen)
 *   5. Mahlzeitenanzahl ändern (nur aggressive)
 *
 * Nach jedem Schritt: Integritätsbedingungen I1–I6 prüfen (Stop-Bedingung bei Erfolg).
 *
 * Ziel: Möglichst viele Pläne automatisch reparieren, aber nachvollziehbar und kontrolliert.
 */

import { normalizeTargets } from './targets-normalize';
// Robust Plan-ID-Helper (lokal, keine Typlawine)
function planIdFromInputs(inputs: any): string {
  return (
    inputs?.id ||
    inputs?.planId ||
    (typeof inputs === 'object' && 'plan' in inputs && inputs.plan?.id) ||
    (typeof inputs === 'object' && 'plan' in inputs && inputs.plan?.planId) ||
    '' + Math.random().toString(36).slice(2, 10)
  );
}
// Typ für Change-Log-Eintrag
export type PlanChangeLogEntry = {
  rule: string; // z.B. "I5: Größtes-Rest-Verfahren"
  before: any;
  after: any;
  reason: string;
};

// Hilfsfunktion: Change-Log-Eintrag zum Plan hinzufügen
export function addPlanChange(plan: any, entry: PlanChangeLogEntry) {
  if (!plan.changeLog) plan.changeLog = [];
  plan.changeLog.push(entry);
}
export type Slot = {
  id: string;
  t: number;
  label: string;
  tags: Array<'pre' | 'post' | 'sleep' | 'wake' | 'main' | 'merged'>;
  p: number;
  c: number;
  f: number;
  kcal: number;
  explicitZero?: boolean;
  noLactose?: boolean;
  macroType?: string;
  userCap?: number;
  userMin?: number;
};
export type SlotAttribute = {
  idx: number;
  noLactose?: boolean;
  macroType?: string;
};
// Optional: Allergen-/No-go-Makros pro Slot (z.B. abends keine Laktose)
// Beispiel: [{ idx: 3, noLactose: true, macroType: 'starch' }]
// Notfall-Helper: erzwingt Mindestabstand zwischen Mahlzeiten
function enforceTargetGap(meals:any[], targetGapMin:number){
  if (!Array.isArray(meals) || meals.length < 2) return;
  // prüfe den kleinsten Gap
  const mins = (t:any) => {
    if (typeof t === 'number' && Number.isFinite(t)) return t;
    if (typeof t === 'string') {
      const [H,M] = (t||'00:00').split(':').map((x:string)=>parseInt(x,10)||0);
      return H*60+M;
    }
    return 0;
  };
  const getT = (m:any) => m?.t ?? m?.time; // kompatibel
  const times = meals.map(getT).filter(v => v !== undefined && v !== null);
  if (times.length !== meals.length) return;

  const gaps = [];
  for (let i=1;i<times.length;i++){
    gaps.push(mins(times[i]) - mins(times[i-1]));
  }
  const minGap = Math.min(...gaps);
  if (!(minGap < targetGapMin)) return; // alles gut

  // Notfall: gleichmäßig zwischen erstem und letztem Timepoint verteilen
  const start = mins(times[0]);
  const end   = mins(times[times.length-1]);
  const span  = Math.max(0, end - start);
  const step  = Math.floor(span / (meals.length-1));
  for (let i=0;i<meals.length;i++){
    meals[i].t = start + step*i;
  }
}
type Macro = 'p' | 'c' | 'f';
type Targets = { kcal: number; p: number; c: number; f: number };

const _ensureArray = <T,>(x: any): T[] => (Array.isArray(x) ? x : []);
const _isNum = (x: any): x is number => typeof x === 'number' && Number.isFinite(x);

// Baut einen stabilen Rückgabewert für Call-Sites und Tests
function _normalizePlanOutput(plan: any, rawTargets?: any) {
  const meals = _ensureArray(plan?.meals);
  const warnings = _ensureArray(plan?.warnings);

  const sum = (k: 'kcal'|'p'|'c'|'f') => (meals as Partial<Slot>[]).reduce((a:number, m) => a + (_isNum(m?.[k]) ? (m[k] as number) : 0), 0);

  const targets: Targets = {
    kcal: _isNum(rawTargets?.kcal) ? rawTargets.kcal : sum('kcal'),
    p:    _isNum(rawTargets?.p)    ? rawTargets.p    : sum('p'),
    c:    _isNum(rawTargets?.c)    ? rawTargets.c    : sum('c'),
    f:    _isNum(rawTargets?.f)    ? rawTargets.f    : sum('f'),
  };

  // Rückwärtskompatibel: sowohl slots als auch meals bereitstellen
  return {
    // Bestehendes plan-Objekt weitergeben (falls UI weitere Felder liest)
    ...plan,
    meals,           // canonical
    slots: meals,    // alias für ältere Call-Sites
    warnings,        // garantiert Array
    targets,         // garantiert voll befüllt
  };
}
export const __DEV__ = typeof import.meta !== "undefined" ? !!import.meta.env?.DEV : process.env.NODE_ENV !== "production";

function traceMeals(label: string, meals: any[]) {
  if (__DEV__) {
    console.debug(`TRACE[${label}] len=${Array.isArray(meals)? meals.length : -1}`);
  }
}

function setMeals(plan: any, newMeals: any[], label: string) {
  if (__DEV__) {
    const prevLen = Array.isArray(plan.meals) ? plan.meals.length : -1;
    const nextLen = Array.isArray(newMeals) ? newMeals.length : -1;
    console.debug(`SET[${label}] ${prevLen} -> ${nextLen}`);
    if (nextLen === 0) {
      console.warn(`⚠️ SET[${label}] setzt plan.meals auf 0!`);
      try { throw new Error("stack"); } catch (e) { console.warn((e as Error).stack); }
    }
  }
  plan.meals = newMeals;
}
import { finalizeAndValidate } from './finalizeAndValidate';
import { allocateAllMacrosIfEmpty } from './macro-allocation';
import { buildMealBounds } from './macro-bounds';
import { fixMacroSumsRespectingBounds } from './fix-macros-with-bounds';
import { reconcileKcalExactBounded } from './finalizeAndValidate';


// Summenberechnung für Meals
export function computeTotals(meals: {kcal?:number,p?:number,c?:number,f?:number}[]) {
  const sumKcal = meals.reduce((a,m)=>a+(m.kcal||0),0);
  const sumP = meals.reduce((a,m)=>a+(m.p||0),0);
  const sumC = meals.reduce((a,m)=>a+(m.c||0),0);
  const sumF = meals.reduce((a,m)=>a+(m.f||0),0);
  return { sumKcal, sumP, sumC, sumF };
}

// Gleichmäßige kcal-Verteilung mit exakter Zielsumme
export function distributeKcalEven(meals: {kcal?:number}[], targetKcal: number, plan?: any, seed?: number) {
  const n = meals.length || 0;
  if (n <= 0 || targetKcal <= 0) return;
  const weights = Array.from({length: n}, () => 1); // gleichmäßig, kann ggf. angepasst werden
  const kcalSplit = lrIntSplitSeeded(Math.round(targetKcal), weights, seed ?? 0);
  for (let i=0;i<n;i++) meals[i].kcal = kcalSplit[i];
}
// Fallback: Makros proportional zu kcal verteilen, Summen exakt
export function allocateMacrosBaseline(
  meals: { kcal:number; p?:number; c?:number; f?:number }[],
  targets: { p:number; c:number; f:number },
  plan?: any
) {
  const totalKcal = meals.reduce((a,m)=>a+(m.kcal||0),0);
  if (totalKcal <= 0) return;

  const weights = meals.map(m => (m.kcal || 0) / totalKcal);

  const allocOne = (targetG: number, macro: string) => fixSumByLargestRemainder(weights.map(w => w * targetG), targetG, plan, `I5: ${macro}-Verteilung`);

  const pAlloc = allocOne(targets.p, 'Protein');
  const cAlloc = allocOne(targets.c, 'Kohlenhydrate');
  const fAlloc = allocOne(targets.f, 'Fett');

  for (let i = 0; i < meals.length; i++) {
    meals[i].p = pAlloc[i];
    meals[i].c = cAlloc[i];
    meals[i].f = fAlloc[i];
  }
}
// Utility: Größtes-Rest-Verfahren für exakte Ganzzahlsummen
function fixSumByLargestRemainder(values: number[], target: number, plan?: any, rule?: string): number[] {
  const base = values.map(v => Math.floor(v));
  let rest = target - base.reduce((a,b)=>a+b,0);
  const frac = values.map((v,i)=>({i, r: v - Math.floor(v)}))
                     .sort((a,b)=> b.r - a.r || a.i - b.i); // deterministisch
  const before = [...base];
  for (let k = 0; k < frac.length && rest > 0; k++) {
    base[frac[k].i] += 1; rest--;
  }
  if (plan && rule && before.some((v,i)=>v!==base[i])) {
    addPlanChange(plan, {
      rule,
      before,
      after: [...base],
      reason: 'Größtes-Rest-Verfahren angewendet, um exakte Zielsumme zu erreichen.'
    });
  }
  return base;
}
/** verteilt ±5g so, dass Summe==target wird; verbotene Indizes werden zuletzt genutzt */
function finalizeTotals(
  slots: Slot[],
  totals: Totals,
  forbidFatIdx: number[] = []  // z.B. [idxPre, idxPost, eveningIdx, idxSleep]
) {
  // 1) auf 5 g runden
  let P = slots.map(s => roundToStep(s.p));
  let C = slots.map(s => roundToStep(s.c));
  let F = slots.map(s => roundToStep(s.f));

  // 2) Summen exakt mit 5g-Schritten anpassen (P3: Reihenfolge Protein → KH → Fett; bei Gleichstand gewinnt früherer Slot)
  const forbidFat = new Set<number>(forbidFatIdx.filter(i => i != null && i >= 0));
  const minProteinPerMeal = 0; // TODO: ggf. aus Inputs übernehmen
  let proteinPriorityLast = false;
  if (minProteinPerMeal > 0 && P.some(p => p < minProteinPerMeal)) {
    proteinPriorityLast = true;
  }
  // P3: Makro-Reihenfolge: Protein → KH → Fett (außer Protein-Mindestziel, dann Protein zuletzt)
  if (proteinPriorityLast) {
    // Wenn Protein-Mindestziel verletzt, Protein zuletzt
  C = fixSum(C, totals.carbs, STEP);
  F = fixSum(F, totals.fat, STEP, Array.from(forbidFat));
  P = fixSum(P, totals.protein, STEP);
  } else {
    // P3: Protein zuerst, dann KH, dann Fett
    P = fixSum(P, totals.protein, STEP);
    C = fixSum(C, totals.carbs, STEP);
    F = fixSum(F, totals.fat, STEP, Array.from(forbidFat));
  }

  // 3) zurückschreiben
  for (let i=0;i<slots.length;i++) {
    slots[i].p = P[i]; slots[i].c = C[i]; slots[i].f = F[i];
  }

  // 4) Restgramme (Totals, die nicht durch 5 teilbar sind) auf EINEN Slot legen
  // (optional, falls gewünscht, kann hier noch ergänzt werden)

  // 5) kcal final aus P/C/F berechnen
  for (const s of slots) s.kcal = kcalOf(s.p, s.c, s.f);

  return slots;
}
// ---- Finalisierung: Summen exakt auf Totals ziehen, Caps respektieren ----
type Totals = { protein: number; carbs: number; fat: number };
// finalizeTotals ist weiter unten im File definiert und wird am Ende von computePlan verwendet.

  // ...existing code...

function normalizeAnchor(a?: Partial<typeof ANCHOR_DEFAULT>) {
  return { ...ANCHOR_DEFAULT, ...(a ?? {}) };
}
// --- Finalizer for exact macro/kcal sums ---
const STEP_P = 5, STEP_C = 5, STEP_F = 5;
const orderIndices = (slots: Slot[], forbid = new Set<number>()) =>
  slots.map((_,i)=>i).filter(i=>!forbid.has(i));

/** verteilt ±step so, dass Summe==total wird (O(n), ohne Endlosschleife) */
// --- Anchor helpers ---
const mid = (a:number,b:number)=> Math.round((a+b)/2);
const snap15 = (m:number)=> Math.round(m/15)*15;
// eindeutige Markierung für Runtime-Check
// (hat keinen Einfluss aufs Build)
;(computePlan as any).__id__ = 'CORE_PRESET_V1';
// --- Utilities for robust macro distribution ---
const STEP = 5;
function roundToStep(n:number, step=STEP){ return Math.round(n/step)*step; }
// Corrects rounding errors exactly to total, in 5g steps, along priority
function fixSum(all:number[], total:number, step=STEP, priority:number[] = []) {
  const tgt = Math.round(total);
  let cur = Math.round(all.reduce((a,b)=>a+b,0));
  let diff = tgt - cur;
  if (!diff) return all;

  // auf Schritt rasterisieren
  const dir = diff > 0 ? step : -step;
  let steps = Math.floor(Math.abs(diff) / step);
  if (steps === 0) return all;

  // P3: Bei Gleichständen gewinnt der frühere Slot (Indexreihenfolge)
  const order = (priority.length ? priority : all.map((_,i)=>i)).filter(i => i>=0 && i<all.length);
  let idx = 0, guard = steps * Math.max(1, order.length) + 1000; // Schutz

  while (steps > 0 && guard-- > 0) {
    const i = order[idx % order.length];
    const next = all[i] + dir;
    if (next >= 0) { all[i] = next; steps--; }
    idx++;
  }
  return all;
}
import { distributeWithFloors, roundKeepSum } from '../planer';
import { kcalOf } from '../kcal';
import { checkInvariants, removeTinyMeals } from '../invariantUtils';
const DAY = 24 * 60;
const clamp = (n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const roundTo = (n:number,step:number)=>Math.round(n/step)*step;
const t2m = (t: string) => {
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return 0;
  return parseInt(m[1]) * 60 + parseInt(m[2]);
};

/**
 * AutoFixLevel für Plan-Generierung:
 * - 'off': Keine Änderungen, nur Fehlermeldungen + Fix-Vorschläge
 * - 'safe': (Default) Klippen von Fenstern, Re-Spacing ≤ 15 % vom Zielabstand, Preset-Abschwächung zulässig, keine Änderung der Mahlzeitenanzahl
 * - 'aggressive': Darf Mahlzeitenanzahl ändern (innerhalb [min,max]), Zielabstand neu schätzen, Preset-Blöcke auflösen/zusammenziehen
 */
export type AutoFixLevel = 'off' | 'safe' | 'aggressive';

export type PlanInputs = {
  /**
   * Optional explizite Zielwerte für die Makronährstoffverteilung (kcal, p, c, f)
   * Wird von computePlan bevorzugt verwendet, falls gesetzt.
   */
  targets?: { kcal: number; p: number; c: number; f: number };
  wake: string; sleep: string;
  // Einzelner Gym-Block (legacy)
  gymStart?: string; gymEnd?: string;
  // Mehrere Gym-Blöcke (empfohlenes neues Feld)
  gymBlocks?: Array<{ start: string; end: string; type?: string; priority?: number }>;
  // Optional: Siesta/Nap-Blöcke (keine Meals in diesen Intervallen)
  napBlocks?: Array<{ start: string; end: string }>;
  // Optional: Protein-Mindestziel pro Hauptmahlzeit (z.B. 20g)
  minProteinPerMainMeal?: number;
  isTrainingDay: boolean;
  /**
   * Deterministic offset/seed for macro/kcal splits (for test reproducibility)
   */
  offset?: number;
  mealsTarget: number; minGapMin: number; targetGapMin: number;
  kcal: number; protein: number; carbs: number; fat: number;
  bodyWeightKg?: number;
  proteinGPerKg?: number;
  protein_g_per_kg?: number;
  fatGPerKg?: number;
  fat_g_per_kg?: number;
  preset?: string;
  includePostMeal?: boolean; // << neu: optionaler Fixpunkt
  date?: string; // optional: YYYY-MM-DD für DST/absolute Minuten
  slotAttributes?: Array<SlotAttribute>;
  /**
   * Explizite Steuerung der Auto-Fix-Strategie (optional, Default: 'safe')
   * - 'off': keine Änderungen, nur Fehlermeldungen + Fix-Vorschläge
   * - 'safe': Klippen von Fenstern, Re-Spacing ≤ 15 %, Preset-Abschwächung, keine Änderung der Mahlzeitenanzahl
   * - 'aggressive': Darf Mahlzeitenanzahl ändern (innerhalb [min,max]), Zielabstand neu schätzen, Preset-Blöcke auflösen/zusammenziehen
   */
  autoFixLevel?: AutoFixLevel;
};
export type Warning = { type:'gap'|'preTooClose'|'postTooLate'|'mealsTarget'|'invariant'; msg:string; slotIds?:string[] };

// --- Kleine Hilfsfunktionen (isFiniteNum, densifyMeals, assignTimesLinear, backfillTimesIfMissing) ---
const isFiniteNum = (x: any): x is number => typeof x === "number" && Number.isFinite(x);

// Erzwingt ein dichtes Array mit N Einträgen. Fehlende werden aufgefüllt.
function densifyMeals<T extends { id?: number }>(arr: (T | undefined)[], n: number, mk: (i:number)=>T): T[] {
  return Array.from({ length: n }, (_, i) => {
    const v = arr[i];
    if (v) { if (v.id == null) (v as any).id = i; return v; }
    const nv = mk(i); (nv as any).id = i; return nv;
  });
}

// Gleichmäßige Zeitverteilung zwischen wake/sleep mit Mindestabstand (einfach & robust)
function assignTimesLinear(meals: { t?: number }[], wake: number, sleep: number, minGap: number) {
  const n = meals.length;
  const span = Math.max(0, sleep - wake);
  if (n <= 0 || span <= 0) return;
  // Erst grob gleichmäßig:
  for (let i = 0; i < n; i++) {
    const frac = n === 1 ? 0.5 : i / (n - 1);
    meals[i].t = Math.round(wake + frac * span);
  }
  // Mindestabstand nachziehen (vorwärts, dann rückwärts glätten)
  for (let i = 1; i < n; i++) {
    if (!isFiniteNum(meals[i-1].t!)) continue;
    const want = meals[i-1].t! + minGap;
    if (!isFiniteNum(meals[i].t!) || meals[i].t! < want) meals[i].t = want;
  }
  for (let i = n - 2; i >= 0; i--) {
    if (!isFiniteNum(meals[i+1].t!)) continue;
    const maxAllowed = meals[i+1].t! - minGap;
    if (!isFiniteNum(meals[i].t!) || meals[i].t! > maxAllowed) meals[i].t = maxAllowed;
  }
  // In Fenster klemmen
  for (let i = 0; i < n; i++) {
    meals[i].t = Math.min(Math.max(meals[i].t!, wake), sleep);
  }
}

// Backfill: fehlende Zeiten auffüllen, ohne vorhandene zu überschreiben
function backfillTimesIfMissing(
  meals: { t?: number }[],
  wake: number, sleep: number, minGap: number
) {
  const missing = meals.some(m => !isFiniteNum(m.t!));
  if (!missing) return;
  assignTimesLinear(meals, wake, sleep, minGap);
  if (__DEV__) console.debug("assignTimesLinear: fehlende 't' aufgefüllt");
}

export function computePlan(inputs: PlanInputs) {
  // --- Auto-Fix-Strategie: Steuerung über autoFixLevel ---
  const autoFixLevel: 'off' | 'safe' | 'aggressive' = inputs.autoFixLevel ?? 'safe';

  // --- Targets normalisieren (Prompt TGT-2) ---
  // Roh-Targets (z. B. aus UI/Calculator) → numerisch & kohärent
  // Accept both .targets and root-level kcal/protein/carbs/fat for compatibility
  const __rawTargets = (inputs as any)?.targets ?? inputs;
  if (!(__rawTargets.kcal > 0)) {
    // Leerer Plan für die UI, keine Exception
    return {
      id: planIdFromInputs(inputs),
      inputs,
      meals: [],
      warnings: [],
      targets: { kcal: 0, p: 0, c: 0, f: 0 }
    };
  }
  const targets = normalizeTargets(__rawTargets);
  // Plan-Objekt deklarieren und targets zuweisen
  const plan: any = { id: planIdFromInputs(inputs), inputs, targets };

  // (Rest der Funktion wie gehabt)
  // Übertrage optionale Slot-Attribute (Allergene/No-go-Makros) auf Slots
  if (Array.isArray(inputs.slotAttributes)) {
    (inputs.slotAttributes as SlotAttribute[]).forEach((attr: SlotAttribute) => {
      if (typeof attr.idx === 'number' && slots[attr.idx]) {
        if (attr.noLactose !== undefined) slots[attr.idx].noLactose = attr.noLactose;
        if (attr.macroType) slots[attr.idx].macroType = attr.macroType;
      }
    });
  }
  // Markiere explizite 0-kcal-Slots (z.B. für Fasten oder bewusst leer)
  // Input: slots mit explicitZero=true werden geschützt
  // Protein-Mindestziel pro Hauptmahlzeit (optional)
  const minProteinPerMainMeal = typeof inputs.minProteinPerMainMeal === 'number' ? inputs.minProteinPerMainMeal : 0;
  // --- Siesta/Nap-Blöcke vorbereiten (absolute Minuten)
  let napBlocks: Array<{ start: number; end: number }> = [];
  if (Array.isArray(inputs.napBlocks) && inputs.napBlocks.length > 0) {
    napBlocks = inputs.napBlocks.map(b => {
      let s = baseDate + t2m(b.start);
      let e = baseDate + t2m(b.end);
      if (e <= s) e += DAY;
      return { start: s, end: e };
    });
  }
  // Robust: always normalize anchor

  const anchor = normalizeAnchor((inputs as any).anchor);

  // Zeitumwandlung: robust für Mitternacht, modulo 24h, und DST-Vorbereitung
  // Wenn Datum vorhanden, rechne in absolute Minuten seit 1970-01-01 00:00 (UTC)
  let baseDate = 0;
  if (inputs.date) {
    // Basis: Mitternacht UTC dieses Datums
    baseDate = Date.parse(inputs.date + 'T00:00:00Z') / 60000; // Minuten seit 1970
  }
  const wake = baseDate + t2m(inputs.wake);
  let sleep = baseDate + t2m(inputs.sleep);
  if (sleep <= wake) sleep += DAY;


  // --- Mehrere Gym-Blöcke (empfohlen) ---
  let gymBlocks: Array<{ start: number; end: number; type?: string; priority?: number }> = [];
  if (Array.isArray(inputs.gymBlocks) && inputs.gymBlocks.length > 0) {
    gymBlocks = inputs.gymBlocks.map((b, idx) => {
      let s = baseDate + t2m(b.start);
      let e = baseDate + t2m(b.end);
      if (e <= s) e += DAY;
      return { start: s, end: e, type: b.type, priority: b.priority ?? idx };
    });
    // Nach Startzeit sortieren
    gymBlocks.sort((a, b) => a.start - b.start);
  } else if (inputs.isTrainingDay && inputs.gymStart && inputs.gymEnd) {
    // Legacy: Einzelner Block
    let s = baseDate + t2m(inputs.gymStart);
    let e = baseDate + t2m(inputs.gymEnd);
    if (e <= s) e += DAY;
    gymBlocks = [{ start: s, end: e, type: 'default', priority: 0 }];
  }
  const hasGym = gymBlocks.length > 0;

  // Hilfsfunktion: Zeit modulo 24h (für Rendering, falls benötigt)
  const mod24 = (min: number) => ((min % DAY) + DAY) % DAY;

  // HINWEIS: Für die Ausgabe/Anzeige sollten alle Zeiten wieder lokalisiert werden (DST, Zeitzone)
  // Beispiel: new Date((wake)*60000).toLocaleTimeString(...)

  const mk = (t:number,label:string,tags:Slot['tags']):Slot=>({ id:`${label}-${t}`, t, label, tags:[...tags], p:0,c:0,f:0,kcal:0 });

  const warnings: Warning[] = [];
  let anchors: Slot[] = [];
  // Frühstück (30–60 nach Wake, Standard = Mitte)
  const breakfastT = wake + snap15(mid(anchor.breakfastAfterWakeMin, anchor.breakfastAfterWakeMax));
  anchors.push(mk(breakfastT, 'Aufstehen', ['wake']));

  // Pre-Workout abhängig von preType
  const pickPreDelta = () => {
    const type = anchor.preType === 'auto'
      ? (inputs.mealsTarget >= 5 ? 'meal' : 'snack')
      : anchor.preType;
    return type === 'meal'
      ? snap15(mid(anchor.preMealMin, anchor.preMealMax))
      : snap15(mid(anchor.preSnackMin, anchor.preSnackMax));
  };

  // Post-Snack + Post-Meal
  const postSnackDelta = snap15(mid(anchor.postSnackMin, anchor.postSnackMax));
  const postMealDelta  = snap15(mid(anchor.postMealMin,  anchor.postMealMax));

  // Vor dem Schlaf (60–90)
  const preSleepDelta  = snap15(mid(anchor.preSleepMin,  anchor.preSleepMax));


  // --- K3: KH-Fenster um Workout vs. Gym-Zeit ---
  if (hasGym) {
    // Für jeden Gym-Block Pre/Post erzeugen, mit Transportpuffer
    const transportBuffer = 15; // Minuten, min. Abstand vor/nach Gym
    gymBlocks.forEach((block, idx) => {
      // Pre-Workout: so nah wie möglich vor Block, aber nicht vor Wake und mit Puffer
      let preDelta = Math.max(pickPreDelta(), transportBuffer);
      let preT = block.start - preDelta;
      if (preT < wake) {
        preT = wake;
        preDelta = block.start - wake;
        warnings.push({ type: 'gap', msg: `Pre-Workout-Fenster (Block ${idx+1}) wurde gekürzt, um in die Wachzeit zu passen.` });
      }
      // Puffer: Pre-Snack nicht in die Umkleide schieben
      if (block.start - preT < transportBuffer) {
        preT = block.start - transportBuffer;
        warnings.push({ type: 'gap', msg: `Pre-Workout (Block ${idx+1}) wurde wegen Transportpuffer angepasst.` });
      }
      if (preT <= sleep) anchors.push(mk(preT, `Pre-Workout${gymBlocks.length>1?` #${idx+1}`:''}`, ['pre']));

      // Post-Snack: so nah wie möglich nach Block, aber nicht nach Sleep und mit Puffer
      let postDelta = Math.max(postSnackDelta, transportBuffer);
      let postSnackT = block.end + postDelta;
      if (postSnackT > sleep) {
        postSnackT = sleep;
        postDelta = sleep - block.end;
        warnings.push({
          type: 'gap',
          msg: `Post-Workout-Fenster passt nicht komplett hinter dein Gym-Ende. Ich habe den Post-Snack direkt nach Gym-Ende gesetzt und den KH-Peak gekürzt.`
        });
      }
      // Puffer: Post-Snack nicht direkt nach Gym-Ende
      if (postSnackT - block.end < transportBuffer) {
        postSnackT = block.end + transportBuffer;
        warnings.push({ type: 'gap', msg: `Post-Workout (Block ${idx+1}) wurde wegen Transportpuffer angepasst.` });
      }
      if (postSnackT <= sleep) anchors.push(mk(postSnackT, `Post-Workout${gymBlocks.length>1?` #${idx+1}`:''}`, ['post']));

      // „Vollmahlzeit nach Sport“: optional, wird nur hinzugefügt, wenn erlaubt
      if (inputs.includePostMeal !== false) {
        let postMealT = block.end + postMealDelta;
        if (postMealT > sleep) postMealT = sleep;
        if (postMealT <= sleep) anchors.push(mk(postMealT, `Mahlzeit nach Training${gymBlocks.length>1?` #${idx+1}`:''}`, ['main']));
      }
    });
  }

  // „Vor dem Schlafen“
  anchors.push(mk(sleep - preSleepDelta, 'Vor dem Schlafen', ['sleep']));


  // Filter auf Wachzeit (keine Slots nach Schlafenszeit, robust für Mitternacht)
  anchors = anchors.filter(s => s.t >= wake && s.t <= sleep).sort((a,b)=>a.t-b.t);

  // --- Siesta/Nap-Filter: Entferne alle Slots, die in einem Nap-Block liegen ---
  if (napBlocks.length > 0) {
    anchors = anchors.filter(s => !napBlocks.some(nap => s.t >= nap.start && s.t < nap.end));
  }

  // Neue Hinweise
  const first = anchors.find(a=>a.tags.includes('wake'));
  const pre   = anchors.find(a=>a.tags.includes('pre'));
  if (first && pre && (pre.t - first.t) < 60) warnings.push({ type:'preTooClose', msg:'Pre-Workout < 60 min nach Frühstück → „leicht/Flüssig“ empfohlen.' });

  if (hasGym) {
    // Für jeden Gym-Block: Post-Workout-Warnung individuell prüfen
    gymBlocks.forEach((block, idx) => {
      // Finde den zugehörigen Post-Workout-Slot
      const post = anchors.find(a => a.tags.includes('post') && a.label.includes(`#${idx+1}`));
      if (post && (post.t - block.end) > 90) {
        warnings.push({ type: 'postTooLate', msg: `Post-Workout > 90 min nach Training (Block ${idx+1}) → Snack/Shake früher.` });
      }
    });
  }

  const minGap = inputs.minGapMin || 120;
  const targetGap = inputs.targetGapMin || 180;

  const addBetween = (a:Slot,b:Slot)=>{
    const gap=b.t-a.t;
    if (gap < minGap*2) return [] as Slot[];
    const n = Math.min(3, Math.round(gap/targetGap)-1);
    if (n<=0) return [];
    const step=Math.floor(gap/(n+1)); const out:Slot[]=[];
    for (let i=1;i<=n;i++) out.push(mk(a.t+step*i, 'Zwischenmahlzeit', ['main']));
    return out;
  };

  // --- K1: Zeit vs. Mahlzeitenanzahl Konfliktauflösung ---
  const spread = ()=>{
    let slots=[...anchors];
    // (a) Zielabstand auf Intervall [Mindestabstand, machbar] klippen
    let targetGapClipped = clamp(targetGap, minGap, Math.floor((sleep-wake)/(inputs.mealsTarget-1||1)));
    // (b) Mahlzeitenanzahl ggf. reduzieren/erhöhen innerhalb Bandbreite
    let mealsTarget = inputs.mealsTarget;
    const maxMeals = Math.floor((sleep-wake)/minGap)+1;
    if (mealsTarget > maxMeals) {
      warnings.push({
        type: 'mealsTarget',
        msg: `Mit ${mealsTarget} Mahlzeiten und ${Math.round(minGap/60)} h Mindestabstand sind in ${Math.round((sleep-wake)/60)} h Wachzeit nur ${maxMeals} Mahlzeiten möglich. Vorschlag: Zielabstand auf ${Math.floor(targetGap/60)} h${targetGap%60 ? ' ' + (targetGap%60) + ' min' : ''} senken oder auf ${maxMeals} Mahlzeiten reduzieren.`,
        slotIds: slots.map(s=>s.id)
      });
      mealsTarget = maxMeals;
    }
    if (mealsTarget < anchors.length) {
      warnings.push({
        type: 'mealsTarget',
        msg: `Mindestens ${anchors.length} Mahlzeiten nötig (Fixpunkte). Bitte Ziel erhöhen oder Zeiten anpassen.`,
        slotIds: slots.map(s=>s.id)
      });
      mealsTarget = anchors.length;
    }
    // (c) Feinsteuerfenster auf nächstmögliches Zeitfenster klippen (implizit durch snap15/mid)
    // Slots zwischen Ankern verteilen
    for (let i=0;i<slots.length-1;i++) {
      const mid=addBetween(slots[i],slots[i+1]);
      if (mid.length) slots.splice(i+1,0,...mid), i+=mid.length;
    }
    // Zusätzliche Slots einfügen, bis Ziel erreicht oder nicht mehr sinnvoll (mit Schutz gegen Endlosschleifen)
    let addGuard = 0;
    const addGuardMax = 100;
    while (slots.length < mealsTarget && addGuard++ < addGuardMax) {
      let maxGap = -1, idx = -1;
      for (let i = 0; i < slots.length - 1; i++) {
        const g = slots[i + 1].t - slots[i].t;
        if (g > maxGap) { maxGap = g; idx = i; }
      }
      if (idx >= 0 && maxGap >= minGap * 1.5) {
        slots.splice(idx + 1, 0, mk(slots[idx].t + Math.floor(maxGap / 2), 'Hauptmahlzeit', ['main']));
      } else break;
    }
    if (addGuard >= addGuardMax) {
      console.warn('Abbruch: Zu viele Iterationen beim Hinzufügen von Slots in spread(). Mögliche Endlosschleife verhindert.');
    }
    // Wenn zu viele Slots (z.B. durch viele Anker), entferne überzählige (außer Fixpunkte) (mit Schutz gegen Endlosschleifen)
    let removeGuard = 0;
    const removeGuardMax = 100;
    while (slots.length > mealsTarget && removeGuard++ < removeGuardMax) {
      // Entferne zuerst 'main', dann 'merged', nie 'wake','sleep','pre','post'
      const removable = slots.findIndex(s => s.tags.includes('main') && !(['wake','sleep','pre','post'] as Slot['tags']).some(t => s.tags.includes(t)));
      if (removable >= 0) slots.splice(removable, 1);
      else break;
    }
    if (removeGuard >= removeGuardMax) {
      console.warn('Abbruch: Zu viele Iterationen beim Entfernen von Slots in spread(). Mögliche Endlosschleife verhindert.');
    }
    // Warnings für nicht erfüllbare Wünsche
    if (slots.length < mealsTarget) {
      warnings.push({ type: 'mealsTarget', msg: `Die gewünschte Anzahl an Mahlzeiten (${mealsTarget}) kann im aktuellen Zeitfenster nicht sinnvoll verteilt werden.`, slotIds: slots.map(s=>s.id) });
    }
    if (slots.length > mealsTarget) {
      warnings.push({
        type: 'mealsTarget',
        msg: `Die gewünschte Anzahl an Mahlzeiten (${mealsTarget}) ist kleiner als die Anzahl der automatisch gesetzten Fixpunkte (z.B. Aufstehen, Schlafen, Training). Bitte wähle mehr Mahlzeiten oder passe die Zeiten an.`,
        slotIds: slots.map(s=>s.id)
      });
    }
    return slots;
  };

  let slots = spread().sort((a,b)=>a.t-b.t);
  // Nachträglicher Siesta/Nap-Filter für alle generierten Slots
  if (napBlocks.length > 0) {
    slots = slots.filter(s => !napBlocks.some(nap => s.t >= nap.start && s.t < nap.end));
  }

  // --- Sicherheitsnetz: Meals-Array dicht machen und Zeiten auffüllen (überschreibt keine vorhandenen Zeiten) ---
  setMeals(plan, Array.from({length: slots.length}, (_,i)=> slots[i] ?? { id:i, t: Number.NaN, kcal:0, p:0, c:0, f:0 }), "from-slots");
  // Direkt nach dem ersten Setzen der Meals aus den Slots:
  const mealsBackup: any[] = Array.isArray(plan.meals) ? plan.meals.map((m: any) => ({ ...m })) : [];
  if (__DEV__) console.debug("MEALS BACKUP", { len: mealsBackup.length });
  plan.meta = { wake, sleep, minGap };
  (function backfillTimesIfMissing(meals, wake, sleep, minGap){
    const isFiniteNum = (x:any) => typeof x === "number" && Number.isFinite(x);
    const missing = meals.some((m:any)=>!isFiniteNum(m.t));
    if (!missing) return;
    const n = meals.length, span = Math.max(0, sleep-wake);
    if (n <= 0 || span <= 0) return;
    for (let i=0;i<n;i++){ const frac = n===1 ? 0.5 : i/(n-1); meals[i].t = Math.round(wake + frac*span); }
    for (let i=1;i<n;i++){ const want = meals[i-1].t + minGap; if (meals[i].t < want) meals[i].t = want; }
    for (let i=n-2;i>=0;i--){ const maxA = meals[i+1].t - minGap; if (meals[i].t > maxA) meals[i].t = maxA; }
    for (let i=0;i<n;i++){ meals[i].t = Math.min(Math.max(meals[i].t, wake), sleep); }
  })(plan.meals, plan.meta?.wake ?? 0, plan.meta?.sleep ?? 24*60, plan.meta?.minGap ?? 0);

  if (__DEV__) {
  const missingT = plan.meals.filter((m: any) => !Number.isFinite(m.t)).length;
    console.debug("ensure times done", { meals: plan.meals.length, missingT });
  }
  // Auto-Fix: Merge zu kleine Gaps
  for (let i=0;i<slots.length-1;i++){
    const a=slots[i], b=slots[i+1]; const gap=b.t-a.t;
    if (gap<60) { const mid=a.t+Math.floor(gap/2); a.t=mid; a.label=`${a.label} + ${b.label}`; a.tags=Array.from(new Set([...a.tags,...b.tags,'merged'])) as any; slots.splice(i+1,1); i--; }
  }
  // --- K4: Letzte Mahlzeit nahe Schlafen: ggf. nach vorne schieben ---
  if (slots.length>=2) {
    const lastIdx = slots.length-1;
    const beforeLastIdx = slots.length-2;
    const last = slots[lastIdx];
    const beforeLast = slots[beforeLastIdx];
    if (last.tags.includes('sleep')) {
      const gap = last.t - beforeLast.t;
      if (gap < minGap) {
        // Schiebe vorletzte Mahlzeit nach vorne, so dass minGap eingehalten wird
        const newT = last.t - minGap;
        if (newT > beforeLast.t - 15) { // nicht mit vorheriger kollidieren
          beforeLast.t = newT;
          warnings.push({ type: 'gap', msg: 'Letzte Mahlzeit wurde nach vorne verschoben, um Mindestabstand zum Schlafen einzuhalten.' });
        }
      }
    }
  }
  // Standard-Gap-Fix für alle anderen Slots
  for (let i=0;i<slots.length-1;i++){
    const a=slots[i], b=slots[i+1]; let gap=b.t-a.t;
    if (gap<minGap) {
      const need=minGap-gap; const shift=clamp(need,15,30);
      if (b.t+shift<=sleep) b.t+=shift; else if (a.t-shift>=wake) a.t-=shift;
      gap=b.t-a.t; if (gap<minGap) {/* Warning im Ergebnis */}
    }
  }
  if (hasGym) {
    // Für jeden Gym-Block: Post-Workout-Warnung individuell prüfen (nach Slot-Generierung)
    gymBlocks.forEach((block, idx) => {
      const post = slots.find(s => s.tags.includes('post') && s.label.includes(`#${idx+1}`));
      if (post && (post.t - block.end) > 90) {
        warnings.push({ type: 'postTooLate', msg: `Post-Workout >90 min nach Training (Block ${idx+1}). Snack/Shake früher empfohlen.` });
      }
    });
  }

  // Auto-Fix erst, wenn überhaupt kcal vergeben wurden
  if (slots.some(s => (s.kcal || 0) > 0)) {
    slots = slots.filter(s => (s.explicitZero === true) || s.kcal >= 5);
  }

  // Makroziele aus normalisierten Targets
  const totals = { protein: targets.p, carbs: targets.c, fat: targets.f, kcal: targets.kcal };
  const invErrors = checkInvariants(slots, totals, wake, sleep, minGap);
  // if (invErrors.length) {
  //   // K6: Harte Fehlermeldung mit Fix-Vorschlag
  //   let fix = '';
  //   if (invErrors.some(e => /Abstand|Gap|zu eng|zu kurz/.test(e))) {
  //     fix = 'Vorschlag: Weniger Mahlzeiten wählen oder Zeitfenster verlängern.';
  //   } else if (invErrors.some(e => /Makro|Protein|Fett|KH|carb|fat|protein/.test(e))) {
  //     fix = 'Vorschlag: Makroziele anpassen oder Mahlzeitenanzahl ändern.';
  //   } else {
  //     fix = 'Vorschlag: Eingaben prüfen und ggf. anpassen.';
  //   }
  //   // throw new Error('Unlösbarer Plan: ' + invErrors.join('; ') + (fix ? ' — ' + fix : ''));
  // }

  const n=slots.length;


  // --- P2: Makro-Schichten ---

  // --- H2: Nutzerrestriktionen (z. B. Fettlimit am Abend) stechen Presets ---
  const preset = (inputs as any).preset || 'standard';
  const lowFatEvening = !!(inputs as any).lowFatEvening;
  const userFatLimitEvening = (inputs as any).userFatLimitEvening ?? null; // z. B. { idx: number, max: number }

  // --- Slot indices ---
  const bw = inputs.bodyWeightKg ?? 0;
  const preIdx   = slots.findIndex(s => s.tags.includes('pre'));
  const postIdx  = slots.findIndex(s => s.tags.includes('post'));
  const sleepIdx = slots.findIndex(s => s.tags.includes('sleep'));
  const wakeIdx  = slots.findIndex(s => s.tags.includes('wake'));
  const eveningIdx = (() => {
    const cand = slots
      .map((s,i)=>({i,s}))
      .filter(x => !x.s.tags.some(t=> t==='pre'||t==='post'||t==='sleep'||t==='wake'));
    return cand.length ? cand[cand.length-1].i : -1;
  })();

  // ---- Protein: gleichmäßig + Floors (Pre/Post ≥0.3 g/kg, Schlaf 0.45–0.5 g/kg) ----
  let pAlloc = Array(n).fill(totals.protein / n);
  const idxPre   = preIdx;
  const idxPost  = postIdx;
  const idxSleep = sleepIdx;

  const base = pAlloc[0] || 0;
  const floorPre   = bw ? Math.max(base, 0.30*bw) : base;
  const floorPost  = bw ? Math.max(base, 0.30*bw) : base;
  const floorSleep = bw ? Math.max(base, 0.45*bw) : base;

  const raise = (i:number, f:number)=>{ if(i<0) return 0; const inc=Math.max(0,f-pAlloc[i]); pAlloc[i]+=inc; return inc; };
  let added = 0;
  added += raise(idxPre, floorPre);
  added += raise(idxPost, floorPost);
  added += raise(idxSleep, floorSleep);

  // proportional aus Nicht-Floor-Slots kürzen
  if (added > 0) {
    const freeIdx = pAlloc.map((_,i)=>i).filter(i=> i!==idxPre && i!==idxPost && i!==idxSleep);
    const freeSum = freeIdx.reduce((acc,i)=> acc + pAlloc[i], 0);
    if (freeSum > 0) {
      const scale = (freeSum - added) / freeSum;
      freeIdx.forEach(i => pAlloc[i] *= scale);
    }
  }
  // --- Protein-Mindestziel pro Hauptmahlzeit (optional, K5) ---
  // (wird nach cAlloc/fAlloc-Initialisierung geprüft)
  pAlloc = pAlloc.map(x => Math.max(0, roundToStep(x)));
  pAlloc = fixSum(pAlloc, totals.protein, STEP, [idxSleep, idxPost, idxPre, ...pAlloc.map((_,i)=>i).filter(i=>![idxSleep,idxPost,idxPre].includes(i))]);

  // ---- Carbs: Presets (Summe exakt) ----
  // Zentrale Preset-Gewichte für KH (ausgelagert)
      const weightsC = buildCarbPresetWeights(inputs, plan.meals);
      if (typeof console !== 'undefined' && console.debug) {
  console.debug('PRESET', inputs?.preset, 'roles', plan.meals.map((m:any)=>m.role), 'weights', weightsC);
      }
  const seedC = (inputs?.offset ?? 0) % (plan.meals?.length || 1);
  const cSplit = lrIntSplitSeeded(Math.round(totals.carbs), weightsC, seedC);
  let cAlloc = cSplit.slice();

  cAlloc = cAlloc.map(x => Math.max(0, roundToStep(x)));
  // Nach Seeded-Split: keine weitere Restvergabe oder fixSum für KH!


  // --- Protein-Mindestziel pro Hauptmahlzeit (optional, K5) ---
  // (jetzt nach fAlloc-Initialisierung)
  let _proteinAdded = 0;
  if (minProteinPerMainMeal > 0) {
    // Hauptmahlzeiten: alle ohne pre/post/sleep/wake
    const mainIdx = slots.map((s,i)=>i).filter(i=>!slots[i].tags.some(t=>t==='pre'||t==='post'||t==='sleep'||t==='wake'));
    let proteinAdded = 0;
    mainIdx.forEach(i => {
      if (pAlloc[i] < minProteinPerMainMeal) {
        proteinAdded += minProteinPerMainMeal - pAlloc[i];
        pAlloc[i] = minProteinPerMainMeal;
      }
    });
    // KH/Fett proportional kürzen, falls Protein erhöht wurde
    if (proteinAdded > 0) {
  // Verfügbare KH-Summe
  let cSum = cAlloc.reduce((a,b)=>a+b,0);
  let cScale = cSum > 0 ? (cSum - proteinAdded/2) / cSum : 1;
  cAlloc = cAlloc.map(x => Math.max(0, x * cScale));
  // Merke proteinAdded für spätere Fett-Skalierung
  _proteinAdded = proteinAdded;
    }
  }


  // --- Fettverteilung inkl. P1-Proportionalitätsregel ---
  let fAlloc = Array(n).fill(0);
  const capWO = 12; // Pre/Post-Deckel
  if (idxPre  >= 0) fAlloc[idxPre]  = Math.min(capWO, Math.max(0, totals.fat * 0.05));
  if (idxPost >= 0) fAlloc[idxPost] = Math.min(capWO, Math.max(0, totals.fat * 0.05));

  // Rest gleichmäßig auf Nicht-Pre/Post
  // Seeded split for remaining fat
  const nF = fAlloc.length || 1;
  const seedF = (inputs?.offset ?? 0) % nF;
  const fatWeights = fAlloc.map((v,i) => (i === idxPre || i === idxPost) ? 0 : 1);
  const fatTotal = Math.round(totals.fat - (fAlloc[idxPre]||0) - (fAlloc[idxPost]||0));
  const fatSplit = lrIntSplitSeeded(fatTotal, fatWeights, seedF);
  for (let i=0;i<nF;i++) if (i !== idxPre && i !== idxPost) fAlloc[i] = (fAlloc[i]||0) + fatSplit[i];

  // Nachträgliche Fett-Skalierung, falls Protein erhöht wurde
    if (typeof _proteinAdded !== 'undefined' && _proteinAdded > 0) {
      let fSum = fAlloc.reduce((a,b)=>a+b,0);
      let fScale = fSum > 0 ? (fSum - _proteinAdded/2) / fSum : 1;
      fAlloc = fAlloc.map(x => Math.max(0, x * fScale));
    }

  // K2: Nutzerlimit für Abend (userFatLimitEvening) ist bindend
  // P1: Proportionalitätsregel – abgezogener Anteil wird proportional zur ursprünglichen Zielzuweisung verteilt
  if (userFatLimitEvening && userFatLimitEvening.idx >= 0) {
    const over = Math.max(0, fAlloc[userFatLimitEvening.idx] - userFatLimitEvening.max);
    if (over > 0) {
      // Zielzuweisung vor Abzug merken
      const origAlloc = [...fAlloc];
      fAlloc[userFatLimitEvening.idx] -= over;
      const allowed = fAlloc.map((_:number,i:number)=>i).filter((i:number)=>i!==userFatLimitEvening.idx);
      const weights = allowed.map((i:number) => origAlloc[i]);
      const weightSum = weights.reduce((a:number,b:number)=>a+b,0);
      if (weightSum > 0) {
        allowed.forEach((i:number,idx:number) => fAlloc[i] += over * (weights[idx]/weightSum));
      } else {
        allowed.forEach((i:number) => fAlloc[i] += over / allowed.length);
      }
      warnings.push({
        type: 'invariant',
        msg: `Das Fettlimit am Abend (≤ ${userFatLimitEvening.max}g) kollidiert mit deinem Preset. Ich habe die Abend-Fette gedeckelt und die Restkcal proportional auf frühere Mahlzeiten verteilt.`
      });
    }
  }

  // Abend-/Schlaf-Deckel für leanPM
  const capEven = 10;
  const applyLeanPMCaps = () => {
    if (preset !== 'leanPM') return 0;
    let removed = 0;

    // Abend-Index = letzter Main vor Schlaf (ohne pre/post/sleep/wake)
    const eveningIdx = (() => {
      const cand = slots
        .map((s,i)=>({i,s}))
        .filter(x => !x.s.tags.some(t=> t==='pre'||t==='post'||t==='sleep'||t==='wake'));
      return cand.length ? cand[cand.length-1].i : -1;
    })();

    const caps: Array<[number, number]> = [];
    if (eveningIdx >= 0) caps.push([eveningIdx, capEven]);
    if (idxSleep   >= 0) caps.push([idxSleep,   capEven]);   // << NEU: Schlaf deckeln

    for (const [i, cap] of caps) {
      const over = Math.max(0, fAlloc[i] - cap);
      if (over > 0) { fAlloc[i] -= over; removed += over; }
    }

    // Umverteilung: auf alle erlaubten Slots (nicht Pre/Post/Abend/Schlaf)
    const forbidden = new Set<number>([idxPre, idxPost, eveningIdx, idxSleep].filter(i=>i>=0));
    const targets = fAlloc.map((_,i)=>i).filter(i => !forbidden.has(i));
    const tlen = targets.length || fAlloc.length; // Fallback: notfalls auf alle außer Pre/Post
    const realTargets = targets.length ? targets : fAlloc.map((_,i)=>i).filter(i => i!==idxPre && i!==idxPost);

    const add = removed / tlen;
    realTargets.forEach(i => fAlloc[i] += add);

    return removed;
  };

  // Deckel anwenden, runden, exakte Summe wiederherstellen
  applyLeanPMCaps();
  fAlloc = fAlloc.map(x => Math.max(0, roundToStep(x)));
  // (bereits oben erledigt)
  {
    // Priorität: NICHT Pre/Post/Abend/Schlaf zuerst anpassen, damit Deckel stabil bleiben
    const eveningIdx = (() => {
      const cand = slots
        .map((s,i)=>({i,s}))
        .filter(x => !x.s.tags.some(t=> t==='pre'||t==='post'||t==='sleep'||t==='wake'));
      return cand.length ? cand[cand.length-1].i : -1;
    })();
    const forbidden = new Set<number>([idxPre, idxPost, eveningIdx, idxSleep].filter(i=>i>=0));
    const pref = fAlloc.map((_,i)=>i).filter(i => !forbidden.has(i));
  fAlloc = fixSum(fAlloc, totals.fat, STEP, [...pref, idxSleep, eveningIdx, idxPost, idxPre]);
  }


  // Sicherstellen, dass Caps nach fixSum nicht wieder verletzt werden
  if (preset === 'leanPM') {
    const eveningIdx = (() => {
      const cand = slots
        .map((s,i)=>({i,s}))
        .filter(x => !x.s.tags.some(t=> t==='pre'||t==='post'||t==='sleep'||t==='wake'));
      return cand.length ? cand[cand.length-1].i : -1;
    })();

    let removed2 = 0;
    if (eveningIdx >= 0) { const over = Math.max(0, fAlloc[eveningIdx] - capEven); if (over) { fAlloc[eveningIdx] -= over; removed2 += over; } }
    if (idxSleep   >= 0) { const over = Math.max(0, fAlloc[idxSleep]   - capEven); if (over) { fAlloc[idxSleep]   -= over; removed2 += over; } }

    if (removed2 > 0) {
      const forbidden = new Set<number>([idxPre, idxPost, eveningIdx, idxSleep].filter(i=>i>=0));
      const targets = fAlloc.map((_,i)=>i).filter(i => !forbidden.has(i));
      const tlen = targets.length || fAlloc.length;
      const add = removed2 / tlen;
      (targets.length ? targets : fAlloc.map((_,i)=>i).filter(i => i!==idxPre && i!==idxPost))
        .forEach(i => fAlloc[i] += add);

      fAlloc = fAlloc.map(x => Math.max(0, roundToStep(x)));
      const pref = fAlloc.map((_,i)=>i).filter(i => !forbidden.has(i));
      fAlloc = fixSum(fAlloc, totals.fat, STEP, [...pref, idxSleep, eveningIdx, idxPost, idxPre]);
    }
  }

  // --- Protein-Mindestziel pro Hauptmahlzeit (optional, K5) ---
  if (minProteinPerMainMeal > 0) {
    // Hauptmahlzeiten: alle ohne pre/post/sleep/wake
    const mainIdx = slots.map((s,i)=>i).filter(i=>!slots[i].tags.some(t=>t==='pre'||t==='post'||t==='sleep'||t==='wake'));
    let proteinAdded = 0;
    mainIdx.forEach(i => {
      if (pAlloc[i] < minProteinPerMainMeal) {
        proteinAdded += minProteinPerMainMeal - pAlloc[i];
        pAlloc[i] = minProteinPerMainMeal;
      }
    });
    // KH/Fett proportional kürzen, falls Protein erhöht wurde
    if (proteinAdded > 0) {
      // Verfügbare KH/Fett-Summe
      let cSum = cAlloc.reduce((a,b)=>a+b,0);
      let fSum = fAlloc.reduce((a,b)=>a+b,0);
      let total = cSum + fSum;
      if (total > 0) {
        let cScale = cSum > 0 ? (cSum - proteinAdded/2) / cSum : 1;
        let fScale = fSum > 0 ? (fSum - proteinAdded/2) / fSum : 1;
        cAlloc = cAlloc.map(x => Math.max(0, x * cScale));
        fAlloc = fAlloc.map(x => Math.max(0, x * fScale));
      }
    }
  }

  // --- Finale Equalizer-Phase (ersetzt durch finalizeTotals) ----
  const eveningIdxFinal = (() => {
    const cand = slots
      .map((s,i)=>({i,s}))
      .filter(x => !x.s.tags.some(t=> t==='pre'||t==='post'||t==='sleep'||t==='wake'));
    return cand.length ? cand[cand.length-1].i : -1;
  })();
  const forbidFatIdx = [idxPre, idxPost, eveningIdxFinal, idxSleep].filter(i => i != null && i >= 0);
  // Schütze explicitZero-Slots vor Auto-Rebalancing: exclude sie aus der Verteilung
  const nonZeroIdx = slots.map((s,i)=>s.explicitZero===true?null:i).filter(i=>i!==null) as number[];

  // >>> CRITICAL: Preset-Zuweisungen wirklich anwenden
  if (Array.isArray(slots) && slots.length) {
    // Falls die Arrays nicht existieren, Fallbacks auf 0
    const n = slots.length;
    const P = (typeof pAlloc !== 'undefined' && Array.isArray(pAlloc)) ? pAlloc : Array(n).fill(0);
    const C = (typeof cAlloc !== 'undefined' && Array.isArray(cAlloc)) ? cAlloc : Array(n).fill(0);
    const F = (typeof fAlloc !== 'undefined' && Array.isArray(fAlloc)) ? fAlloc : Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      // negative/NaN verhindern
      const p = Number.isFinite(P[i]) ? Math.max(0, P[i]) : 0;
      const c = Number.isFinite(C[i]) ? Math.max(0, C[i]) : 0;
      const f = Number.isFinite(F[i]) ? Math.max(0, F[i]) : 0;

      slots[i].p = p;
      slots[i].c = c;   // <<< HIER wird die KH-Verteilung fest auf die Slots geschrieben
      slots[i].f = f;
    }
    console.debug('APPLIED PRESET ALLOCATION -> P/C/F Arrays to slots');
  }
  finalizeTotals(slots, { protein: totals.protein, carbs: totals.carbs, fat: totals.fat }, [...forbidFatIdx, ...slots.map((s,i)=>s.explicitZero===true?i:null).filter(i=>i!==null)]);

  // --- Protein-Mindestziel pro Hauptmahlzeit (optional, K5) ---
  if (minProteinPerMainMeal > 0) {
    // Hauptmahlzeiten: alle ohne pre/post/sleep/wake
    const mainIdx = slots.map((s,i)=>i).filter(i=>!slots[i].tags.some(t=>t==='pre'||t==='post'||t==='sleep'||t==='wake'));
    let proteinAdded = 0;
    mainIdx.forEach(i => {
      if (slots[i].p < minProteinPerMainMeal) {
        proteinAdded += minProteinPerMainMeal - slots[i].p;
        slots[i].p = minProteinPerMainMeal;
      }
    });
    // KH/Fett proportional kürzen, falls Protein erhöht wurde
    if (proteinAdded > 0) {
      // Verfügbare KH/Fett-Summe (nur in nicht-explicitZero-Slots)
      let cSum = slots.filter(s=>!s.explicitZero).reduce((a,s)=>a+s.c,0);
      let fSum = slots.filter(s=>!s.explicitZero).reduce((a,s)=>a+s.f,0);
      let total = cSum + fSum;
      if (total > 0) {
        let cScale = cSum > 0 ? (cSum - proteinAdded/2) / cSum : 1;
        let fScale = fSum > 0 ? (fSum - proteinAdded/2) / fSum : 1;
        slots.forEach(s => {
          if (!s.explicitZero) {
            s.c = Math.max(0, s.c * cScale);
            s.f = Math.max(0, s.f * fScale);
          }
        });
      }
    }
  }


  // --- Makro-Fallback: Wenn noch keine Makros gesetzt sind, baseline verteilen ---
  // (Σ-Prüfung entfernt, wird jetzt nur noch im End-Validator geprüft)

  // --- Sanfte Absicherung: Meals-Array dicht machen, Zeiten auffüllen, Sanity-Log ---
  slots = densifyMeals(
    slots as any[],
    slots.length, // falls du die Anzahl als input.mealsTarget hast, nutze die
    (i) => ({ id: i, t: Number.NaN, kcal: 0, p: 0, c: 0, f: 0 })
  );

  backfillTimesIfMissing(
    slots as any[],
    (inputs as any).meta?.wake ?? 0,
    (inputs as any).meta?.sleep ?? 24*60,
    (inputs as any).meta?.minGap ?? 0
  );


  // --- FINAL SAFETY NET (vor validatePlan) ---
  // (Σ-Prüfungen entfernt, werden jetzt nur noch im End-Validator geprüft)

  // --- /FINAL SAFETY NET ---

  if (__DEV__) {
    const t = computeTotals(slots);
    console.debug("Pre-validate totals", t);
  }

  if (__DEV__) {
    const missingT = slots.filter(m => !isFiniteNum(m.t!)).length;
    console.debug("Sanity vor validatePlan", {
      meals: slots.length,
      missingT,
      sumKcal: slots.reduce((a,m)=>a+(m.kcal||0),0)
    });
  }

  // Ensure warnings is always an array and never overwritten if already present
  const planObj = { meals: slots.sort((a,b)=>a.t-b.t), warnings: Array.isArray(plan?.warnings) ? plan.warnings : warnings };
  // Endgültige Finalisierung und Validierung (inkl. Σ-Check nur hier)
  // Restore or rebuild meals if empty before final validation
  if (!Array.isArray(planObj.meals) || planObj.meals.length === 0) {
    if (mealsBackup.length > 0) {
      planObj.meals = mealsBackup.map(m => ({ ...m }));
      if (__DEV__) console.warn("RESTORE meals from backup", { len: planObj.meals.length });
      if (!planObj.warnings) planObj.warnings = [];
      planObj.warnings.push({
        type: 'plan-empty',
        msg: 'Kein gültiger Plan konnte generiert werden. Die letzte berechnete Mahlzeitenverteilung wurde wiederhergestellt. Bitte überprüfe deine Einstellungen.'
      });
      // kein early return → weiter unten Makro-Allokation & Finalisierung
    } else {
      const n = Math.max(1, (inputs as any).mealsCount ?? 3);
      planObj.meals = Array.from({ length: n }, (_, i) => ({
        id: String(i),
        t: Number.NaN,
        label: `Fallback ${i+1}`,
        tags: [],
        kcal: 0, p: 0, c: 0, f: 0
      }));
      if (__DEV__) console.warn("REBUILD meals fallback", { len: planObj.meals.length });
      if (!planObj.warnings) planObj.warnings = [];
      planObj.warnings.push({
        type: 'plan-empty',
        msg: 'Kein gültiger Plan konnte generiert werden. Bitte überprüfe deine Einstellungen und Eingaben.'
      });
      // echter Notfall: absolut leer → hier bleibt der early return
      return _normalizePlanOutput(planObj, targets);
    }
  }
  // Deterministischer Ablauf (B): Makros zweimal-stufig allokieren, falls noch nicht gesetzt
  allocateAllMacrosIfEmpty(planObj.meals, { p: totals.protein, c: totals.carbs, f: totals.fat });

  // Notfall: Mindestabstand erzwingen, falls nötig
  enforceTargetGap(planObj.meals, (inputs?.targetGapMin ?? 120));
  if (__DEV__) console.debug("CALL finalizeAndValidate", { meals: planObj.meals?.length });

  // --- Makro-Bounds-Integration (Prompt M4) ---
  // Use or create warnings array
  const planWarnings = Array.isArray(planObj?.warnings) ? planObj.warnings : (planObj.warnings = []);
  // Compute targets from totals
  // targets werden jetzt immer oben normalisiert und totals abgeleitet
  const bounds = buildMealBounds(planObj, inputs);
  applyProteinBaseline(planObj.meals, bounds, 20);
  // Seed für deterministische Restvergabe
  const seed = (inputs?.offset ?? 0) % (planObj.meals?.length || 1);
  fixMacroSumsRespectingBounds(planObj, targets, bounds, ['c','f','p'], planWarnings, seed);

  // Protein-Schutznetz: gezieltes Top-Up, falls nach erstem Durchlauf noch Unterdeckung besteht
  {
    const sumP = planObj.meals.reduce((a,m)=> a + (Number.isFinite(m?.p) ? Math.round(m.p) : 0), 0);
    const needP = Math.round(targets.p) - sumP;
    if (needP !== 0) {
      // zweiter, gezielter Durchlauf nur für Protein
  fixMacroSumsRespectingBounds(planObj, targets, bounds, ['p'], planWarnings, seed);
    }
  }
  reconcileKcalExactBounded(planObj.meals, targets.kcal, bounds, planWarnings);
  finalizeAndValidate(planObj, targets, bounds, planWarnings);


  // --- ADVANCED FINAL MACRO SUM CORRECTION (modular, flag-sicher) ---
  if (Array.isArray(planObj.meals) && planObj.meals.length > 0) {
    const slots = planObj.meals as Slot[];
    // Configurable: enable/disable advanced sum correction
    const enableFinalSumCorrection = true; // set false to disable
    if (enableFinalSumCorrection) {
      // Helper: get neutral slots (not explicitZero, not user-capped/min, not pre/post/sleep/wake)
      const isNeutral = (s: Slot) => !s.explicitZero && s.userCap === undefined && s.userMin === undefined && !(s.tags && s.tags.some((t: string) => ['pre','post','sleep','wake'].includes(t)));
      // For each macro, collect neutral slot indices
      const getNeutralIdx = (macro: 'p'|'c'|'f') => slots.map((s,i)=>isNeutral(s)?i:null).filter((i): i is number => i!==null);
      // Correction function: tries to match sum using only neutral slots, respecting per-slot caps/minima
      function correctMacroSum(macro: 'p'|'c'|'f', target: number, step=5): boolean {
        // 1. Prepare arrays
        const neutralIdx = getNeutralIdx(macro);
        if (neutralIdx.length === 0) return false;
        let arr = neutralIdx.map(i => Math.round(((slots[i][macro] ?? 0)/step))*step);
        // 2. Compute current sum (all slots)
        const sumAll = slots.reduce((a,s)=>a+Math.round(((s[macro] ?? 0)/step))*step,0);
        const diff = target - sumAll;
        if (!diff) return true;
        // 3. Try to fix sum using only neutral slots
        let arrNew = arr.slice();
        let steps = Math.floor(Math.abs(diff)/step);
        const dir = diff > 0 ? step : -step;
        let i = 0, guard = steps * Math.max(1, arr.length) + 1000;
        while (steps > 0 && guard-- > 0) {
          const idx = i % arr.length;
          const slotIdx = neutralIdx[idx];
          // Check per-slot caps/minima (if any)
          const s = slots[slotIdx];
          const next = arrNew[idx] + dir;
          if (next >= (s.userMin ?? 0) && (s.userCap === undefined || next <= s.userCap)) {
            arrNew[idx] = next;
            steps--;
          }
          i++;
        }
        // 4. If not all steps could be distributed, add warning
        if (steps > 0) {
          if (!planObj.warnings) planObj.warnings = [];
          planObj.warnings.push({
            type: 'invariant',
            msg: `Summe für ${macro} konnte nicht exakt auf Ziel ${target} gebracht werden, Rest: ${steps*step}g.`,
            slotIds: neutralIdx.map(i=>slots[i].id)
          });
        }
        // 5. Write back to slots
        neutralIdx.forEach((slotIdx, idx) => {
          slots[slotIdx][macro] = Math.max(0, arrNew[idx]);
        });
        // 6. Recompute kcal for all slots
        slots.forEach(s => { s.kcal = kcalOf(s.p ?? 0, s.c ?? 0, s.f ?? 0); });
        return steps === 0;
      }
      // Apply for each macro, aber für KH: gewichtete Restverteilung!
      correctMacroSum('p', targets.p, 5);
      // --- KH: Rest proportional zu Preset-Gewichten verteilen ---
      // Typen explizit, Slot als MealLike behandeln
      const weightsC = buildCarbPresetWeights(inputs, slots as any[]);
      function applyWeightedDelta(meals: any[], weights: number[], delta: number) {
        if (!delta) return;
        const abs = Math.abs(delta);
        const parts = lrIntSplitSeeded(abs, weights, `c-delta|${meals.length}`.length);
        for (let i = 0; i < meals.length; i++) {
          meals[i].c += Math.sign(delta) * parts[i];
        }
      }
      const totalC = Math.round(targets.c);
      const cSum = slots.reduce((s,m)=>s + Math.round(m.c||0), 0);
      applyWeightedDelta(slots, weightsC, totalC - cSum);
      correctMacroSum('f', targets.f, 5);
    }
  }

  return _normalizePlanOutput(planObj, targets);
}
