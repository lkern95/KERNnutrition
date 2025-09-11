import React, { useState, useEffect } from 'react'

import { splitMacrosByMeal } from '../lib/nutrition'
import { Calendar, Activity, Calculator, Info, AlertTriangle, Dumbbell, BedDouble } from 'lucide-react'
import { Accordion, Button } from '../components'
import { useAppStore } from '../store/appStore'
import { selectDailyTarget } from '../store/appStore'
import { calculatePlaner } from '../lib/planer'
import { getEffective } from '../lib/derived';

export function PlanerPage() {
  // State für Eingaben
  const [dailyTarget, setDailyTarget] = useState('')
  const [nTrainDays, setNTrainDays] = useState(4)
  const [kcalTrain, setKcalTrain] = useState('')
  const [offsetMode, setOffsetMode] = useState(false)
  const [trainOffset, setTrainOffset] = useState(0)
  
  // Berechnete Werte
  const [kcalRest, setKcalRest] = useState<number | null>(null)
  const [kcalTrainCalc, setKcalTrainCalc] = useState<number | null>(null)
  const [weeklyAverage, setWeeklyAverage] = useState<number | null>(null)
  const [weeklyDeviation, setWeeklyDeviation] = useState<number | null>(null)
  const [formulaBlock, setFormulaBlock] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [isValid, setIsValid] = useState(false)
  const [error, setError] = useState('')
  // Makros
  const [macrosTrain, setMacrosTrain] = useState<{protein:number, fat:number, carbs:number}|null>(null)
  const [macrosRest, setMacrosRest] = useState<{protein:number, fat:number, carbs:number}|null>(null)
  const [macrosAvg, setMacrosAvg] = useState<{protein:number, fat:number, carbs:number}|null>(null)

  // Mahlzeiten-Split Feature
  const [meals, setMeals] = useState(4)
  const [workoutTime, setWorkoutTime] = useState('18:00')
  const [showMacroSplit, setShowMacroSplit] = useState<null | 'protein' | 'carbs' | 'fat'>(null)
  const [featureMealSplit, setFeatureMealSplit] = useState(false)

  // Store für TDEE-Vorschlag
  const { profile } = useAppStore()
  // Selector für Zielkalorien aus dem Rechner
  const dailyTargetFromRechner = useAppStore(selectDailyTarget)

  // Lokale Persistierung
  const STORAGE_KEY = 'kernNutrition_planer_inputs'
  const eff = getEffective();

  // Eingaben beim Start laden & Prefill aus Rechner
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    let loaded = false
    if (saved) {
      try {
        const data = JSON.parse(saved)
        setDailyTarget(data.dailyTarget || '')
        setNTrainDays(data.nTrainDays || 4)
        setKcalTrain(data.kcalTrain || '')
        setOffsetMode(data.offsetMode || false)
        setTrainOffset(data.trainOffset || 0)
        setMeals(data.meals || 4)
        setWorkoutTime(data.workoutTime || '18:00')
        setFeatureMealSplit(data.featureMealSplit || false)
        loaded = true
      } catch (error) {
        console.warn('Fehler beim Laden der gespeicherten Eingaben:', error)
      }
    }
    // Prefill nur, wenn dailyTarget leer/0 und Rechner-Ziel > 0
    if (!loaded && (!dailyTarget || dailyTarget === '0') && dailyTargetFromRechner && dailyTargetFromRechner > 0) {
      setDailyTarget(String(dailyTargetFromRechner))
    }
  }, [dailyTargetFromRechner])

  // Eingaben speichern
  const saveInputs = () => {
    const data = {
      dailyTarget,
      nTrainDays,
      kcalTrain,
      offsetMode,
      trainOffset,
      meals,
      workoutTime,
      featureMealSplit
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  // Berechnung ausführen
  const calculateRestDayCalories = () => {
    const dailyTargetNum = parseFloat(dailyTarget)
    const offset = offsetMode ? trainOffset : (parseFloat(kcalTrain) - dailyTargetNum)
    try {
      // TODO: Protein/Fett/Fettsplit-Optionen ggf. aus Settings holen
      const result = calculatePlaner(dailyTargetNum, nTrainDays, offset, profile || undefined)
      setKcalRest(result.kcalRest)
      setKcalTrainCalc(result.kcalTrain)
      setWeeklyAverage(result.weeklyAverage)
      setWeeklyDeviation(result.weeklyDeviation)
      setFormulaBlock(result.formulaBlock)
      setWarnings(result.warnings)
      setMacrosTrain(result.macrosTrain)
      setMacrosRest(result.macrosRest)
      setMacrosAvg(result.macrosAvg)
      setError('')
      setIsValid(true)
    } catch (e: any) {
      setError(e.message)
      setIsValid(false)
      setKcalRest(null)
      setKcalTrainCalc(null)
      setWeeklyAverage(null)
      setWeeklyDeviation(null)
      setFormulaBlock('')
      setWarnings([])
      setMacrosTrain(null)
      setMacrosRest(null)
      setMacrosAvg(null)
    }
    saveInputs()
  }

  // Automatische Berechnung bei Änderungen
  useEffect(() => {
    if (dailyTarget && (kcalTrain || offsetMode)) {
      calculateRestDayCalories()
    }
  }, [dailyTarget, nTrainDays, kcalTrain, offsetMode, trainOffset])



  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="bg-surface rounded-2xl p-6 shadow-soft">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Calendar className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">Trainings-/Ruhetag Planer</h1>
            <p className="text-text-secondary text-sm">
              Berechne optimale Kalorienzufuhr für Training- und Ruhetage
            </p>
          </div>
        </div>
      </div>

      {/* Eingaben */}
      <div className="bg-surface rounded-2xl p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          Kalorienziele festlegen
        </h2>
        
        <div className="space-y-6">
          {/* Tagesziel */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Durchschnittliches Tagesziel (kcal/Tag)
            </label>
            <input
              type="number"
              value={dailyTarget}
              defaultValue={eff.dailyKcal}
              onChange={(e) => setDailyTarget(e.target.value)}
              placeholder="z.B. 2500"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              aria-label="aus Rechner übernommen"
            />
            <p className="text-xs text-text-secondary mt-1">
              Dein angestrebtes Tagesmittel über die Woche
              {dailyTargetFromRechner && dailyTargetFromRechner > 0 && String(dailyTarget) === String(dailyTargetFromRechner) && (
                <span className="block text-[11px] text-info mt-1">Automatisch aus Rechner übernommen – anpassbar</span>
              )}
            </p>
          </div>

          {/* Trainingstage */}
          <div>
            <label className="block text-sm font-medium text-text mb-3">
              Anzahl Trainingstage pro Woche: {nTrainDays}
            </label>
            <div className="flex items-center gap-4">
              <span className="text-sm text-text-secondary">0</span>
              <input
                type="range"
                min="0"
                max="6"
                step="1"
                value={nTrainDays}
                onChange={(e) => setNTrainDays(parseInt(e.target.value))}
                className="flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer slider"
              />
              <span className="text-sm text-text-secondary">6</span>
              <div className="w-12 text-center">
                <span className="text-sm font-medium text-text">{nTrainDays}</span>
              </div>
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Tage mit intensivem Training (max. 6, da mindestens 1 Ruhetag empfohlen)
            </p>
          </div>

      {/* Trainingstag Kalorien */}
          {/* Mahlzeiten-Split Feature-Flag */}
          <div className="flex items-center gap-2 mt-4">
            <input type="checkbox" id="featureMealSplit" checked={featureMealSplit} onChange={e => setFeatureMealSplit(e.target.checked)} />
            <label htmlFor="featureMealSplit" className="text-sm">Mahlzeiten-Split anzeigen (Beta)</label>
          </div>

          {/* Anzahl Mahlzeiten */}
          {featureMealSplit && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-text mb-2">Anzahl Mahlzeiten pro Tag</label>
              <input
                type="number"
                min={3}
                max={6}
                value={meals}
                onChange={e => setMeals(Math.max(3, Math.min(6, parseInt(e.target.value)||4)))}
                className="w-24 px-4 py-2 rounded-xl border border-border bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <span className="ml-2 text-xs text-text-secondary">(3–6 empfohlen)</span>
            </div>
          )}

          {/* Trainingszeit */}
          {featureMealSplit && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-text mb-2">Trainingszeit (hh:mm)</label>
              <input
                type="time"
                value={workoutTime}
                onChange={e => setWorkoutTime(e.target.value)}
                className="w-32 px-4 py-2 rounded-xl border border-border bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          )}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <label className="text-sm font-medium text-text">
                Trainingstag-Kalorien
              </label>
              <button
                onClick={() => setOffsetMode(!offsetMode)}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  offsetMode 
                    ? 'bg-primary text-background' 
                    : 'bg-background border border-border text-text hover:bg-surface'
                }`}
              >
                {offsetMode ? 'Offset-Modus' : 'Direkte Eingabe'}
              </button>
            </div>

            {offsetMode ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-2">
                    Offset zu Tagesziel: {trainOffset > 0 ? '+' : ''}{trainOffset} kcal
                  </label>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-text-secondary">-500</span>
                    <input
                      type="range"
                      min="-500"
                      max="500"
                      step="25"
                      value={trainOffset}
                      onChange={(e) => setTrainOffset(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer slider"
                    />
                    <span className="text-sm text-text-secondary">+500</span>
                  </div>
                </div>
                <div className="bg-background rounded-xl p-3 border border-border">
                  <div className="text-sm text-text">
                    <span className="text-text-secondary">Trainingstag-Kalorien:</span>
                    <span className="font-medium ml-2">
                      {dailyTarget ? Math.round(parseFloat(dailyTarget) + trainOffset) : '—'} kcal
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="number"
                  value={kcalTrain}
                  onChange={(e) => setKcalTrain(e.target.value)}
                  placeholder="z.B. 2700"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
                <p className="text-xs text-text-secondary mt-1">
                  Kalorien an Trainingstagen (oft höher wegen erhöhtem Bedarf)
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fehler */}
      {error && (
        <div className="bg-error/10 border border-error/20 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-error mt-0.5 flex-shrink-0" />
            <p className="text-sm text-error">{error}</p>
          </div>
        </div>
      )}

      {/* Ergebnisse */}
      {isValid && kcalRest !== null && kcalTrainCalc !== null && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-text">Dein Wochenplan</h2>
          {/* Trainings- und Ruhetag Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface rounded-2xl p-6 shadow-soft">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <Dumbbell className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text">Trainingstag</h3>
                  <p className="text-sm text-text-secondary">{nTrainDays}x pro Woche</p>
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-secondary mb-2">
                  {kcalTrainCalc} kcal
                </div>
                <p className="text-sm text-text-secondary">
                  Erhöhter Kalorienbedarf durch Training
                </p>
              </div>
            </div>
            <div className="bg-surface rounded-2xl p-6 shadow-soft">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-info/10 rounded-lg">
                  <BedDouble className="w-5 h-5 text-info" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text">Ruhetag</h3>
                  <p className="text-sm text-text-secondary">{7 - nTrainDays}x pro Woche</p>
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-info mb-2">
                  {kcalRest} kcal
                </div>
                <p className="text-sm text-text-secondary">
                  Reduzierter Bedarf für Regeneration
                </p>
              </div>
            </div>
          </div>
          {/* Wochenmittel Validierung */}
          <div className="bg-surface rounded-2xl p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-text mb-4">Validierung & Übersicht</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-background rounded-xl">
                <div className="text-xl font-bold text-primary mb-1">
                  {weeklyAverage} kcal
                </div>
                <div className="text-sm text-text-secondary">Wochenmittel</div>
              </div>
              <div className="text-center p-4 bg-background rounded-xl">
                <div className="text-xl font-bold text-accent mb-1">
                  {parseFloat(dailyTarget)} kcal
                </div>
                <div className="text-sm text-text-secondary">Angestrebtes Ziel</div>
              </div>
              <div className="text-center p-4 bg-background rounded-xl">
                <div className={`text-xl font-bold mb-1 ${
                  Math.abs((weeklyDeviation || 0)) <= 1 
                    ? 'text-success' : 'text-warning'
                }`}>
                  {weeklyDeviation && weeklyDeviation > 0 ? '+' : ''}{weeklyDeviation || 0}
                </div>
                <div className="text-sm text-text-secondary">Abweichung</div>
              </div>
            </div>
            {/* Makro-Übersicht */}
            {(macrosTrain && macrosRest && macrosAvg) && (
              <div className="bg-surface/80 border border-primary/20 rounded-xl p-4 mb-4">
                <h4 className="text-sm font-medium text-primary mb-2">Makronährstoffe (g)</h4>
                <table className="w-full text-xs text-center">
                  <thead>
                    <tr>
                      <th className="font-semibold">&nbsp;</th>
                      <th>Trainingstag</th>
                      <th>Ruhetag</th>
                      <th>Wochenmittel</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="font-semibold cursor-pointer underline decoration-dotted" onClick={() => featureMealSplit && setShowMacroSplit('protein')}>Protein</td>
                      <td>{macrosTrain.protein}</td>
                      <td>{macrosRest.protein}</td>
                      <td>{macrosAvg.protein}</td>
                    </tr>
                    <tr>
                      <td className="font-semibold cursor-pointer underline decoration-dotted" onClick={() => featureMealSplit && setShowMacroSplit('fat')}>Fett</td>
                      <td>{macrosTrain.fat}</td>
                      <td>{macrosRest.fat}</td>
                      <td>{macrosAvg.fat}</td>
                    </tr>
                    <tr>
                      <td className="font-semibold cursor-pointer underline decoration-dotted" onClick={() => featureMealSplit && setShowMacroSplit('carbs')}>Carbs</td>
                      <td>{macrosTrain.carbs}</td>
                      <td>{macrosRest.carbs}</td>
                      <td>{macrosAvg.carbs}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
      {/* Bottom-Sheet/Dialog für Mahlzeiten-Split */}
      {featureMealSplit && showMacroSplit && macrosTrain && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setShowMacroSplit(null)}>
          <div className="bg-surface rounded-t-2xl shadow-lg w-full max-w-md mx-auto p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">Mahlzeiten-Split: {showMacroSplit.charAt(0).toUpperCase() + showMacroSplit.slice(1)}</h3>
            <table className="w-full text-xs text-center mb-2">
              <thead>
                <tr>
                  <th>Mahlzeit</th>
                  <th>Menge (g)</th>
                  <th>Typ</th>
                </tr>
              </thead>
              <tbody>
                {splitMacrosByMeal({
                  protein: macrosTrain.protein,
                  carbs: macrosTrain.carbs,
                  fat: macrosTrain.fat,
                  meals
                }).map((m, i) => (
                  <tr key={i}>
                    <td>{i+1}</td>
                    <td>{m[showMacroSplit]}</td>
                    <td>{m.type === 'pre' ? 'Pre-Workout' : m.type === 'post' ? 'Post-Workout' : 'Sonstige'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-xs text-text-secondary mb-2">
              <b>Praxis:</b> Pre-Workout: 35% Carbs, Post-Workout: 25% Carbs, Fett pre/post je -20%. Protein gleichmäßig.<br/>
              <b>Studien:</b> Timing von Carbs/Fett kann Performance & Regeneration verbessern (z.B. Jäger et al. 2017, Aragon & Schoenfeld 2013).
            </div>
            <button className="mt-2 px-4 py-2 rounded-xl bg-primary text-background font-semibold w-full" onClick={() => setShowMacroSplit(null)}>Schließen</button>
          </div>
        </div>
      )}
            {/* Formelblock als Accordion (Rechenweg) */}
            <Accordion
              title={<span className="text-sm font-medium" style={{ color: '#292c2f' }}>📋 Rechenweg anzeigen</span>}
              defaultOpen={false}
              arrowColor="#292c2f"
            >
              <div className="bg-golden rounded-xl p-0">
                <div className="flex flex-col gap-2">
                  <pre
                    className="text-xs whitespace-pre-wrap select-all bg-transparent border-0 p-0 m-0"
                    style={{ color: '#292c2f' }}
                    aria-label="Rechenweg"
                  >{formulaBlock}</pre>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="self-end mt-1"
                    style={{ color: '#292c2f', borderColor: '#292c2f' }}
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(formulaBlock)
                      }
                    }}
                    aria-label="Rechenweg in Zwischenablage kopieren"
                  >
                    In Zwischenablage kopieren
                  </Button>
                </div>
              </div>
            </Accordion>
            {/* Warnungen */}
            {warnings.length > 0 && (
              <div className="mt-4 bg-warning/10 border border-warning/20 rounded-xl p-3">
                <ul className="text-xs text-warning space-y-1">
                  {warnings.map((w, i) => <li key={i}>⚠️ {w}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info-Box */}
      <div className="bg-info/10 border border-info/20 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-info mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-info font-medium mb-1">
              💡 Tipps für optimale Planung
            </p>
            <ul className="text-sm text-info space-y-1">
              <li>• <strong>Trainingstage:</strong> Höhere Kalorienzufuhr unterstützt Leistung und Regeneration</li>
              <li>• <strong>Ruhetage:</strong> Reduzierte Kalorien können beim Fettabbau helfen</li>
              <li>• <strong>Flexibilität:</strong> Passe die Werte je nach Trainingsintensität an</li>
              <li>• <strong>Mindestens 1 Ruhetag:</strong> Wichtig für Erholung und Hormonbalance</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
