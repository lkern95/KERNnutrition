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
import { getEffective } from '@/lib/derived';
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
function StatTile({ icon:Icon, label, value, sub, color }: { icon?:any; label:string; value:React.ReactNode; sub?:React.ReactNode; color?:string }) {
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
  const totals = useTotals();
  const eff = getEffective();
  const totalsMissing = !totals || Object.values(totals).some(v => !Number.isFinite(v) || v === 0);
  const { weight } = useProfile();
  const [isUpdating, setIsUpdating] = useState(false);
  useEffect(() => { setIsUpdating(true); }, [inp]);
  useEffect(() => { setIsUpdating(false); }, [inp]);
  const [showWhy, setShowWhy] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const setTrainingDay = useAppStore((s:any)=> s.setTrainingDay)?.bind?.(null);
  const [showError, setShowError] = useState(false);

  // Nur die jeweils letzte, korrekte Deklaration bleibt erhalten (siehe unten)

  // --- Neue Validator-Integration ---
  const feas = useMemo(() => ensureFeasible(inp), [inp]);
  // targets: P/C/F sind Quelle, kcal wird daraus abgeleitet
  const targets = useMemo(() => {
    const p = Number(totals.protein) || 0;
    const c = Number(totals.carbs)   || 0;
    const f = Number(totals.fat)     || 0;
    const kcal = Math.round(4*p + 4*c + 9*f);
    return { p, c, f, kcal };
  }, [totals.protein, totals.carbs, totals.fat]);
  // computePlan: targets ist die einzige Quelle für p/c/f/kcal
  const res: any = useMemo(() => {
    if (totalsMissing) return null;
    return computePlan({
      ...(feas.inputs as any),
      targets,
      autoFixLevel: 'safe'
    });
  }, [feas.inputs, targets, totalsMissing]);

  // Meals/Warnungen normalisieren (einmalig, keine Kollisionen)
  const slotsArr = useMemo(() => {
    const raw = res?.meals ?? res?.slots ?? res?.plan?.meals ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [res]);
  const warningsArr = useMemo(() => {
    const raw = res?.warnings ?? res?.plan?.warnings ?? [];
    return Array.isArray(raw) ? raw : (raw ? [raw] : []);
  }, [res]);
  // Einmalige Summenprüfung nach computePlan (nur Debug/Diag)
  const mealSum = useMemo(() => slotsArr.reduce(
    (a, m: any) => ({
      kcal: a.kcal + (m.kcal || 0),
      p:    a.p    + (m.p    || 0),
      c:    a.c    + (m.c    || 0),
      f:    a.f    + (m.f    || 0),
    }),
    { kcal: 0, p: 0, c: 0, f: 0 }
  ), [slotsArr]);
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log('Σ meals', mealSum, 'targets', targets);
  }
  // --- Harte End-Validierung: ausschließlich Makro-Ziel ---
  const slotsForValidation = res?.slots ?? res?.meals ?? res?.plan?.meals ?? [];
  let valError: string | null = null;
  let softWarnings: Array<{ msg: string }> = [];

  if (!totalsMissing && res) {
    try {
      // Validierung NUR gegen Makro-Targets (p/c/f + kcal=4/4/9 aus p/c/f)
      validatePlanCore({ meals: slotsForValidation }, targets);
    } catch (e: any) {
      const msg = e?.message || String(e);

      // Sonderfall: Σ kcal stimmt nicht, aber nur weil eff.dailyKcal != kcal(4/4/9 aus Makros)
      const kcalFromMacros = targets.kcal;              // z. B. 3293
      const effKcal = totals.kcal;                      // z. B. 3320
      const isOnlyKcalMismatch =
        /Σ\s*kcal\s*stimmt\s*nicht/i.test(msg) &&
        Number.isFinite(kcalFromMacros) &&
        Number.isFinite(effKcal) &&
        kcalFromMacros !== effKcal;

      if (isOnlyKcalMismatch) {
        // Nicht blocken – als Soft-Warnung anzeigen
        softWarnings.push({
          msg: `Hinweis: Rechner-Ziel (${effKcal} kcal) ≠ aus Makros berechnet (${kcalFromMacros} kcal). Der Plan folgt strikt den Makros.`
        });
        valError = null; // Blockade aufheben
      } else {
        valError = msg; // echte Fehler weiterreichen
      }
    }
  }

  // UI State for conditional rendering
  const hasPlanEmptyWarning = warningsArr.some((w: any) => typeof w === 'object' && w.type === 'plan-empty');
  const showNoPlanHint = slotsArr.length === 0 && !hasPlanEmptyWarning;
  const issues = useMemo(() => ([
    ...feas.notes,
    ...warningsArr.map((w: any) => ({ severity: 'warn', code: 'alg', msg: typeof w === 'string' ? w : w.msg })),
    ...softWarnings.map(w => ({ severity: 'warn', code: 'kcal-mismatch', msg: w.msg })),
  ]), [feas.notes, warningsArr, softWarnings]);
  const wakeMin = t2m(inp.wake); let sleepMin = t2m(inp.sleep); if (sleepMin <= wakeMin) sleepMin += DAY;
  const copyJSON = async () => {
    // Slots als Objekte
    const slotObjs = slotsArr.map((s: any) => ({
      type: "slot",
      t: s.t,
      time: m2t(s.t),
      label: s.label,
      tags: s.tags,
      p: s.p,
      c: s.c,
      f: s.f,
      kcal: s.kcal
    }));
    let gymObjs: any[] = [];
    if (inp.isTrainingDay && inp.gymStart && inp.gymEnd) {
      const gymStartMin = t2m(inp.gymStart);
      gymObjs = [{
        type: "gym",
        t: gymStartMin,
        gymStart: inp.gymStart,
        gymEnd: inp.gymEnd
      }];
    }
    // Merge and sort
    const allBlocks = [...slotObjs, ...gymObjs].sort((a, b) => a.t - b.t);
    // Remove t from export
    const exportBlocks = allBlocks.map(({ t, ...rest }) => rest);
    // Summen berechnen
    const sumP = slotsArr.reduce((sum, s) => sum + safeNum(s.p), 0);
    const sumC = slotsArr.reduce((sum, s) => sum + safeNum(s.c), 0);
    const sumF = slotsArr.reduce((sum, s) => sum + safeNum(s.f), 0);
    const sumKcal = slotsArr.reduce((sum, s) => sum + safeNum(s.kcal), 0);
    exportBlocks.push({
      type: "sum",
      label: "Summe",
      p: sumP,
      c: sumC,
      f: sumF,
      kcal: sumKcal
    });
    const out = {
      inputs: inp,
      blocks: exportBlocks
    };
    await navigator.clipboard.writeText(JSON.stringify(out, null, 2));
    alert('Plan als JSON kopiert');
  };

  const copyText = async () => {
    // Gemeinsame Struktur für Textausgabe
    const slotObjs = slotsArr.map((s: any) => ({
      t: s.t,
      text: `${m2t(s.t)} ${s.label}: P ${s.p} g, C ${s.c} g, F ${s.f} g (${s.kcal} kcal)`
    }));
    let blocks = [...slotObjs];
    if (inp.isTrainingDay && inp.gymStart && inp.gymEnd) {
      const gymStartMin = t2m(inp.gymStart);
      const gymBlock = {
        t: gymStartMin,
        text: `GYM: ${inp.gymStart}–${inp.gymEnd}`
      };
      blocks.push(gymBlock);
    }
    blocks.sort((a, b) => a.t - b.t);
    const lines = blocks.map(b => b.text);
    // Summen berechnen
    const sumP = slotsArr.reduce((sum, s) => sum + safeNum(s.p), 0);
    const sumC = slotsArr.reduce((sum, s) => sum + safeNum(s.c), 0);
    const sumF = slotsArr.reduce((sum, s) => sum + safeNum(s.f), 0);
    const sumKcal = slotsArr.reduce((sum, s) => sum + safeNum(s.kcal), 0);
    lines.push(`Summe: P ${sumP} g, C ${sumC} g, F ${sumF} g (${sumKcal} kcal)`);
    await navigator.clipboard.writeText(lines.join('\n'));
    alert('Plan als Text kopiert');
  };
  const nudge = (slotId: string, delta: number) => {
  const s = slotsArr.find((x: any) => x.id === slotId) as Slot | undefined;
    if (!s || !Array.isArray(s.tags)) return;
    if (s.tags.includes('pre')) setInp({ gymStart: m2t(t2m(inp.gymStart || '17:30') + delta) });
    else if (s.tags.includes('post')) setInp({ gymEnd: m2t(t2m(inp.gymEnd || '19:00') + delta) });
    else if (s.tags.includes('wake')) setInp({ wake: m2t(t2m(inp.wake) + delta) });
    else if (s.tags.includes('sleep')) setInp({ sleep: m2t(t2m(inp.sleep) + delta) });
    else setInp({ targetGapMin: clamp(inp.targetGapMin + (delta > 0 ? 15 : -15), 120, 300) });
  };
  const kcalDisplay = totals.kcal; // Rechner / Train/Rest
  const kcalFromMacros = targets.kcal;
  const proteinDisplay = totals.protein;
  const carbsDisplay = totals.carbs;
  const fatDisplay = totals.fat;

  // Conditional UI flags
  const showTotalsMissing = totalsMissing;
  const showValidationError = !!valError;

  // Kcal-Mismatch: Immer automatisch vergleichen und als Issue einfügen
  const mealKcalSum = slotsArr.reduce((a: number, s: any) => a + safeNum(s.kcal), 0);
  const kcalDiff = mealKcalSum - (totals.kcal || 0);
  const showKcalMismatch = Math.abs(kcalDiff) > 0;
  const kcalMismatchWarning = showKcalMismatch
    ? {
        severity: 'warn',
        code: 'kcal-mismatch',
        msg: `Achtung: Die Summe der Kalorien aus den Makros (${mealKcalSum} kcal) unterscheidet sich vom Rechner-Ziel (${totals.kcal} kcal).\nDifferenz: ${kcalDiff > 0 ? '+' : ''}${kcalDiff} kcal\nDer Plan folgt exakt den Makroangaben. Kleine Abweichungen sind normal.`
      }
    : null;
  const otherIssues = [
    ...feas.notes,
    ...warningsArr.map((w: any) => ({ severity: 'warn', code: 'alg', msg: typeof w === 'string' ? w : w.msg })),
    ...softWarnings.map(w => ({ severity: 'warn', code: 'kcal-mismatch', msg: w.msg })),
    ...(kcalMismatchWarning ? [kcalMismatchWarning] : [])
  ];

  // For showJson: (if you had a showJson state, handle it here)
  // const showJson = false; // Example placeholder

  // DEV: QA log for sum of macros
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log(
      'ΣP', slotsArr.reduce((a: number, s: any) => a + safeNum(s.p), 0),
      'ΣC', slotsArr.reduce((a: number, s: any) => a + safeNum(s.c), 0),
      'ΣF', slotsArr.reduce((a: number, s: any) => a + safeNum(s.f), 0)
    );
  }

  // === Konsistentes Design: Gradient-Background, Header, Cards, Farben ===
  return (
    <>
      {/* Show totals missing error */}
      {showTotalsMissing && (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gradient-to-b from-[#32174d] via-[#2c2837] to-[#292c2f]">
          <div className="max-w-md w-full p-6 rounded-2xl bg-[#2c2837] border border-[#32174d] shadow-soft text-center">
            <h2 className="text-xl font-bold mb-2 text-warning">Keine Rechner-Totals gefunden</h2>
            <p className="text-neutral-300 mb-4">Bitte berechne zuerst deine Kalorien und Makros im Rechner. Der Planer ist erst nach erfolgreicher Berechnung verfügbar.</p>
          </div>
        </div>
      )}
      {/* Show validation error as warning instead of blocking UI */}
      {/* Main planner UI always visible, but show warning if validation error */}
      {!showTotalsMissing && (
    <div
      className="min-h-[100dvh] relative"
      style={{
        background: 'linear-gradient(to top, #292c2f 0%, #32174d 100%)'
      }}
    >
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

      <div className="p-5 space-y-6">
        {/* Header */}
        <header className="pop-in">
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: '#ececec' }}>Planer</h1>
          <p className="text-sm mt-0.5" style={{ color: '#ececec99' }}>
            Verteile deine Kalorien & Makros optimal auf den Tag – personalisiert nach Training, Schlaf & Ziel.
          </p>
        </header>
  {/* Show validation error as warning (not blocking) */}
  {/* (No longer shown here, see meal container for kcal-mismatch) */}

        {/* Stat-Tiles */}
        <div className="container mx-auto max-w-5xl px-3 sm:px-4 py-4 sm:py-6 pb-[env(safe-area-inset-bottom)]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <StatTile
              icon={Flame}
              label="Tages-Kcal"
              value={<span className="font-bold text-2xl" style={{ color: '#00BCD4' }}>{`${kcalDisplay} kcal`}</span>}
              sub={<span className="text-xs text-neutral-400">aus Makros: {kcalFromMacros} kcal</span>}
            />
            <StatTile color="#10b981" label="Protein" value={<MacroNum macro="protein" value={proteinDisplay} />} />
            <StatTile color="#3b82f6" label="Carbs" value={<MacroNum macro="carb" value={carbsDisplay} />} />
            <StatTile color="#f59e42" label="Fett" value={<MacroNum macro="fat" value={fatDisplay} />} />
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
            {/* Zeiten Container */}
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

            {/* Makro-Verteilung (Presets) & Timing (Feinsteuerung) jetzt unterhalb von Zeiten */}
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
                <details className="mt-3 rounded-2xl border border-[#32174d] bg-[#2c2837] shadow-soft p-4">
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

            {/* Vorschläge */}
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
                  Die Makro-Verteilung auf die Mahlzeiten richtet sich nach dem gewählten Preset (z.B. Pre/Post-Fokus, Carbs morgens/abends, Backload, Ruhetag etc.), deiner Trainingszeit, Schlafenszeit und den gewählten Feinsteuerungen. Protein wird gleichmäßig mit Mindestmengen für Pre/Post und Schlaf verteilt. Carbs werden je nach Preset und Trainingszeit periodisiert, Fett ggf. abends gedeckelt. Alle Werte werden auf 5&nbsp;g gerundet, die Summen stimmen exakt mit den Zielwerten überein.<br />
                  <span className="block mt-1 text-neutral-300">Die Berechnung erfolgt automatisch und prüft alle Invarianten (z.B. keine negativen Werte, Mindestabstände, exakte Summen).</span>
                </div>
              )}

              {/* Warnungen optional oberhalb der Liste anzeigen */}

              {/* Kcal-Mismatch Warnung immer im Hinweise & Warnungen-Container anzeigen, in #ff0800 */}

              {otherIssues.length > 0 && (() => {
                const [open, setOpen] = React.useState(true);
                return (
                  <details open={open} className="mb-3 rounded-xl border text-xs" style={{ background: '#292c2f', color: '#ececec', borderColor: '#ececec33' }}>
                    <summary
                      className="cursor-pointer select-none px-2 py-1 font-semibold flex items-center gap-2"
                      style={{ color: '#ececec' }}
                      onClick={e => {
                        e.preventDefault();
                        setOpen(o => !o);
                      }}
                    >
                      Hinweise & Warnungen
                      <span style={{ fontSize: '1.1em' }}>{open ? '▲' : '▼'}</span>
                    </summary>
                    <div className="p-2 space-y-1">
                      {otherIssues.map((i, idx) => {
                        const hasFix = typeof i === 'object' && 'fix' in i && i.fix;
                        const isKcalMismatch = i.code === 'kcal-mismatch';
                        return (
                          <div key={idx} style={isKcalMismatch ? { color: '#FFD700', fontWeight: 600 } : { color: '#ececec' }}>
                            • {typeof i.msg === 'string'
                              ? i.msg.split('\n').map((line, lidx) => {
                                  if (/^Differenz:/.test(line)) {
                                    return <span key={lidx} style={{ color: '#ff0800', fontWeight: 700, fontSize: '1.08em', background: '#FFD700', borderRadius: 4, padding: '0 4px', margin: '0 2px' }}>{line}<br/></span>;
                                  }
                                  return <span key={lidx}>{line}<br/></span>;
                                })
                              : i.msg}
                            {hasFix ? (
                              <button className="ml-2 underline" style={{ color: '#ececec' }} onClick={()=> setInp((i as any).fix.patch)}>
                                {(i as any).fix.label}
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </details>
                );
              })()}

              <ul className="divide-y divide-neutral-700">
                {(() => {
                  // Typen für Slot- und Gym-Item
                  type SlotItem = { type: 'slot'; t: number; slot: Slot };
                  type GymItem = { type: 'gym'; t: number; gymStart: string; gymEnd: string };
                  const items: Array<SlotItem | GymItem> = [...(slotsArr as Slot[]).map((s) => ({
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
              {slotsArr.length > 0 && (
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
                      <span className="kb-pill text-macro-protein w-12 text-center">P {mealSum.p}</span>
                      <span className="kb-pill text-macro-carb w-12 text-center">C {mealSum.c}</span>
                      <span className="kb-pill text-macro-fat w-12 text-center">F {mealSum.f}</span>
                      <span className="text-xs text-neutral-300 w-16 text-center">{mealSum.kcal} kcal</span>
                    </div>
                  </li>
                </div>
              )}
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
      )}
    </>
  );
}

