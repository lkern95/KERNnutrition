import * as React from 'react';
import { Edit2, Trash2, X, Check, CheckCircle, Plus, Scale, Calendar, Activity, Moon, AlertTriangle, FileText, TrendingUp, TrendingDown, Target, BarChart3 } from 'lucide-react';
import { useAppStore, type CheckinEntry } from '../store/appStore';
import { computeTrend2Points, isFiniteNumber } from '../lib/trend';
import { loadGoalPref } from '../lib/goalPref';
import { goalToTrendRange, GOAL_LABELS, type GoalKey } from '../lib/goalMap';
import { getEffective } from '../lib/derived';
import { buildAdvice } from '../lib/trendAdvice';
import { buildAdjustedPreview, applyPreviewToStore, type ApplyMode, buildRampedPreviews } from '../lib/trendPreview';
import { buildAdviceFromTrend } from '../lib/adviceEngine';
import { loadCalcResult } from '../lib/calcCache';




function CheckinPage() {
  // State
  const checkins = useAppStore((s) => s.checkins);
  const addCheckin = useAppStore((s) => s.addCheckin);
  const updateCheckin = useAppStore((s) => s.updateCheckin);
  const deleteCheckin = useAppStore((s) => s.deleteCheckin);
  const { profile } = useAppStore();

  // Ziel-Key State (aus Rechner übernehmen)
  const initialGoal = (loadGoalPref() ?? 'maintenance') as GoalKey;
    const [goalKey, setGoalKey] = React.useState<GoalKey>(initialGoal);
  // Optional: eigener State für Custom-Range
  // const [customRange, setCustomRange] = React.useState<{minPct:number; maxPct:number} | null>(null);

  // Sync mit Rechner-Auswahl (Tab-Wechsel/Storage)
  React.useEffect(() => {
    const updateFromPref = () => {
      const k = loadGoalPref() as GoalKey | null;
      if (k && k !== goalKey) setGoalKey(k);
    };
    updateFromPref();
    const onVis = () => { if (document.visibilityState === 'visible') updateFromPref(); };
    document.addEventListener('visibilitychange', onVis);
    const onStorage = () => updateFromPref();
    window.addEventListener('storage', onStorage);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('storage', onStorage);
    };
  }, [goalKey]);

  // Trend-Preview & Vorschau-Werte aus Cache oder Store
  // Aktuelle Werte aus derived
  const eff = getEffective();

  const [showForm, setShowForm] = React.useState(false);
  const [formData, setFormData] = React.useState({
    date: new Date().toISOString().split('T')[0],
    weight: '',
    trainingDays: 3,
    sleep: 3,
    stress: 3,
    notes: ''
  });

  // Edit modal state
  const [editId, setEditId] = React.useState<string | null>(null);
  const [editData, setEditData] = React.useState({ date: '', weight: '', notes: '' });
  const [showDeleteId, setShowDeleteId] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  // Toast automatisch ausblenden
  React.useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2500)
      return () => clearTimeout(t)
    }
  }, [toast])

  // Neuen Check-in hinzufügen
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const weight = parseFloat(formData.weight)
    if (!weight || weight <= 0) {
      setToast('Bitte gib ein gültiges Gewicht ein.')
      return
    }
    const newCheckin: CheckinEntry = {
      id: Date.now().toString(),
      date: formData.date,
      weight,
      trainingDays: formData.trainingDays,
      sleep: formData.sleep,
      stress: formData.stress,
      notes: formData.notes
    }
    addCheckin(newCheckin)
    setShowForm(false)
    setFormData({
      date: new Date().toISOString().split('T')[0],
      weight: '',
      trainingDays: 3,
      sleep: 3,
      stress: 3,
      notes: ''
    })
    setToast('Check-in gespeichert!')
  }

  // Editieren starten
  const openEdit = (entry: CheckinEntry) => {
    setEditId(entry.id)
    setEditData({
      date: entry.date,
      weight: entry.weight.toString(),
      notes: entry.notes || ''
    })
  }

  // Edit speichern
  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editId) return
    const weight = parseFloat(editData.weight)
    if (!weight || weight <= 0) {
      setToast('Bitte gib ein gültiges Gewicht ein.')
      return
    }
    updateCheckin(editId, {
      date: editData.date,
      weight,
      notes: editData.notes
    })
    setEditId(null)
    setToast('Check-in aktualisiert!')
  }

  // Löschen bestätigen
  const confirmDelete = (id: string) => {
    deleteCheckin(id)
    setShowDeleteId(null)
    setToast('Check-in gelöscht!')
  }

  // Trend-Analyse (robust)
  const sortedCheckins = [...checkins].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const trend = computeTrend2Points(sortedCheckins);
  // 3-Wochen gleitender Mittelwert
  const last3 = sortedCheckins.slice(-3);
  const movingAverage = last3.length > 0 ? last3.reduce((sum, entry) => sum + entry.weight, 0) / last3.length : 0;
  // Aktiven Zielbereich ableiten
    const activeRange = goalToTrendRange(goalKey);
  // TrendAdvice Integration
  const weightNow = sortedCheckins.length > 0 ? sortedCheckins[sortedCheckins.length - 1].weight : (profile?.weight ?? 0);
  const advice = buildAdvice({
    pctPerWeek: trend?.pctPerWeek ?? null,
    range: activeRange,
    weightKg: eff ? (Number.isFinite(eff?.bmr) ? (useAppStore.getState()?.profile?.weight ?? 0) : 0) : 0,
  });
  let classification: 'under' | 'in' | 'over' | null = null;
  if (advice.status === 'unter') classification = 'under';
  else if (advice.status === 'ueber') classification = 'over';
  else if (advice.status === 'im') classification = 'in';
  // Formatierung
  const fmtKg = (n: number | null) => n == null ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(2)} kg/Woche`
  const fmtPct = (n: number | null) => n == null ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(2)}% pro Woche`

  // Trend-Preview
  const [showPreview, setShowPreview] = React.useState<boolean>(true);
  const [mode, setMode] = React.useState<ApplyMode>('kcal_only_keep_split');
  const preview = advice?.kcalPerDay == null ? null : buildAdjustedPreview(null, advice, mode);

  // Sichtbares Feedback beim Übernehmen
  const [savedToast, setSavedToast] = React.useState(false);
  const [isApplying, setIsApplying] = React.useState(false);

  const handleApply = () => {
    if (!preview) return;
    setIsApplying(true);
    try {
      applyPreviewToStore(preview);
      setSavedToast(true); // zeigt Toast
      window.setTimeout(() => setSavedToast(false), 2000);
    } finally {
      setIsApplying(false);
    }
  };

  // Klassifikations-Farben
  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'under': return 'text-warning'
      case 'in': return 'text-success'
      case 'over': return 'text-error'
      default: return 'text-text'
    }
  }

  const getClassificationText = (classification: string) => {
    switch (classification) {
      case 'under': return 'Unter Ziel'
      case 'in': return 'Im Ziel'
      case 'over': return 'Über Ziel'
      default: return 'Unbekannt'
    }
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="bg-golden text-inkdark rounded-xl shadow-xl p-6 w-full max-w-md border border-inkdark/15 mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-golden/80 rounded-xl">
            <CheckCircle className="w-6 h-6 text-inkdark" />
          </div>
          <div>
            <h1 className="text-inkdark text-lg font-semibold mb-4">Wöchentlicher Check-in</h1>
            <p className="text-inkdark/70 text-sm">
              Dokumentiere deinen Fortschritt und verfolge Trends
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-golden text-inkdark font-medium px-4 py-2 rounded-lg border border-inkdark/30 hover:bg-yellow-400 focus:ring-2 focus:ring-inkdark/40 w-full flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Neuer Check-in
        </button>
      </div>

      {/* Eingabeformular */}
      {showForm && (
        <div className="bg-golden text-inkdark rounded-xl shadow-xl p-6 w-full max-w-md border border-inkdark/15 mx-auto">
          <h2 className="text-inkdark text-lg font-semibold mb-4">Wöchentlicher Check-in</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-inkdark mb-2">
                  Datum
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full rounded-md border border-inkdark/30 bg-white text-inkdark placeholder:text-inkdark/50 focus:outline-none focus:ring-2 focus:ring-inkdark/40 focus:border-inkdark/60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-inkdark mb-2">
                  Gewicht (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                  placeholder="z.B. 72.5"
                  className="w-full rounded-md border border-inkdark/30 bg-white text-inkdark placeholder:text-inkdark/50 focus:outline-none focus:ring-2 focus:ring-inkdark/40 focus:border-inkdark/60"
                />
                <p className="text-xs text-inkdark/50 mt-1">
                  Morgens, nach Toilette, ohne Kleidung
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-inkdark mb-3">
                Trainingstage diese Woche: {formData.trainingDays}
              </label>
              <div className="flex items-center gap-4">
                <span className="text-sm text-inkdark/50">0</span>
                <input
                  type="range"
                  min="0"
                  max="7"
                  step="1"
                  value={formData.trainingDays}
                  onChange={(e) => setFormData(prev => ({ ...prev, trainingDays: parseInt(e.target.value) }))}
                  className="flex-1 h-2 bg-inkdark/20 rounded-lg appearance-none cursor-pointer slider"
                />
                <span className="text-sm text-inkdark/50">7</span>
                <div className="w-8 text-center">
                  <span className="text-sm font-medium text-inkdark">{formData.trainingDays}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-inkdark mb-3">
                  Schlafqualität: {formData.sleep}/5
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-inkdark/50">😴</span>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={formData.sleep}
                    onChange={(e) => setFormData(prev => ({ ...prev, sleep: parseInt(e.target.value) }))}
                    className="flex-1 h-2 bg-inkdark/20 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="text-sm text-inkdark/50">😊</span>
                </div>
                <div className="flex justify-between text-xs text-inkdark/50 mt-1">
                  <span>Schlecht</span>
                  <span>Ausgezeichnet</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-inkdark mb-3">
                  Stresslevel: {formData.stress}/5
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-inkdark/50">😌</span>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={formData.stress}
                    onChange={(e) => setFormData(prev => ({ ...prev, stress: parseInt(e.target.value) }))}
                    className="flex-1 h-2 bg-inkdark/20 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="text-sm text-inkdark/50">😰</span>
                </div>
                <div className="flex justify-between text-xs text-inkdark/50 mt-1">
                  <span>Entspannt</span>
                  <span>Sehr gestresst</span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-inkdark mb-2">
                Notizen (optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="z.B. Gefühlslage, besondere Ereignisse, Herausforderungen..."
                rows={3}
                className="w-full rounded-md border border-inkdark/30 bg-white text-inkdark placeholder:text-inkdark/50 focus:outline-none focus:ring-2 focus:ring-inkdark/40 focus:border-inkdark/60 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-golden text-inkdark font-medium px-4 py-2 rounded-lg border border-inkdark/30 hover:bg-yellow-400 focus:ring-2 focus:ring-inkdark/40 flex-1"
              >
                Check-in speichern
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-transparent text-inkdark px-4 py-2 rounded-lg border border-inkdark/40 hover:bg-inkdark/10 focus:ring-2 focus:ring-inkdark/30"
              >
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Zielbereich-Auswahl */}
      <div className="bg-surface rounded-2xl p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Zielbereich für Trendanalyse
        </h2>
        <select
          value={goalKey}
          onChange={(e) => setGoalKey(e.target.value as GoalKey)}
          className="p-3 rounded-xl text-sm font-medium border border-border bg-background text-text mb-2"
        >
          {Object.entries(GOAL_LABELS).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
          {/* <option value="custom">Benutzerdefiniert</option> */}
        </select>
        <div className="text-xs opacity-70 mt-1">
          Aus Rechner übernommen: <b>{GOAL_LABELS[goalKey] ?? goalKey}</b>
        </div>
      </div>

      {/* Trend-Analyse */}
      <div className="bg-surface rounded-2xl p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Trend-Analyse ({sortedCheckins.length} Datenpunkte)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-background rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-primary mb-1">
              {fmtKg(trend.kgPerWeek)}
            </div>
            <div className="text-sm text-text-secondary">Wöchentlicher Trend</div>
          </div>
          <div className="bg-background rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-secondary mb-1">
              {fmtPct(trend.pctPerWeek)}
            </div>
            <div className="text-sm text-text-secondary">Prozentuale Änderung</div>
          </div>
          <div className="bg-background rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-accent mb-1">
              {movingAverage.toFixed(1)} kg
            </div>
            <div className="text-sm text-text-secondary">3-Wochen-Mittel</div>
          </div>
        </div>
        {/* Ziel-Klassifikation & Hinweise */}
        <div className="mb-3">
          <div className={`p-4 rounded-xl border-2 ${
            classification === 'in' ? 'bg-success/10 border-success/20' :
            classification === 'under' ? 'bg-warning/10 border-warning/20' :
            classification === 'over' ? 'bg-error/10 border-error/20' :
            'border-golden/80 bg-golden/10 text-golden/80'
          }`}>
            <div className="flex items-center justify-center gap-2 mb-2">
              {classification === 'in' ? <Target className="w-5 h-5 text-success" /> :
                classification === 'under' ? <TrendingDown className="w-5 h-5 text-warning" /> :
                classification === 'over' ? <TrendingUp className="w-5 h-5 text-error" /> :
                <BarChart3 className="w-5 h-5 text-golden/80" />}
              <span className={`font-semibold ${getClassificationColor(classification ?? '')}`}>{getClassificationText(classification ?? '')}</span>
            </div>
            <div className="text-center text-sm">
              <p className={getClassificationColor(classification ?? '')}>
                Zielbereich für {GOAL_LABELS[goalKey] ?? goalKey}: {activeRange.minPct}% bis {activeRange.maxPct}% pro Woche
              </p>
              <p className={`mt-1 ${getClassificationColor(classification ?? '')}`}>
                Dein Trend: {fmtPct(trend?.pctPerWeek)}
              </p>
            </div>
          </div>
        </div>
        {/* Dynamische Empfehlung */}
        <div className="mt-3 rounded-xl border border-golden/25 bg-inkdark text-golden p-4">
          <div className="font-semibold mb-1">Empfehlung aus deinem Trend</div>
          {advice.kcalPerDay == null ? (
            <p className="opacity-80">{advice.rationale}</p>
          ) : (
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <b>Kalorien anpassen:</b> {advice.kcalPerDay < 0 ? '−' : '+'}{Math.abs(advice.kcalPerDay)} kcal/Tag
                <span className="opacity-80"> (sanft starten; nach 10–14 Tagen erneut prüfen)</span>
              </li>
              <li>
                <b>Makros anpassen:</b> {advice.carbsDeltaG! >= 0 ? '+' : '−'}{Math.abs(advice.carbsDeltaG!)} g KH/Tag,
                {' '}{advice.fatDeltaG! >= 0 ? '+' : '−'}{Math.abs(advice.fatDeltaG!)} g Fett/Tag; Protein konstant.
              </li>
              <li className="text-xs opacity-70">
                Richtwert: 1 kg ≈ 7 700 kcal. Wir steuern auf die Mitte deines Zielbereichs.
              </li>
            </ul>
          )}
        </div>

        {/* Trend-Preview Vorschau */}
        {preview && showPreview && (
          <div className="mt-3 rounded-xl border border-golden/25 bg-inkdark text-golden p-4">
            {/* Modus-Schalter */}
            <div className="mb-2 flex gap-4 text-xs">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  className="accent-golden"
                  checked={mode === 'kcal_only_keep_split'}
                  onChange={() => setMode('kcal_only_keep_split')}
                />
                Nur Kalorien anpassen (Makro-Split beibehalten)
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  className="accent-golden"
                  checked={mode === 'kcal_and_macros_delta'}
                  onChange={() => setMode('kcal_and_macros_delta')}
                />
                Kalorien + Makros anpassen (Protein konstant)
              </label>
            </div>

            <div className="font-semibold mb-2">Vorschau: neue Kalorien & Makros</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="opacity-80">Aktuell</div>
                <div>Kcal: {eff.dailyKcal}</div>
                <div>
                  P/C/F: <span className="text-macro-protein">{eff.P} g</span> / <span className="text-macro-carb">{eff.C} g</span> / <span className="text-macro-fat">{eff.F} g</span>
                </div>
              </div>
              <div>
                <div className="opacity-80">Neu</div>
                <div>Kcal: {preview.daily.kcal}</div>
                <div>
                  P/C/F: <span className="text-macro-protein">{preview.daily.P} g</span> / <span className="text-macro-carb">{preview.daily.C} g</span> / <span className="text-macro-fat">{preview.daily.F} g</span>
                </div>
              </div>
            </div>

            {/* Stufenplan (Rampen-Vorschau) */}
            {(() => {
              // Berechne die Rampe analog zu Prompt 3
              // measuresCount = number of checkins, daysCovered = days between first and last checkin
              const measuresCount = sortedCheckins.length;
              const daysCovered = (sortedCheckins.length >= 2)
                ? Math.round((new Date(sortedCheckins[sortedCheckins.length - 1].date).getTime() - new Date(sortedCheckins[0].date).getTime()) / (1000 * 60 * 60 * 24))
                : 0;
              const trendAdvice = buildAdviceFromTrend({
                pctPerWeek: trend?.pctPerWeek ?? null,
                range: activeRange,
                weightKg: (useAppStore.getState()?.profile?.weight ?? 0) as number,
                daysCovered,
                measuresCount,
              });
              const currentVals = { kcal: eff.dailyKcal, P: eff.P, C: eff.C, F: eff.F };
              const ramp = trendAdvice?.kcalPerDay ? buildRampedPreviews(currentVals, -trendAdvice.kcalPerDay) : null;
              return (trendAdvice?.kcalPerDay != null && ramp) ? (
                <>
                  <div className="mt-3 text-sm opacity-90">
                    <b>Stufenplan (empfohlen):</b> Starte mit <b>40 %</b> der Änderung für 1–2 Tage, dann <b>70 %</b>, danach <b>100 %</b>. 
                    Review in <b>{trendAdvice.reviewAfterDays ?? 12}</b> Tagen (neue Trendanalyse).
                  </div>

                  <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    {ramp.map((r, i) => (
                      <div key={i} className="rounded-lg border border-golden/30 p-3">
                        <div className="font-semibold mb-1">Phase {Math.round(r.phase*100)} %</div>
                        <div>Kcal: {r.preview.daily.kcal}</div>
                        <div>P/C/F: <span className="text-macro-protein">{r.preview.daily.P} g</span> / <span className="text-macro-carb">{r.preview.daily.C} g</span> / <span className="text-macro-fat">{r.preview.daily.F} g</span></div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 text-xs opacity-70">
                    Protein bleibt konstant; Fett ≥ 0.8 g/kg & ≥ 20 % kcal; restliche Anpassung über KH.
                  </div>
                </>
              ) : null;
            })()}

            {preview.train && preview.rest && (
              <div className="mt-2 text-xs opacity-80">
                Planer: Trainingstag {preview.train.kcal} kcal · Ruhetag {preview.rest.kcal} kcal (Offset beibehalten)
              </div>
            )}

            <div className="mt-3 flex gap-2 justify-end">
              <button
                type="button"
                className="bg-transparent text-golden px-3 py-2 rounded-lg border border-golden/40 hover:bg-golden/10"
                onClick={() => setShowPreview(false)}
              >
                Verwerfen
              </button>
              <button
                type="button"
                disabled={!preview || isApplying}
                aria-busy={isApplying ? 'true' : 'false'}
                className="bg-golden text-inkdark font-medium px-3 py-2 rounded-lg hover:bg-yellow-400 disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={handleApply}
              >
                {isApplying ? 'Übernehme…' : 'Übernehmen'}
              </button>
            </div>
          </div>
        )}
      </div>


      {/* Check-in Historie */}
      <div className="bg-surface rounded-2xl p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Check-in Historie ({checkins.length})
        </h2>
        {checkins.length === 0 ? (
          <div className="text-center py-8 text-text-secondary">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Noch keine Check-ins vorhanden</p>
            <p className="text-sm mt-1">Erstelle deinen ersten Check-in oben</p>
          </div>
        ) : (
          <div className="space-y-3">
            {checkins.slice(0, 5).map((checkin) => (
              <div key={checkin.id} className="bg-background rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-text">
                    {new Date(checkin.date).toLocaleDateString('de-DE', {
                      weekday: 'short',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-bold text-primary">
                      {checkin.weight.toFixed(1)} kg
                    </div>
                    <button title="Bearbeiten" className="ml-2 p-1 rounded hover:bg-primary/10" onClick={() => openEdit(checkin)}>
                      <Edit2 className="w-5 h-5 text-secondary" />
                    </button>
                    <button title="Löschen" className="ml-1 p-1 rounded hover:bg-error/10" onClick={() => setShowDeleteId(checkin.id)}>
                      <Trash2 className="w-5 h-5 text-error" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm text-text-secondary">
                  <div className="flex items-center gap-1">
                    <Activity className="w-4 h-4" />
                    {checkin.trainingDays} Training{checkin.trainingDays !== 1 ? 's' : ''}tage
                  </div>
                  <div className="flex items-center gap-1">
                    <Moon className="w-4 h-4" />
                    Schlaf: {checkin.sleep}/5
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    Stress: {checkin.stress}/5
                  </div>
                </div>
                {checkin.notes && (
                  <div className="mt-2 p-2 bg-surface rounded-lg text-sm text-text">
                    <FileText className="w-4 h-4 inline mr-1" />
                    {checkin.notes}
                  </div>
                )}
              </div>
            ))}
            {checkins.length > 5 && (
              <div className="text-center py-2 text-text-secondary text-sm">
                ... und {checkins.length - 5} weitere Check-ins
              </div>
            )}
          </div>
        )}

        {/* Edit Modal */}
        {editId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-golden text-inkdark rounded-xl shadow-xl p-6 w-full max-w-md relative">
              <button className="absolute top-3 right-3 p-1 rounded hover:bg-inkdark/10" onClick={() => setEditId(null)}>
                <X className="w-5 h-5 text-inkdark" />
              </button>
              <h3 className="text-inkdark font-semibold text-lg mb-4">Check-in bearbeiten</h3>
              <form onSubmit={handleEditSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-inkdark">Datum</label>
                  <input type="date" value={editData.date} onChange={e => setEditData(d => ({ ...d, date: e.target.value }))} className="w-full px-3 py-2 rounded border border-inkdark/30 bg-white text-inkdark focus:ring-2 focus:ring-inkdark" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-inkdark">Gewicht (kg)</label>
                  <input type="number" step="0.1" value={editData.weight} onChange={e => setEditData(d => ({ ...d, weight: e.target.value }))} className="w-full px-3 py-2 rounded border border-inkdark/30 bg-white text-inkdark focus:ring-2 focus:ring-inkdark" required min="0.1" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-inkdark">Notiz (optional)</label>
                  <textarea value={editData.notes} onChange={e => setEditData(d => ({ ...d, notes: e.target.value }))} className="w-full px-3 py-2 rounded border border-inkdark/30 bg-white text-inkdark focus:ring-2 focus:ring-inkdark" rows={2} />
                </div>
                <div className="flex gap-2 mt-4">
                  <button type="submit" className="flex-1 bg-golden text-inkdark font-medium py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-400 focus:ring-2 focus:ring-inkdark">
                    <Check className="w-4 h-4" /> Speichern
                  </button>
                  <button type="button" className="flex-1 border border-inkdark/40 text-inkdark rounded-xl py-2 hover:bg-inkdark/10 focus:ring-2 focus:ring-inkdark" onClick={() => setEditId(null)}>
                    Abbrechen
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Dialog */}
        {showDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-background rounded-2xl p-6 shadow-lg w-full max-w-sm relative">
              <h3 className="text-lg font-semibold mb-4">Eintrag wirklich entfernen?</h3>
              <div className="flex gap-2 mt-4">
                <button className="flex-1 bg-error text-background font-semibold py-2 rounded-xl flex items-center justify-center gap-2" onClick={() => confirmDelete(showDeleteId)}>
                  <Trash2 className="w-4 h-4" /> Entfernen
                </button>
                <button className="flex-1 border border-border rounded-xl py-2" onClick={() => setShowDeleteId(null)}>
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Hinweis */}
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-surface border border-border rounded-xl px-6 py-3 shadow-lg text-text font-medium animate-fadein">
            {toast}
          </div>
        )}
      </div>

      {/* Hinweise */}
      <div className="bg-info/10 border border-info/20 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <Scale className="w-5 h-5 text-info mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-info font-medium mb-1">
              💡 Tipps für aussagekräftige Messungen
            </p>
            <ul className="text-sm text-info space-y-1">
              <li>• <strong>Konsistenz:</strong> Immer zur gleichen Zeit wiegen (z.B. morgens)</li>
              <li>• <strong>Bedingungen:</strong> Nach Toilette, vor dem Essen, ohne Kleidung</li>
              <li>• <strong>Häufigkeit:</strong> 1x pro Woche reicht für Trendanalyse</li>
              <li>• <strong>Geduld:</strong> Mindestens 2-3 Check-ins für aussagekräftige Trends</li>
            </ul>
          </div>
        </div>
      </div>
    {/* Toast für Übernehmen */}
    {savedToast && (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-inkdark text-golden border border-golden/30 px-4 py-2 shadow"
      >
        Änderungen übernommen
      </div>
    )}
    </div>
  )
}

export { CheckinPage }
export default CheckinPage
