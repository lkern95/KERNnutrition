// Helper: erzwingt String für Prefill/UI
const asText = (v: any, fallback = '') => (v == null ? fallback : String(v));
// lokale Safe-Helper – keine Importe nötig
// Safe-Helper (einmalig, eindeutige Namen)
const asArray = <T,>(x: T[] | null | undefined): T[] => Array.isArray(x) ? x : [];
const safeNum = (x: unknown, d = 0) => (typeof x === "number" && Number.isFinite(x) ? x : d);
// Safe-Helper (lokal, keine Importe nötig)
/**
 * Hierarchie der Planer-Logik (wer sticht wen)
 *
 * H1: Zeiten-Block (Wachzeit, Gym-Start/Ende, Mahlzeitenanzahl, Mindest-/Zielabstand) ist Rahmen.
 *
 * H2: Nutzerrestriktionen (z. B. „Abend < 10 % Fett“) stechen Presets.
 *
 * H3: Presets steuern Verteilung innerhalb des Rahmens und unter Nutzerrestriktionen.
 *
 * H4: Timing-Feinsteuerung (z. B. „Frühstück 15–45 min nach Aufstehen“) wird bestmöglich erfüllt; bei Konflikt minimalinvasiv angepasst.
 *
 * H5: Schnell-Vorschläge sind Shortcuts, ändern nur Parameter der Ebenen H1–H4; danach läuft der vollständige Validierungs- und Auto-Fix-Prozess.
 */
/**
 * KERN Planer – Invarianten & Prioritäten (Tie-Breaker-Regeln)
 *
 * Unverletzbare Invarianten (werden immer zuerst und zuletzt geprüft):
 *
 * I1: Σ kcal(Meals) = kcal(Rechner); Σ Makros(Meals) = Makros(Rechner).
 *     → Die Summen der Kalorien und Makros aller Mahlzeiten müssen exakt den Rechnerwerten entsprechen.
 *
 * I2: Jede Mahlzeit liegt innerhalb [Aufstehen, Schlafen].
 *     → Keine Mahlzeit darf außerhalb des Wachzeitfensters liegen.
 *
 * I3: Keine negativen Makros, keine ungewollt 0-kcal-Mahlzeit.
 *     → Negative Werte werden auf 0 gesetzt; Mahlzeiten mit 0 kcal nur, wenn explizit gewünscht.
 *
 * I4: Abstände zwischen aufeinanderfolgenden Meals ≥ Mindestabstand.
 *     → Die zeitlichen Abstände zwischen den Mahlzeiten müssen mindestens dem Mindestabstand entsprechen.
 *
 * I5: Deterministische Rundung:
 *     Nach jeder Re-Allokation werden Rundungsreste per größtes-Rest-Verfahren auf die größten Zielbeiträge verteilt
 *     (erst kcal, dann Makros, Reihenfolge: Protein → KH → Fett).
 *     → Rundungsfehler werden so verteilt, dass das Ergebnis immer eindeutig und nachvollziehbar ist.
 *
 * I6: Stabilitätsgarantie:
 *     Jede Auto-Korrektur muss die Invarianten erneut validieren; im Zweifel: Fehlermeldung statt Schweigen.
 *     → Nach jeder automatischen Anpassung werden alle Invarianten erneut geprüft. Falls sie nicht erfüllbar sind, wird eine klare Fehlermeldung ausgegeben.
 */
// Preset-Optionen für die Verteilungsauswahl
const PRESET_OPTIONS = [
  // Trainingstag
  { value: 'standard', label: 'Training: Pre/Post-Fokus (empf.)', hint: '≈30 % Carbs vor, ≈40 % nach dem Training; Rest gleichmäßig.' },
  { value: 'amCarbs',  label: 'Training: Carbs morgens höher',     hint: 'Mehr Carbs bei Aufstehen/Mittag/Pre, Rest normal.' },
  { value: 'pmCarbs',  label: 'Training: Carbs abends höher',      hint: 'Mehr Carbs bei Post-Workout und Abend.' },
  { value: 'backload', label: 'Training: Backload (stark abends)', hint: 'Carbs stark in Post/Abend gebündelt.' },

  // Ruhetag
  { value: 'restEven', label: 'Ruhetag: gleichmäßig',              hint: 'Carbs gleichmäßig über alle Mahlzeiten.' },
  { value: 'restAM',   label: 'Ruhetag: AM-Carbs',                  hint: 'Morgens etwas mehr Carbs, Rest normal.' },

  // Besonderes
  { value: 'even',     label: 'Alle gleich (Neutral)',             hint: 'P/C/F gleichmäßig (keine Periodisierung).' },
  { value: 'leanPM',   label: 'Abend fettarm',                      hint: 'Fett in der Abendmahlzeit gedeckelt (≤ ~10 g).' },
] as const;

// Import the central computePlan function
import { computePlan } from '@/lib/planner/computePlan';
import { ensureFeasible, validatePlanCore } from '@/lib/planner/validatePlan';
console.log('computePlan.id', (computePlan as any).__id__);
  // Log im Render zur Laufzeit
  console.log('computePlan.id', (computePlan as any).__id__);


import React, { useMemo, useState, useEffect, useRef } from 'react';
// Hilfsfunktion für shallow compare
function shallowEqual(a: any[], b: any[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
import { Clock, Flame, Dumbbell, Moon, Sun, AlertTriangle, Download, Copy, RotateCcw, Info } from 'lucide-react';
import { useTotals, useProfile, usePlannerInputs } from '@/adapters/plannerSources';
import { MacroNum } from '@/components/MacroNum';
import MacroCircleIcon from '@/components/MacroCircleIcon';
import { useAppStore } from '@/store/appStore';

// ===== Helper =====
const DAY = 24 * 60;
const clamp = (n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const roundTo = (n:number,step:number)=>Math.round(n/step)*step;
const t2m = (t:string)=>{ const m=t.match(/^(\d{1,2}):(\d{2})$/); if(!m) return 0; return parseInt(m[1])*60+parseInt(m[2]); };
const m2t = (m:number)=>{ let x=((m%DAY)+DAY)%DAY; const hh=Math.floor(x/60), mm=x%60; return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`; };
const pct = (x:number,a:number,b:number)=> clamp((x-a)/(b-a),0,1)*100;

type Slot = { id:string; t:number; label:string; tags:Array<'pre'|'post'|'sleep'|'wake'|'main'|'merged'>; p:number; c:number; f:number; kcal:number; };
type Warning = { type:'gap'|'preTooClose'|'postTooLate'|'mealsTarget'; msg:string; slotIds?:string[] };

type PlanInputs = {
  wake: string; sleep: string;
  gymStart?: string; gymEnd?: string;
  isTrainingDay: boolean;
  mealsTarget: number; minGapMin: number; targetGapMin: number;
  kcal: number; protein: number; carbs: number; fat: number;
  bodyWeightKg?: number;
  preset?: 'standard' | 'even' | 'amCarbs' | 'pmCarbs' | 'backload' | 'restEven' | 'restAM' | 'leanPM';
};

// ===== Algorithmus (angepasst, keine eigenen Totals mehr) =====

// ===== UI =====
import { ReactNode } from 'react';
function StatTile({ icon:Icon, label, value, sub, color }: { icon?:any; label:string; value:React.ReactNode; sub?:string; color?:string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3 bg-surface shadow-soft text-sm">
      <div className="rounded-xl p-2 flex items-center justify-center">
        {color ? (
          <>
            {label === 'Fett' && <MacroCircleIcon macro="fat" size={24} />}
            {label !== 'Protein' && label !== 'Carbs' && label !== 'Fett' && <span className="block w-5 h-5 rounded-full" style={{backgroundColor: color}} />}
          </>
        ) : (
          Icon && <Icon className="w-5 h-5 text-neutral-700 dark:text-neutral-200" />
        )}
      </div>
      <div className="leading-tight">
        <div className="text-[11px] text-neutral-500 dark:text-neutral-400">{label}</div>
        <div className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-neutral-100">{value}</div>
        {sub && <div className="text-xs text-neutral-400 dark:text-neutral-500">{sub}</div>}
      </div>
    </div>
  );
}
function Chip({ children, onClick }: { children: React.ReactNode; onClick: ()=>void }) {
  return (
    <button
      onClick={onClick}
  className="kb-chip bg-background text-white"
    >
      {children}
    </button>
  );
}


export default function PlanerPage() {
  // State/Hooks
  const [inp, setInp, resetInp] = usePlannerInputs();

  // Nur für useMemo: Totals aus useTotals
  const totals = useTotals();
  const { weight } = useProfile();
  const [isUpdating, setIsUpdating] = useState(false);
  useEffect(() => { setIsUpdating(true); }, [inp]);
  useEffect(() => { setIsUpdating(false); }, [inp]);
  const [showWhy, setShowWhy] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const setTrainingDay = useAppStore((s:any)=> s.setTrainingDay)?.bind?.(null);
  const [showError, setShowError] = useState(false);

  // --- Neue Validator-Integration ---
  const feas = useMemo(() => ensureFeasible(inp), [inp]);

  // Makro-Inputs immer mit aktuellen Rechner-Werten überschreiben,
  // aber alle anderen Korrekturen (Timing, Flags etc.) aus ensureFeasible übernehmen
  const syncedInp = {
    ...feas.inputs, // Timing/Flags aus dem Validator übernehmen
    kcal: totals.kcal, protein: totals.protein, carbs: totals.carbs, fat: totals.fat // Totals NUR aus Rechner
  };

  // Defensive Ableitung direkt nach computePlan
  const res: any = computePlan(syncedInp); // oder dein useMemo-Aufruf

  // Harte End-Validierung gegen Rechner-Totals
  const slotsForValidation = res?.slots ?? res?.meals ?? res?.plan?.meals ?? [];
  validatePlanCore(
    { meals: slotsForValidation },
    { kcal: totals.kcal, p: totals.protein, c: totals.carbs, f: totals.fat }
  );

  // Debug-Ausgabe, falls kein Plan berechenbar
  if ((res?.slots ?? res?.meals ?? res?.plan?.meals ?? []).length === 0) {
    // eslint-disable-next-line no-console
    console.warn('Planer Debug: Eingaben (inp):', inp);
    // eslint-disable-next-line no-console
    console.warn('Planer Debug: computePlan Ergebnis:', res);
  }

  // Rohwerte robust ermitteln (egal ob der Core sie slots/meals/plan.meals nennt)
  const slotsRaw    = res?.slots ?? res?.meals ?? res?.plan?.meals ?? [];
  const warningsRaw = res?.warnings ?? res?.plan?.warnings ?? [];

  // In sichere Arrays wandeln
  const slots    = asArray(slotsRaw);
  const warnings = asArray(warningsRaw);

  // (Nur falls du weiter unten noch S/W verwendest:)
  const S = slots;
  const W = warnings;

  // sichere Totals (falls du sie anzeigst)
  const sumKcal = slots.reduce((a: number, s: any) => a + safeNum(s.kcal), 0);
  const sumP    = slots.reduce((a: number, s: any) => a + safeNum(s.p),    0);
  const sumC    = slots.reduce((a: number, s: any) => a + safeNum(s.c),    0);
  const sumF    = slots.reduce((a: number, s: any) => a + safeNum(s.f),    0);

  // Optionaler Empty-State: Nur anzeigen, wenn keine spezifische plan-empty-Warnung vorliegt
  const hasPlanEmptyWarning = warnings.some((w: any) => typeof w === 'object' && w.type === 'plan-empty');
  const showNoPlanHint = slots.length === 0 && !hasPlanEmptyWarning;

  const issues = useMemo(() => ([
    ...feas.notes,
    ...W.map((w: any) => ({ severity: 'warn', code: 'alg', msg: typeof w === 'string' ? w : w.msg }))
  ]), [feas.notes, W]);



  // DEV: QA log for sum of macros
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log(
  'ΣP', S.reduce((a: number, s: any) => a + safeNum(s.p), 0),
  'ΣC', S.reduce((a: number, s: any) => a + safeNum(s.c), 0),
  'ΣF', S.reduce((a: number, s: any) => a + safeNum(s.f), 0)
    );
  }
  // Keine JSX-Kommentare oder -Elemente außerhalb des Return-Statements!

  const wakeMin = t2m(inp.wake); let sleepMin = t2m(inp.sleep); if (sleepMin <= wakeMin) sleepMin += DAY;

  const copyJSON = async () => {
    const out = { inputs: inp, slots: S.map((s: any) => ({ time: m2t(s.t), label: s.label, tags: s.tags, p: s.p, c: s.c, f: s.f, kcal: s.kcal })) };
    await navigator.clipboard.writeText(JSON.stringify(out, null, 2));
  // alert('Plan als JSON kopiert');
  };
  const copyText = async () => {
    const lines = slots.map((s: any) => `${m2t(s.t)} ${s.label}: P ${s.p} g, C ${s.c} g, F ${s.f} g (${s.kcal} kcal)`);
    await navigator.clipboard.writeText(lines.join('\n'));
  // alert('Plan als Text kopiert');
  };

  // Slots grob verschieben → wir ändern passende Inputs
  const nudge = (slotId: string, delta: number) => {
  const s = slots.find((x: any) => x.id === slotId) as Slot | undefined;
  if (!s || !Array.isArray(s.tags)) return;
  if (s.tags.includes('pre')) setInp({ gymStart: m2t(t2m(inp.gymStart || '17:30') + delta) });
  else if (s.tags.includes('post')) setInp({ gymEnd: m2t(t2m(inp.gymEnd || '19:00') + delta) });
  else if (s.tags.includes('wake')) setInp({ wake: m2t(t2m(inp.wake) + delta) });
  else if (s.tags.includes('sleep')) setInp({ sleep: m2t(t2m(inp.sleep) + delta) });
  else setInp({ targetGapMin: clamp(inp.targetGapMin + (delta > 0 ? 15 : -15), 120, 300) });
  };

  // Für Stat-Tiles: Totals aus useTotals
  const kcalDisplay = totals.kcal;
  const proteinDisplay = totals.protein;
  const carbsDisplay = totals.carbs;
  const fatDisplay = totals.fat;
  // === Konsistentes Design: Gradient-Background, Header, Cards, Farben ===
  return (
    <div className="min-h-[100dvh] relative">
      {/* Hinweis, falls kein Plan berechenbar */}
      {showNoPlanHint && (
        <div className="bg-warning/10 border border-warning/20 rounded-2xl p-4 mb-4 text-warning text-center">
          Kein Plan berechenbar – bitte Einstellungen prüfen.
        </div>
      )}
      {/* Fehler-Popup */}
      {showError && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2 rounded-xl shadow-lg animate-pulse">
          Änderung konnte nicht übernommen werden!
        </div>
      )}
      {/* Hintergrund-Gradient wie Info/UebersichtPage */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#32174d] via-[#2c2837] to-[#292c2f]" />
      <div className="p-5 space-y-6">
        {/* Header */}
        <header className="pop-in">
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: '#ececec' }}>Planer</h1>
          <p className="text-sm mt-0.5" style={{ color: '#ececec99' }}>
            Verteile deine Kalorien & Makros optimal auf den Tag – personalisiert nach Training, Schlaf & Ziel.
          </p>
        </header>

        {/* Stat-Tiles */}
        <div className="container mx-auto max-w-5xl px-3 sm:px-4 py-4 sm:py-6 pb-[env(safe-area-inset-bottom)]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <StatTile icon={Flame} label="Tages-Kcal" value={<span className="font-bold text-2xl" style={{ color: '#ffd000' }}>{`${kcalDisplay} kcal`}</span>} />
            <StatTile color="#10b981" label="Protein" value={<MacroNum macro="protein" value={proteinDisplay} />} />
            <StatTile color="#3b82f6" label="Carbs" value={<MacroNum macro="carb" value={carbsDisplay} />} />
            <StatTile color="#f59e42" label="Fett" value={<MacroNum macro="fat" value={fatDisplay} />} />
          </div>
        </div>

        {/* Makro-Verteilung (Presets) Dropdown + Info */}
        <div className="mt-1">
          <div className="font-semibold text-base flex items-center gap-2" style={{ color: '#ececec' }}>
            Makro-Verteilung (Presets)
            <button
              type="button"
              onClick={() => setShowWhy(true)}
              className="text-neutral-300 hover:text-white"
              aria-label="Info zur Makro-Verteilung"
              title="Kurzinfo zu den Makro-Presets"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-2 max-w-md">
            <select
              className="w-full h-11 rounded-xl border border-[#32174d] bg-[#2c2837] text-[#ececec] p-2 text-base focus:ring-2 focus:ring-accent"
              value={inp.preset}
              onChange={(e) => setInp({ preset: e.target.value as any })}
            >
              <optgroup label="Trainingstag">
                {PRESET_OPTIONS.filter(o => ['standard', 'amCarbs', 'pmCarbs', 'backload'].includes(o.value)).map(o =>
                  <option key={o.value} value={o.value}>{o.label}</option>
                )}
              </optgroup>
              <optgroup label="Ruhetag">
                {PRESET_OPTIONS.filter(o => ['restEven', 'restAM'].includes(o.value)).map(o =>
                  <option key={o.value} value={o.value}>{o.label}</option>
                )}
              </optgroup>
              <optgroup label="Neutral/Besonders">
                {PRESET_OPTIONS.filter(o => ['even', 'leanPM'].includes(o.value)).map(o =>
                  <option key={o.value} value={o.value}>{o.label}</option>
                )}
              </optgroup>
            </select>

            {/* kleine Hint-Zeile zum aktuell gewählten Preset */}
            <div className="mt-1 text-xs text-neutral-300">
              {PRESET_OPTIONS.find(o => o.value === inp.preset)?.hint}
            </div>

            {/* Timing-Feinsteuerung */}
            <details className="mt-3 rounded-2xl border border-[#32174d] bg-[#2c2837] shadow-soft p-4" open>
              <summary className="text-base font-semibold mb-2 cursor-pointer select-none" style={{ color: '#ececec' }}>Timing (Feinsteuerung)</summary>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Frühstücksfenster */}
                <div className="rounded-xl border border-[#32174d] bg-[#2c2837] shadow-soft p-3">
                  <label className="text-sm" style={{ color: '#ececec' }}>
                    Frühstück nach Aufstehen
                    <select
                      className="mt-1 w-full h-11 rounded-xl border border-[#32174d] bg-[#2c2837] text-[#ececec] p-2 focus:ring-2 focus:ring-accent"
                      value={`${inp.anchor.breakfastAfterWakeMin}-${inp.anchor.breakfastAfterWakeMax}`}
                      onChange={e=>{
                        const [min,max]=e.target.value.split('-').map(Number);
                        setInp({ anchor: { ...inp.anchor, breakfastAfterWakeMin:min, breakfastAfterWakeMax:max }});
                      }}>
                      <option value="15-45">15–45 min (sehr früh)</option>
                      <option value="30-60">30–60 min (Standard)</option>
                      <option value="45-90">45–90 min (später)</option>
                    </select>
                  </label>
                </div>

                {/* Pre-Workout Typ */}
                <div className="rounded-xl border border-[#32174d] bg-[#2c2837] shadow-soft p-3">
                  <label className="text-sm" style={{ color: '#ececec' }}>
                    Pre-Workout
                    <select
                      className="mt-1 w-full h-11 rounded-xl border border-[#32174d] bg-[#2c2837] text-[#ececec] p-2 focus:ring-2 focus:ring-accent"
                      value={inp.anchor.preType}
                      onChange={e=> setInp({ anchor: { ...inp.anchor, preType: e.target.value as any }})}>
                      <option value="auto">Auto (abh. Mahlzeitenzahl)</option>
                      <option value="snack">Snack: 30–60 min vor WO</option>
                      <option value="meal">Mahlzeit: 2–3 h vor WO</option>
                    </select>
                  </label>
                </div>

                {/* Post-Workout Snack */}
                <div className="rounded-xl border border-[#32174d] bg-[#2c2837] shadow-soft p-3">
                  <label className="text-sm" style={{ color: '#ececec' }}>
                    Post-Workout Snack
                    <select
                      className="mt-1 w-full h-11 rounded-xl border border-[#32174d] bg-[#2c2837] text-[#ececec] p-2 focus:ring-2 focus:ring-accent"
                      value={`${inp.anchor.postSnackMin}-${inp.anchor.postSnackMax}`}
                      onChange={e=>{
                        const [min,max]=e.target.value.split('-').map(Number);
                        setInp({ anchor: { ...inp.anchor, postSnackMin:min, postSnackMax:max }});
                      }}>
                      <option value="0-30">0–30 min (sehr früh)</option>
                      <option value="15-60">15–60 min (Standard)</option>
                      <option value="30-60">30–60 min</option>
                    </select>
                  </label>
                </div>

                {/* Post-Workout Vollmahlzeit */}
                <div className="rounded-xl border border-[#32174d] bg-[#2c2837] shadow-soft p-3">
                  <label className="text-sm" style={{ color: '#ececec' }}>
                    Vollmahlzeit nach Training
                    <select
                      className="mt-1 w-full h-11 rounded-xl border border-[#32174d] bg-[#2c2837] text-[#ececec] p-2 focus:ring-2 focus:ring-accent"
                      value={`${inp.anchor.postMealMin}-${inp.anchor.postMealMax}`}
                      onChange={e=>{
                        const [min,max]=e.target.value.split('-').map(Number);
                        setInp({ anchor: { ...inp.anchor, postMealMin:min, postMealMax:max }});
                      }}>
                      <option value="60-90">60–90 min</option>
                      <option value="60-120">60–120 min (Standard)</option>
                      <option value="90-120">90–120 min (später)</option>
                    </select>
                  </label>
                </div>

                {/* Vor dem Schlafen */}
                <div className="rounded-xl border border-[#32174d] bg-[#2c2837] shadow-soft p-3">
                  <label className="text-sm" style={{ color: '#ececec' }}>
                    Vor dem Schlafen
                    <select
                      className="mt-1 w-full h-11 rounded-xl border border-[#32174d] bg-[#2c2837] text-[#ececec] p-2 focus:ring-2 focus:ring-accent"
                      value={`${inp.anchor.preSleepMin}-${inp.anchor.preSleepMax}`}
                      onChange={e=>{
                        const [min,max]=e.target.value.split('-').map(Number);
                        setInp({ anchor: { ...inp.anchor, preSleepMin:min, preSleepMax:max }});
                      }}>
                      <option value="45-75">45–75 min</option>
                      <option value="60-90">60–90 min (Standard)</option>
                      <option value="75-105">75–105 min</option>
                    </select>
                  </label>
                </div>
              </div>
              <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                Hinweis: Große Pre-WO-Mahlzeit 2–3 h vorher, Snack 30–60 min. Post-WO Snack ideal in 0–60 min, volle Mahlzeit 1–2 h danach.<br />
                Timing ist <b>wichtig</b>, aber nicht kritisch – Muskeln bleiben bis ~48 h hochsensitiv.
              </div>
            </details>
          </div>
        </div>

        {/* Info-Modal für Verteilung: immer am Ende, damit Overlay garantiert sichtbar */}
        {showWhy && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowWhy(false)}>
            <div
              className="rounded-2xl border border-[#32174d] bg-[#2c2837] shadow-soft p-4 sm:p-6 max-w-lg w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="font-semibold text-base flex items-center gap-2 mb-2" style={{ color: '#ececec' }}>
                <Info className="w-5 h-5 text-accent" /> Warum diese Verteilung?
              </div>
              <div className="text-sm space-y-2 text-neutral-200">
                <ul className="text-sm space-y-1">
                  <li><b>Training: Pre/Post-Fokus</b> – ≈30 % Carbs vor, ≈40 % nach dem Training.</li>
                  <li><b>Training: Carbs morgens höher</b> – Aufstehen/Mittag/Pre gewichtet.</li>
                  <li><b>Training: Carbs abends höher</b> – Post/Abend gewichtet.</li>
                  <li><b>Training: Backload</b> – starke Abend-Fokussierung.</li>
                  <li><b>Ruhetag: gleichmäßig</b> – Carbs gleich verteilt.</li>
                  <li><b>Ruhetag: AM-Carbs</b> – morgens leicht erhöht.</li>
                  <li><b>Alle gleich (Neutral)</b> – keine Periodisierung.</li>
                  <li><b>Abend fettarm</b> – Fett am Abend gedeckelt; Pre/Post bleiben fettarm.</li>
                </ul>
                <p className="text-xs mt-2">Protein gleichmäßig mit Floors (Pre/Post ≥0,3 g/kg; Schlaf 0,45–0,5 g/kg). Alle Makros 5-g-Rundung, Summe exakt.</p>
              </div>
              <div className="mt-3 text-right">
                <button className="kb-chip" onClick={() => setShowWhy(false)}>OK</button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="col-span-1 space-y-3">
            <div className="kb-card bg-[#2c2837] shadow-soft p-4 border border-[#32174d]">
              <div className="kb-title mb-2 flex items-center" style={{ color: '#ececec' }}>
                <Clock className="w-4 h-4" /> Zeiten
                {isUpdating && (
                  <span className="ml-2 text-[11px] text-neutral-300">aktualisiere…</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#32174d] bg-[#2c2837] shadow-soft p-3">
                  <label className="text-sm" style={{ color: '#ececec' }}>Aufstehen
                    <input
                      className="kb-input mt-1 w-full h-11 rounded-xl border bg-background text-white p-2 text-base"
                      type="time"
                      value={asText(inp.wake, '07:00')}
                      onChange={e => setInp({ wake: e.target.value })}
                    />
                  </label>
                </div>
                <div className="rounded-xl border border-[#32174d] bg-[#2c2837] shadow-soft p-3">
                  <label className="text-sm" style={{ color: '#ececec' }}>Schlafen
                    <input
                      className="kb-input mt-1 w-full h-11 rounded-xl border bg-background text-white p-2 text-base"
                      type="time"
                      value={asText(inp.sleep, '23:00')}
                      onChange={e => setInp({ sleep: e.target.value })}
                    />
                  </label>
                </div>
                <div className="rounded-xl border border-[#32174d] bg-[#2c2837] shadow-soft p-3">
                  <label className="text-sm" style={{ color: '#ececec' }}>Gym-Start
                    <input
                      disabled={!inp.isTrainingDay}
                      className="kb-input mt-1 w-full h-11 rounded-xl border bg-background text-white p-2 text-base"
                      type="time"
                      value={asText(inp.gymStart, '18:00')}
                      onChange={e => setInp({ gymStart: e.target.value })}
                    />
                  </label>
                </div>
                <div className="rounded-xl border border-[#32174d] bg-[#2c2837] shadow-soft p-3">
                  <label className="text-sm" style={{ color: '#ececec' }}>Gym-Ende
                    <input
                      disabled={!inp.isTrainingDay}
                      className="kb-input mt-1 w-full h-11 rounded-xl border bg-background text-white p-2 text-base"
                      type="time"
                      value={asText(inp.gymEnd, '19:00')}
                      onChange={e => setInp({ gymEnd: e.target.value })}
                    />
                  </label>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 text-sm">
                <label className="flex items-center gap-2 text-base" style={{ color: '#ececec' }}>
                  <input type="checkbox" className="h-5 w-5" checked={inp.isTrainingDay} onChange={e => { setInp({ isTrainingDay: e.target.checked }); try { setTrainingDay?.(e.target.checked); } catch { } }} />
                  Trainings-Tag
                </label>
                <label className="flex items-center gap-2 text-base" style={{ color: '#ececec' }}>
                  Mahlzeiten
                  <input
                    className="kb-input w-20 h-11 rounded-xl border bg-background text-white p-2 text-base text-center"
                    type="number"
                    min={4}
                    max={6}
                    value={inp.mealsTarget}
                    onChange={e => setInp({ mealsTarget: clamp(parseInt(e.target.value || '0'), 4, 6) })}
                  />
                </label>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <label style={{ color: '#ececec' }}>Min. Abstand (min)
                  <input
                    className="kb-input mt-1 w-full h-11 rounded-xl border bg-background text-white p-2 text-base"
                    type="number"
                    value={inp.minGapMin}
                    onChange={e => setInp({ minGapMin: clamp(parseInt(e.target.value || '0'), 90, 180) })}
                  />
                </label>
                <label style={{ color: '#ececec' }}>Ziel-Abstand (min)
                  <input
                    className="kb-input mt-1 w-full h-11 rounded-xl border bg-background text-white p-2 text-base"
                    type="number"
                    value={inp.targetGapMin}
                    onChange={e => setInp({ targetGapMin: clamp(parseInt(e.target.value || '0'), 120, 300) })}
                  />
                </label>
              </div>
            </div>

            <div className="kb-card bg-[#2c2837] shadow-soft p-4 border border-[#32174d]">
              <div className="kb-title mb-2" style={{ color: '#ececec' }}><Info className="w-4 h-4" /> Vorschläge</div>
              <div className="flex flex-wrap gap-2">
                <Chip onClick={() => setInp({ gymStart: m2t(t2m(inp.gymStart || '17:30') - 30), gymEnd: m2t(t2m(inp.gymEnd || '19:00') - 30) })}>Training früher</Chip>
                <Chip onClick={() => setInp({ gymEnd: m2t(t2m(inp.gymEnd || '19:00') + 30) })}>Post-WO ≈ Abend</Chip>
                <Chip onClick={() => setInp({ isTrainingDay: false })}>Ruhetag</Chip>
                <Chip onClick={() => { setInp({ targetGapMin: 240 }); setInp({ targetGapMin: 240 }); }}>Abstand 4 h</Chip>
                <Chip onClick={() => { setInp({ targetGapMin: 180 }); setInp({ targetGapMin: 180 }); }}>Abstand 3 h</Chip>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* ==== Mahlzeiten (Liste, statt Timeline) ==== */}
            <div className="kb-card bg-[#2c2837] shadow-soft p-4 border border-[#32174d]">
              <div className="kb-title mb-2 flex items-center gap-2" style={{ color: '#ececec' }}>
                <Clock className="w-4 h-4" /> Mahlzeiten
                <Info className="w-4 h-4 cursor-pointer" onClick={() => setShowInfo(v => !v)} />
              </div>
              {showInfo && (
                <div className="mb-3 text-xs rounded-xl border border-neutral-700 p-3 bg-[#292c2f] text-white">
                  <b>Wie werden die Mahlzeiten berechnet?</b><br />
                  Die Verteilung ist personalisiert nach Trainingszeit, Schlaf und Evidenz. Protein und Carbs werden gezielt um Training und Schlaf periodisiert, Fett wird abends etwas bevorzugt. Alle Werte sind auf 5&nbsp;g gerundet, die Summe bleibt exakt.
                </div>
              )}

              {/* Warnungen optional oberhalb der Liste anzeigen */}

              {issues.length > 0 && (
                <div className="mb-3 rounded-xl border p-2 text-xs space-y-1 border-amber-300/60 bg-amber-50 dark:bg-amber-900/20">
                  {issues.map((i, idx) => {
                    const hasFix = typeof i === 'object' && 'fix' in i && i.fix;
                    return (
                      <div key={idx}
                        className={i.severity==='error'?'text-red-700 dark:text-red-300'
                          : i.severity==='warn' ?'text-amber-800 dark:text-amber-200'
                          :'text-neutral-600 dark:text-neutral-300'}>
                        • {i.msg}
                        {hasFix ? (
                          <button className="ml-2 underline" onClick={()=> setInp((i as any).fix.patch)}>
                            {(i as any).fix.label}
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}

              <ul className="divide-y divide-neutral-700">
                {(() => {
                  // Typen für Slot- und Gym-Item
                  type SlotItem = { type: 'slot'; t: number; slot: Slot };
                  type GymItem = { type: 'gym'; t: number; gymStart: string; gymEnd: string };
                  const items: Array<SlotItem | GymItem> = [...(S as Slot[]).map((s) => ({
                    type: 'slot' as const,
                    t: s.t,
                    slot: s
                  }))];
                  if (inp.isTrainingDay && inp.gymStart && inp.gymEnd) {
                    // Gym-Start/Ende in Minuten berechnen
                    const gymStartMin = t2m(inp.gymStart);
                    items.push({
                      type: 'gym',
                      t: gymStartMin,
                      gymStart: inp.gymStart,
                      gymEnd: inp.gymEnd
                    });
                  }
                  // Nach Zeit sortieren
                  items.sort((a, b) => a.t - b.t);
                  return items.map((item, idx) => {
                    if (item.type === 'gym') {
                      return (
                        <li key={"gym-block"} className="flex items-center gap-3 py-2 rounded-xl mb-2" style={{ background: '#FFD700' }}>
                          {/* Zeit */}
                          <div className="w-16 shrink-0 font-mono text-sm" style={{ color: '#32174d' }}>
                            {item.gymStart}–{item.gymEnd}
                          </div>
                          {/* Titel */}
                          <div className="flex-1 min-w-0">
                            <div className="truncate text-sm font-semibold" style={{ color: '#32174d' }}>Gym</div>
                          </div>
                        </li>
                      );
                    } else {
                      const s = item.slot;
                      return (
                        <li key={s.id} className="flex items-center gap-3 py-2">
                          {/* Zeit */}
                          <div className="w-16 shrink-0 font-mono text-sm text-white">
                            {m2t(s.t)}
                          </div>

                          {/* Titel + Badges */}
                          <div className="flex-1 min-w-0">
                            <div className="truncate text-sm font-medium text-white">{s.label}</div>
                            <div className="mt-0.5 flex flex-wrap gap-1 text-[11px]">
                              {s.tags.includes('pre') && <span className="kb-badge-pre">Pre</span>}
                              {s.tags.includes('post') && <span className="kb-badge-post">Post</span>}
                              {s.tags.includes('sleep') && <span className="kb-badge-sleep">Schlaf</span>}
                              {s.tags.includes('wake') && <span className="kb-badge-wake">Aufstehen</span>}
                            </div>
                          </div>

                          {/* Makros kompakt */}
                          <div className="hidden sm:flex items-center gap-2">
                            <span className="kb-pill text-macro-protein">P {s.p}</span>
                            <span className="kb-pill text-macro-carb">C {s.c}</span>
                            <span className="kb-pill text-macro-fat">F {s.f}</span>
                            <span className="text-xs text-neutral-300">({s.kcal} kcal)</span>
                          </div>

                          {/* Nudge */}
                          <div className="flex gap-1">
                            <button
                              className="text-xs px-2 py-1 rounded-lg border border-neutral-700 bg-[#292c2f] hover:bg-neutral-800 text-white"
                              onClick={() => nudge(s.id, -15)}
                              aria-label={`${s.label} 15 Minuten früher`}
                            >
                              −15m
                            </button>
                            <button
                              className="text-xs px-2 py-1 rounded-lg border border-neutral-700 bg-[#292c2f] hover:bg-neutral-800 text-white"
                              onClick={() => nudge(s.id, 15)}
                              aria-label={`${s.label} 15 Minuten später`}
                            >
                              +15m
                            </button>
                          </div>
                        </li>
                      );
                    }
                  });
                })()}
              </ul>
              {/* Gesamtsumme aller Mahlzeiten: immer aus Slots summieren, nie aus useTotals! */}
              {(S as Slot[]).length > 0 && (() => {
                const sumP = (S as Slot[]).reduce((sum, s) => sum + safeNum(s.p), 0);
                const sumC = (S as Slot[]).reduce((sum, s) => sum + safeNum(s.c), 0);
                const sumF = (S as Slot[]).reduce((sum, s) => sum + safeNum(s.f), 0);
                const sumKcal = (S as Slot[]).reduce((sum, s) => sum + safeNum(s.kcal), 0);
                return (
                  <div className="border-t border-neutral-700 mt-2 pt-2">
                    <li className="flex items-center gap-3 py-2">
                      {/* Zeitspalte leer */}
                      <div className="w-16 shrink-0 font-mono text-sm text-neutral-400 text-center" />
                      {/* Titelspalte "Summe" */}
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-sm font-semibold text-neutral-400 text-center">Summe</div>
                      </div>
                      {/* Makros und kcal summiert, exakt wie bei Mahlzeiten */}
                      <div className="flex items-center gap-2">
                        <span className="kb-pill text-macro-protein w-12 text-center">P {sumP}</span>
                        <span className="kb-pill text-macro-carb w-12 text-center">C {sumC}</span>
                        <span className="kb-pill text-macro-fat w-12 text-center">F {sumF}</span>
                        <span className="text-xs text-neutral-300 w-16 text-center">{sumKcal} kcal</span>
                      </div>
                    </li>
                  </div>
                );
              })()}
            </div>



            <div className="flex flex-wrap gap-2">
              <button onClick={copyJSON} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-700 bg-[#292c2f] text-white hover:bg-neutral-800"><Download className="w-4 h-4" /> JSON</button>
              <button onClick={copyText} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-700 bg-[#292c2f] text-white hover:bg-neutral-800"><Copy className="w-4 h-4" /> Text</button>
              <button onClick={() => resetInp()} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-700 bg-[#292c2f] text-white hover:bg-neutral-800"><RotateCcw className="w-4 h-4" /> Reset</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

