import React from 'react';
import { Flame, Gauge, Activity, Sun, Moon, ChevronRight } from 'lucide-react';
import { getEffective } from '../lib/derived';
import { loadCalcResult } from '../lib/calcCache';
import { useAppStore } from '../store/appStore';
import { generateAdjustmentRecommendations, formatRecommendationsForUI, type CheckinData as AdjustCheckData, type UserProfile, type TrendData as AdjustTrendData } from '../lib/adjust';
// Kompakte Recommendation Card für Übersicht
function CompactRecommendation({ recommendation }: { recommendation: any }) {
  return (
    <div className={`rounded-xl border px-3 py-2 mb-2 bg-background/80`} style={{ borderColor: '#ffd00055' }}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-text">{recommendation.title}</span>
        {recommendation.calorieAdjustment && (
          <span className="ml-auto text-xs text-primary font-bold">{recommendation.calorieAdjustment > 0 ? '+' : ''}{recommendation.calorieAdjustment} kcal</span>
        )}
      </div>
      {recommendation.description && (
        <div className="text-xs text-text-secondary mt-0.5">{recommendation.description}</div>
      )}
    </div>
  );
}

import { usePlayhead, phaseProgress } from '../lib/usePlayhead';
import { useCountUp } from '../lib/useCountUp';

const ZIELKALORIEN_COLOR = '#00BCD4'; // Zielkalorien
const TDEE_COLOR = '#FF9800';         // TDEE
const BMR_COLOR = '#3F51B5';          // BMR
const GOLD   = 'var(--macro-fat)';      // Fett
const RED    = 'var(--macro-carb)';     // KH
const WHITE  = 'var(--macro-protein)';  // Protein
const INK    = '#292c2f';
const VIOLET = '#32174d';
const LIGHT  = '#ececec';

const pct = (part: number, total: number) => Math.round((part / Math.max(1, total)) * 100);

function SourceChip() {
  const cached = loadCalcResult();
  const dt = cached?.savedAt ? new Date(cached.savedAt).toLocaleString('de-DE') : '';
  let label = 'Profil & Einstellungen (berechnet)';
  if (cached?.source === 'rechner') label = `Rechner • ${dt}`;
  if (cached?.source === 'checkin') label = `Check-in (Übernahme) • ${dt}`;
  if (cached?.source === 'planer') label = `Planer • ${dt}`;
  if (cached?.source === 'import') label = `Import • ${dt}`;

  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-all duration-300 hover:shadow"
      style={{ borderColor: `${GOLD}33`, color: GOLD, backgroundColor: INK }}
    >
      <span className="w-2 h-2 rounded-full" style={{ background: GOLD }} />
      <span>Quelle: {label}</span>
    </div>
  );
}

// Donut füllt nacheinander: KH -> Fett -> Protein
function MacroDonut({ P, C, F, size = 140 }: { P: number; C: number; F: number; size?: number }) {
  const kcalP = Math.max(0, P * 4), kcalC = Math.max(0, C * 4), kcalF = Math.max(0, F * 9);
  const total = Math.max(1, kcalP + kcalC + kcalF);

  const pPctTarget = (kcalP / total) * 100;
  const cPctTarget = (kcalC / total) * 100;
  const fPctTarget = Math.max(0, 100 - (pPctTarget + cPctTarget));

  // Playhead läuft 0..1; jede Phase bekommt 1/3 der Zeit
  const t = usePlayhead([P, C, F], { duration: 1000 });

  // Phasenfortschritte (0..1)
  const cPhase = phaseProgress(t, 0); // KH zuerst
  const fPhase = phaseProgress(t, 1); // dann Fett
  const pPhase = phaseProgress(t, 2); // dann Protein

  // aktuell gefüllte Prozente je Segment
  const cPct = cPctTarget * cPhase;
  const fPct = fPctTarget * fPhase;
  const pPct = pPctTarget * pPhase;

  // kumulative Enden
  const cEnd = cPct;
  const fEnd = cPct + fPct;
  const pEnd = cPct + fPct + pPct;

  // Rest als zarter Ring
  const REST = 'rgba(236,236,236,0.08)';

  const bg = `conic-gradient(
    ${RED} 0% ${cEnd}%,
    ${GOLD} ${cEnd}% ${fEnd}%,
    ${WHITE} ${fEnd}% ${pEnd}%,
    ${REST} ${pEnd}% 100%
  )`;

  return (
    <div className="relative transition-transform duration-300 ease-out hover:scale-[1.03]"
         style={{ width: size, height: size }}
         aria-label="Makro-Verteilung">
      <div className="rounded-full shadow-inner" style={{ width: size, height: size, background: bg }} />
      <div className="absolute inset-[18%] rounded-full"
           style={{ background: INK, boxShadow: 'inset 0 0 0 1px rgba(255,208,0,0.25)' }} />
    </div>
  );
}

// kleine Keyframes für sanftes Pop-in
const Keyframes = () => (
  <style>
    {`
    @keyframes pop { 0% { transform: translateY(6px) scale(.98); opacity: 0 } 100% { transform: translateY(0) scale(1); opacity: 1 } }
    .pop-in { animation: pop .5s ease-out both; }
    .pop-in-delay-1 { animation-delay: .06s; }
    .pop-in-delay-2 { animation-delay: .12s; }
    .pop-in-delay-3 { animation-delay: .18s; }
    `}
  </style>
);

export default function UebersichtPage() {
  const eff = getEffective();
  const setTab = useAppStore((s: any) => s?.setActiveTab ?? null);

  // Check-ins aus Store laden (wie CheckinPage)
  const checkins = useAppStore((s: any) => s.checkins || []);
  // Zielbereich aus localStorage (wie CheckinPage)
  const defaultGoal = typeof window !== 'undefined' ? (localStorage.getItem('kerncare_checkin_goal') || 'maintain') : 'maintain';
  // Trend-Analyse (wie CheckinPage)
  const getTrendAnalysis = () => {
    if (!checkins || checkins.length < 2) return null;
    const sortedCheckins = [...checkins].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const recent = sortedCheckins.slice(-2);
    if (recent.length < 2) return null;
    const weightChange = recent[1].weight - recent[0].weight;
    const daysDiff = Math.abs(new Date(recent[1].date).getTime() - new Date(recent[0].date).getTime()) / (1000 * 60 * 60 * 24);
    const weeklyChange = (weightChange / daysDiff) * 7;
    const weeklyChangePercent = (weeklyChange / recent[0].weight) * 100;
    const last3 = sortedCheckins.slice(-3);
    const movingAverage = last3.length > 0 ? last3.reduce((sum, entry) => sum + entry.weight, 0) / last3.length : 0;
    // Ziel-Klassifikation
    const GOAL_RANGES = {
      lean_bulk: { min: 0.25, max: 0.5, label: 'Lean Bulk' },
      aggressive_bulk: { min: 0.5, max: 0.75, label: 'Aggressiver Aufbau' },
      cut: { min: -1.0, max: -0.5, label: 'Diät' },
      maintain: { min: -0.25, max: 0.25, label: 'Erhaltung' }
    };
  const selectedGoal = defaultGoal as keyof typeof GOAL_RANGES;
  const goalRange = GOAL_RANGES[selectedGoal] ?? GOAL_RANGES['maintain'];
    let classification = 'in';
    if (weeklyChangePercent < goalRange.min) classification = 'under';
    else if (weeklyChangePercent > goalRange.max) classification = 'over';
    return {
      weightChange,
      weeklyChange,
      weeklyChangePercent,
      movingAverage,
      classification,
      goalRange,
      recent
    };
  };
  const trendData = getTrendAnalysis();
  // Empfehlungen generieren (wie CheckinPage)
  const getRecommendations = () => {
    if (!trendData || !checkins || checkins.length < 2) return [];
    const adjustCheckins: AdjustCheckData[] = checkins.map((c: any) => ({
      id: c.id,
      date: c.date,
      weight: c.weight,
      trainingDays: c.trainingDays || 3,
      sleep: c.sleep || 3,
      stress: c.stress || 3,
      notes: c.notes || ''
    }));
    // GOAL_RANGES muss hier erneut definiert werden, damit der Typ passt
    const GOAL_RANGES = {
      lean_bulk: { min: 0.25, max: 0.5, label: 'Lean Bulk' },
      aggressive_bulk: { min: 0.5, max: 0.75, label: 'Aggressiver Aufbau' },
      cut: { min: -1.0, max: -0.5, label: 'Diät' },
      maintain: { min: -0.25, max: 0.25, label: 'Erhaltung' }
    };
    const goalKey = (defaultGoal in GOAL_RANGES ? defaultGoal : 'maintain') as 'lean_bulk' | 'aggressive_bulk' | 'cut' | 'maintain';
    const userProfile: UserProfile = {
      weight: trendData.recent[1].weight,
      height: 175,
      age: 30,
      sex: 'male',
      activityFactor: 1.6,
      goal: goalKey,
      targetCalories: 2500,
      currentCalories: 2500
    };
    const adjustTrendData: AdjustTrendData = {
      weightChange: trendData.weightChange,
      weeklyChange: trendData.weeklyChange,
      weeklyChangePercent: trendData.weeklyChangePercent,
      classification: trendData.classification as any,
      goalRange: trendData.goalRange,
      weeksInTrend: Math.ceil(checkins.length / 2)
    };
    return generateAdjustmentRecommendations(adjustCheckins, userProfile, adjustTrendData);
  };
  const recommendations = getRecommendations();

  // Animated numbers
  const dailyKcal = useCountUp(eff.dailyKcal);
  const proteinG  = useCountUp(eff.P);
  const carbsG    = useCountUp(eff.C);
  const fatG      = useCountUp(eff.F);
  const bmr       = useCountUp(eff.bmr);
  const tdee      = useCountUp(eff.tdee);

  const kcalP = eff.P * 4, kcalC = eff.C * 4, kcalF = eff.F * 9;
  const totalK = Math.max(1, eff.dailyKcal);
  const pPctTarget = Math.round((kcalP / totalK) * 100);
  const cPctTarget = Math.round((kcalC / totalK) * 100);
  const fPctTarget = Math.max(0, 100 - (pPctTarget + cPctTarget));

  // Balken: sequential nach Anzeige-Reihenfolge (Protein -> KH -> Fett)
  const tBars = usePlayhead([eff.P, eff.C, eff.F, eff.dailyKcal], { duration: 900 });
  const barPhaseProtein = phaseProgress(tBars, 0);
  const barPhaseCarb    = phaseProgress(tBars, 1);
  const barPhaseFat     = phaseProgress(tBars, 2);

  const pWidth = pPctTarget * barPhaseProtein;
  const cWidth = cPctTarget * barPhaseCarb;
  const fWidth = fPctTarget * barPhaseFat;

  return (
    <div className="min-h-[100dvh] relative">
      <Keyframes />
      {/* Hintergrund-Gradient + Soft Glow */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#32174d] via-[#2c2837] to-[#292c2f]" />
      <div
        className="absolute -z-10 blur-3xl opacity-30 rounded-full"
        style={{ inset: 'auto 20% 60% auto', width: 300, height: 300, background: GOLD }}
      />

      <div className="p-5 space-y-5">
        {/* Header */}
        <header className="flex items-center justify-between pop-in">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: LIGHT }}>Übersicht</h1>
            <p className="text-sm mt-0.5" style={{ color: `${LIGHT}99` }}>
              Deine aktuellen Zielkalorien, Makros & Grundlagen
            </p>
          </div>
          <SourceChip />
        </header>

        {/* Hauptgrid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Big KCAL */}
          <section
            className="lg:col-span-3 rounded-2xl border shadow-xl transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl pop-in pop-in-delay-1"
            style={{ background: INK, borderColor: `${GOLD}26` }}
          >
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: `${ZIELKALORIEN_COLOR}1a`, color: ZIELKALORIEN_COLOR }}>
                  <Gauge size={20} />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider" style={{ color: `${LIGHT}80` }}>
                    Zielkalorien
                  </div>
                  <div className="text-4xl sm:text-5xl font-extrabold" style={{ color: ZIELKALORIEN_COLOR }}>
                    {dailyKcal} <span className="text-base font-semibold" style={{ color: `${LIGHT}99` }}>kcal</span>
                  </div>
                </div>
              </div>

              {eff.trainKcal != null && eff.restKcal != null && (
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1 border transition-all duration-300 hover:-translate-y-0.5"
                    style={{ color: ZIELKALORIEN_COLOR, borderColor: `${ZIELKALORIEN_COLOR}33`, background: `${ZIELKALORIEN_COLOR}10` }}
                  >
                    <Sun size={14} /> Trainingstag: <b>{eff.trainKcal}</b> kcal
                  </span>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1 border transition-all duration-300 hover:-translate-y-0.5"
                    style={{ color: ZIELKALORIEN_COLOR, borderColor: `${ZIELKALORIEN_COLOR}33`, background: `${ZIELKALORIEN_COLOR}10` }}
                  >
                    <Moon size={14} /> Ruhetag: <b>{eff.restKcal}</b> kcal
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => setTab && setTab('rechner')}
                  className="group inline-flex items-center gap-2 rounded-xl px-4 py-2 border transition-all duration-300 hover:-translate-y-0.5 hover:shadow"
                  style={{ color: INK, background: ZIELKALORIEN_COLOR, borderColor: `${INK}22` }}
                >
                  In Rechner öffnen <ChevronRight size={16} className="transition group-hover:translate-x-0.5" />
                </button>
                <button
                  onClick={() => setTab && setTab('checkin')}
                  className="group inline-flex items-center gap-2 rounded-xl px-4 py-2 border transition-all duration-300 hover:-translate-y-0.5 hover:shadow"
                  style={{ color: ZIELKALORIEN_COLOR, background: 'transparent', borderColor: `${ZIELKALORIEN_COLOR}44` }}
                >
                  Zu Check-in <ChevronRight size={16} className="transition group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          </section>

          {/* Donut */}
          <section
            className="lg:col-span-2 rounded-2xl border shadow-xl p-5 sm:p-6 grid place-items-center transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl pop-in pop-in-delay-2"
            style={{ background: INK, borderColor: `${GOLD}26` }}
          >
            <div className="flex items-center gap-6">
              <MacroDonut P={eff.P} C={eff.C} F={eff.F} />
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full" style={{ background: WHITE }} />
                  <div className="text-sm" style={{ color: LIGHT }}>
                    <div className="font-semibold">Protein</div>
                    <div className="text-xs opacity-70"><span className="text-macro-protein">{proteinG} g</span> · {pct(eff.P * 4, eff.dailyKcal)}%</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full" style={{ background: RED }} />
                  <div className="text-sm" style={{ color: LIGHT }}>
                    <div className="font-semibold">Kohlenhydrate</div>
                    <div className="text-xs opacity-70"><span className="text-macro-carb">{carbsG} g</span> · {pct(eff.C * 4, eff.dailyKcal)}%</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full" style={{ background: GOLD }} />
                  <div className="text-sm" style={{ color: LIGHT }}>
                    <div className="font-semibold">Fett</div>
                    <div className="text-xs opacity-70"><span className="text-macro-fat">{fatG} g</span> · {pct(eff.F * 9, eff.dailyKcal)}%</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* BMR/TDEE + Balken */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <section
            className="rounded-2xl border shadow-xl p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl pop-in pop-in-delay-1"
            style={{ background: INK, borderColor: `${BMR_COLOR}26`, color: LIGHT }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm opacity-80">BMR • Grundumsatz</div>
              <Activity size={18} color={BMR_COLOR} />
            </div>
            <div className="text-3xl font-bold" style={{ color: BMR_COLOR }}>{bmr}</div>
            <div className="text-xs opacity-70">Kalorien in Ruhe</div>
          </section>

          <section
            className="rounded-2xl border shadow-xl p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl pop-in pop-in-delay-2"
            style={{ background: INK, borderColor: `${TDEE_COLOR}26`, color: LIGHT }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm opacity-80">TDEE • Gesamtumsatz</div>
              <Flame size={18} color={TDEE_COLOR} />
            </div>
            <div className="text-3xl font-bold" style={{ color: TDEE_COLOR }}>{tdee}</div>
            <div className="text-xs opacity-70">Mit Aktivitätsfaktor</div>
          </section>

          <section
            className="rounded-2xl border shadow-xl p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl pop-in pop-in-delay-3"
            style={{ background: INK, borderColor: `${GOLD}26`, color: LIGHT }}
          >
            <div className="text-sm opacity-80 mb-3">Makro-Balken (Energie)</div>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs opacity-70 mb-1">
                  <span>Protein</span><span>{pPctTarget}%</span>
                </div>
                <div className="h-2.5 rounded-full" style={{ background: 'rgba(236,236,236,0.1)' }}>
                  <div className="h-full" style={{ width: `${pWidth}%`, background: 'var(--macro-protein)' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs opacity-70 mb-1">
                  <span>Kohlenhydrate</span><span>{cPctTarget}%</span>
                </div>
                <div className="h-2.5 rounded-full" style={{ background: 'rgba(236,236,236,0.1)' }}>
                  <div className="h-full" style={{ width: `${cWidth}%`, background: 'var(--macro-carb)' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs opacity-70 mb-1">
                  <span>Fett</span><span>{fPctTarget}%</span>
                </div>
                <div className="h-2.5 rounded-full" style={{ background: 'rgba(236,236,236,0.1)' }}>
                  <div className="h-full" style={{ width: `${fWidth}%`, background: 'var(--macro-fat)' }} />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
      {/* Kompakter Abschnitt: Trends & Empfehlungen aus Check-in */}
      {recommendations && recommendations.length > 0 && (
        <section className="rounded-2xl border shadow-xl p-4 mt-2 bg-surface/80" style={{ borderColor: '#ffd00055' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-base text-text">Trends & Empfehlungen</span>
          </div>
          {recommendations.slice(0,2).map((rec, i) => (
            <CompactRecommendation key={i} recommendation={rec} />
          ))}
          <div className="text-xs text-text-secondary mt-2">Basierend auf deinen letzten Check-ins. Für Details siehe Check-in.</div>
        </section>
      )}
    </div>
  );
}
