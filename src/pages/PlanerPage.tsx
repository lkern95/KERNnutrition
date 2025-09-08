import React, { useState, useEffect } from 'react'
import { Calendar, Activity, Calculator, Info, AlertTriangle, Dumbbell, BedDouble } from 'lucide-react'
import { useAppStore } from '../store/appStore'

export function PlanerPage() {
  // State für Eingaben
  const [dailyTarget, setDailyTarget] = useState('')
  const [nTrainDays, setNTrainDays] = useState(4)
  const [kcalTrain, setKcalTrain] = useState('')
  const [offsetMode, setOffsetMode] = useState(false)
  const [trainOffset, setTrainOffset] = useState(0)
  
  // Berechnete Werte
  const [kcalRest, setKcalRest] = useState<number | null>(null)
  const [isValid, setIsValid] = useState(false)
  const [error, setError] = useState('')

  // Store für TDEE-Vorschlag
  const { profile } = useAppStore()

  // Lokale Persistierung
  const STORAGE_KEY = 'kernCares_planer_inputs'

  // Eingaben beim Start laden
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const data = JSON.parse(saved)
        setDailyTarget(data.dailyTarget || '')
        setNTrainDays(data.nTrainDays || 4)
        setKcalTrain(data.kcalTrain || '')
        setOffsetMode(data.offsetMode || false)
        setTrainOffset(data.trainOffset || 0)
      } catch (error) {
        console.warn('Fehler beim Laden der gespeicherten Eingaben:', error)
      }
    }
  }, [])

  // Eingaben speichern
  const saveInputs = () => {
    const data = {
      dailyTarget,
      nTrainDays,
      kcalTrain,
      offsetMode,
      trainOffset
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  // Berechnung ausführen
  const calculateRestDayCalories = () => {
    const dailyTargetNum = parseFloat(dailyTarget)
    const kcalTrainNum = offsetMode ? dailyTargetNum + trainOffset : parseFloat(kcalTrain)
    
    // Validierung
    if (!dailyTargetNum || dailyTargetNum <= 0) {
      setError('Bitte gib ein gültiges Tagesziel ein (> 0 kcal)')
      setIsValid(false)
      return
    }

    if (nTrainDays === 7) {
      setError('Bei 7 Trainingstagen gibt es keine Ruhetage für die Berechnung')
      setIsValid(false)
      return
    }

    if (nTrainDays < 0 || nTrainDays > 6) {
      setError('Anzahl Trainingstage muss zwischen 0 und 6 liegen')
      setIsValid(false)
      return
    }

    if (!kcalTrainNum || kcalTrainNum <= 0) {
      setError('Bitte gib gültige Trainingstag-Kalorien ein (> 0 kcal)')
      setIsValid(false)
      return
    }

    // Formel: kcal_rest = (7*daily_target - n*kcal_train) / (7 - n)
    const restDays = 7 - nTrainDays
    const totalWeeklyTarget = 7 * dailyTargetNum
    const totalTrainCalories = nTrainDays * kcalTrainNum
    const calculatedRestCalories = (totalWeeklyTarget - totalTrainCalories) / restDays

    // Validierung des Ergebnisses
    if (calculatedRestCalories <= 0) {
      setError('Ruhetag-Kalorien wären negativ. Reduziere die Trainingstag-Kalorien oder erhöhe das Tagesziel.')
      setIsValid(false)
      return
    }

    if (calculatedRestCalories < 800) {
      setError('Warnung: Ruhetag-Kalorien unter 800 kcal sind gesundheitlich bedenklich')
      setIsValid(false)
      return
    }

    setKcalRest(Math.round(calculatedRestCalories))
    setError('')
    setIsValid(true)
    saveInputs()
  }

  // Automatische Berechnung bei Änderungen
  useEffect(() => {
    if (dailyTarget && (kcalTrain || offsetMode)) {
      calculateRestDayCalories()
    }
  }, [dailyTarget, nTrainDays, kcalTrain, offsetMode, trainOffset])

  // Wochenmittel zur Validierung
  const weeklyAverage = isValid && kcalRest ? 
    Math.round((nTrainDays * (offsetMode ? parseFloat(dailyTarget) + trainOffset : parseFloat(kcalTrain)) + 
                (7 - nTrainDays) * kcalRest) / 7) : null

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
              onChange={(e) => setDailyTarget(e.target.value)}
              placeholder="z.B. 2500"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
            <p className="text-xs text-text-secondary mt-1">
              Dein angestrebtes Tagesmittel über die Woche
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
      {isValid && kcalRest && (
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
                  {offsetMode ? Math.round(parseFloat(dailyTarget) + trainOffset) : parseFloat(kcalTrain)} kcal
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
                  Math.abs((weeklyAverage || 0) - parseFloat(dailyTarget)) <= 1 
                    ? 'text-success' : 'text-warning'
                }`}>
                  {weeklyAverage ? (weeklyAverage - parseFloat(dailyTarget) > 0 ? '+' : '') : ''}
                  {weeklyAverage ? Math.round(weeklyAverage - parseFloat(dailyTarget)) : 0}
                </div>
                <div className="text-sm text-text-secondary">Abweichung</div>
              </div>
            </div>

            {/* Beispielrechnung */}
            <div className="bg-info/10 border border-info/20 rounded-xl p-4">
              <h4 className="text-sm font-medium text-info mb-2">📋 Rechenweg zur Validierung:</h4>
              <div className="text-sm text-info space-y-1">
                <p>
                  <strong>Formel:</strong> kcal_rest = (7 × daily_target − n × kcal_train) ÷ (7 − n)
                </p>
                <p>
                  <strong>Eingesetzt:</strong> ({7} × {parseFloat(dailyTarget)} − {nTrainDays} × {offsetMode ? Math.round(parseFloat(dailyTarget) + trainOffset) : parseFloat(kcalTrain)}) ÷ ({7} − {nTrainDays})
                </p>
                <p>
                  <strong>Berechnung:</strong> ({7 * parseFloat(dailyTarget)} − {nTrainDays * (offsetMode ? Math.round(parseFloat(dailyTarget) + trainOffset) : parseFloat(kcalTrain))}) ÷ {7 - nTrainDays} = <strong>{kcalRest} kcal</strong>
                </p>
              </div>
            </div>
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
