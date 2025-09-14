
import React, { useState, useEffect, useRef } from 'react';
import { saveGoalPref, mapRechnerLabelToKey } from '../lib/goalPref';
import { saveCalcResult, loadCalcResult } from '../lib/calcCache';
import { getEffective } from '../lib/derived';
import { Calculator, Activity, Target, Scale, Ruler, Calendar, Info, AlertTriangle, Settings } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { macrosFromTargets, type CalcInput, type MacroResult, type ValidationWarning } from '../lib/nutrition';
import { getSettings, formatValue, validateCalorieGoal, validateMacros } from '../lib/settings';
import '../App.css';

// Info texts for popovers

// Info texts for popovers
const INFO_TEXTS = {
  BMR: (
    <div style={{maxWidth: 320}}>
      <b>BMR (Grundumsatz):</b> Kalorienverbrauch in völliger Ruhe.<br/>
      <ul className="list-disc pl-4 mt-2 text-xs">
        <li>Alter: Mit zunehmendem Alter sinkt der BMR.</li>
        <li>Geschlecht: Männer haben meist höheren BMR.</li>
        <li>Körpergewicht & Größe: Mehr Gewebe = höherer BMR.</li>
        <li>Muskelmasse: Mehr Muskeln = höherer BMR.</li>
        <li>Genetik & Hormonhaushalt beeinflussen den BMR.</li>
      </ul>
      <div className="mt-2 text-xs text-text-secondary">
        <b>Verteilung BMR (im Ruhezustand):</b><br/>
        Leber: 26% • Muskeln: 26% • Gehirn: 18% • Herz: 9% • Nieren: 7%
      </div>
    </div>
  ),
  TDEE: (
    <div style={{maxWidth: 320}}>
      <b>TDEE (Gesamtumsatz):</b> Kalorienverbrauch inkl. Alltagsaktivität & Training.<br/>
      <ul className="list-disc pl-4 mt-2 text-xs">
        <li>BMR (Grundumsatz)</li>
        <li>NEAT (Alltagsbewegung, z. B. Gehen, Treppensteigen)</li>
        <li>TEF (Verdauungskosten der Nahrung)</li>
        <li>Training (Sportliche Aktivität)</li>
      </ul>
      <div className="mt-2 text-xs text-text-secondary">
        <b>Dein Aktivitätslevel & Körperdaten bestimmen den TDEE.</b>
      </div>
    </div>
  ),
  Zielkalorien: (
    <div style={{maxWidth: 320}}>
      <b>Zielkalorien:</b> Dein bewusst gewähltes Ziel (z. B. für Muskelaufbau).<br/>
      <ul className="list-disc pl-4 mt-2 text-xs">
        <li>Abnehmen: 10–20 % unter TDEE (Kaloriendefizit)</li>
        <li>Muskelaufbau: 10–20 % über TDEE (Kalorienüberschuss)</li>
        <li>Gewicht halten: Zielkalorien = TDEE</li>
      </ul>
      <div className="mt-2 text-xs text-text-secondary">
        <b>Dein Ziel & TDEE bestimmen die Zielkalorien.</b>
      </div>
    </div>
  )
}

function InfoPopover({text, open, onClose, anchorRef}: {text: React.ReactNode, open: boolean, onClose: () => void, anchorRef: React.RefObject<HTMLButtonElement | null>}) {
  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open, anchorRef, onClose]);
  if (!open) return null;
  return (
    <div style={{position: 'absolute', zIndex: 50, top: '2.2rem', left: '50%', transform: 'translateX(-50%)'}} className="bg-surface border border-border rounded-xl shadow-lg p-4 text-xs text-left max-w-xs animate-fadein">
      {text}
    </div>
  );
}

// Card with Info-Icon and popover for BMR, TDEE, Zielkalorien
function BmrTdeeZielCard({label, value, color, infoText}: {label: string, value: any, color: string, infoText: React.ReactNode}) {
  const [open, setOpen] = React.useState(false);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  return (
    <div className="bg-surface rounded-2xl p-6 shadow-soft relative">
      <div className="text-center">
        <div className="text-3xl font-bold mb-2" style={{ color }}>{value}</div>
        <div className="flex items-center justify-center gap-1 mb-1">
          <div className="text-sm font-medium text-text">{label}</div>
          <button ref={btnRef} type="button" aria-label="Info" onClick={() => setOpen(o => !o)} className="ml-1 align-middle">
            <Info className="w-4 h-4 text-info hover:text-primary transition-colors" />
          </button>
          <InfoPopover text={infoText} open={open} onClose={() => setOpen(false)} anchorRef={btnRef} />
        </div>
        <div className="text-xs text-text-secondary">
          {label === 'BMR' && 'Grundumsatz - Kalorien in Ruhe'}
          {label === 'TDEE' && 'Gesamtumsatz mit Aktivität'}
          {label === 'Zielkalorien' && 'Für dein gewähltes Ziel'}
        </div>
      </div>
    </div>
  );
}


// Aktivitätsfaktoren für Dropdown
const ACTIVITY_OPTIONS = [
  { value: 1.2, label: '1.2 - Sitzend (Büroarbeit, wenig/keine Bewegung)' },
  { value: 1.3, label: '1.3 - Leicht aktiv (leichte Übungen 1-3x/Woche)' },
  { value: 1.4, label: '1.4 - Mäßig aktiv (moderate Übungen 3-5x/Woche)' },
  { value: 1.5, label: '1.5 - Aktiv (intensive Übungen 3-5x/Woche)' },
  { value: 1.6, label: '1.6 - Sehr aktiv (intensive Übungen 6-7x/Woche)' },
  { value: 1.7, label: '1.7 - Extrem aktiv (sehr intensive Übungen, körperliche Arbeit)' },
  { value: 1.8, label: '1.8 - Hochleistungssport (2x täglich Training)' },
  { value: 1.9, label: '1.9 - Profisport (extreme körperliche Belastung)' }
]

// Vordefinierte Ziele
const GOAL_PRESETS = [
  { id: 'maintain', label: 'Erhaltung (TDEE)', adjust: 0, description: 'Gewicht halten' },
  { id: 'lean_bulk', label: 'Lean Bulk', adjust: 275, description: '+200-350 kcal', range: [200, 350] },
  { id: 'conservative', label: 'Konservativer Aufbau', adjust: 200, description: '+150-250 kcal', range: [150, 250] },
  { id: 'cut', label: 'Diät', adjust: -400, description: '-300-500 kcal', range: [-500, -300] },
  { id: 'aggressive', label: 'Aggressive Diät', adjust: -600, description: '-600 kcal (Achtung: Nur kurzfristig!)', range: [-600, -600], warning: true },
  { id: 'custom', label: 'Benutzerdefiniert', adjust: 0, description: 'Freie Eingabe' }
]

export function RechnerPage() {
  // Immer aktuelle BMR/TDEE anzeigen
  const profile = useAppStore(s => s.profile);
  const eff = React.useMemo(() => getEffective(), [profile]);
  // Zustand für Eingabefelder
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState<'M' | 'F'>('M')
  const [activityFactor, setActivityFactor] = useState(1.5)
  const [customActivity, setCustomActivity] = useState('')
  const [goalPreset, setGoalPreset] = useState('maintain')
  const [customAdjust, setCustomAdjust] = useState('')
  const [proteinPerKg, setProteinPerKg] = useState(2.0)
  const [fatPerKg, setFatPerKg] = useState(1.0)
  const [carbsPerKg, setCarbsPerKg] = useState<number | ''>('')
  
  // Ergebnisse
  const [result, setResult] = useState<MacroResult | null>(null)
  // Ergebnis aus Cache laden (beim Mount)
  useEffect(() => {
    const cached = loadCalcResult();
    if (cached) {
      setResult({
        targetKcal: cached.dailyKcal,
        proteinG: cached.protein_g,
        carbsG: cached.carbs_g,
        fatG: cached.fat_g,
        trainingDayKcal: cached.trainingDayKcal ?? undefined,
        restDayKcal: cached.restDayKcal ?? undefined,
      } as any);
      setIsCalculated(true);
    }
  }, []);
  const [warnings, setWarnings] = useState<ValidationWarning[]>([])
  const [isCalculated, setIsCalculated] = useState(false)

  // Store für Persistierung
  const { setProfile } = useAppStore()

  // Lokale Persistierung
  const STORAGE_KEY = 'kernBalance_calculator_inputs'

  // Eingaben beim Start laden
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const data = JSON.parse(saved)
        setWeight(data.weight || '')
        setHeight(data.height || '')
        setAge(data.age || '')
        setSex(data.sex || 'M')
        setActivityFactor(data.activityFactor || 1.5)
        setGoalPreset(data.goalPreset || 'maintain')
        setCustomAdjust(data.customAdjust || '')
  setProteinPerKg(data.proteinPerKg || 2.0)
  setFatPerKg(data.fatPerKg || 1.0)
  setCarbsPerKg(typeof data.carbsPerKg === 'number' ? data.carbsPerKg : '')
      } catch (error) {
        console.warn('Fehler beim Laden der gespeicherten Eingaben:', error)
      }
    }
  }, [])

  // Eingaben speichern
  const saveInputs = () => {
    const data = {
      weight,
      height,
      age,
      sex,
      activityFactor,
      goalPreset,
      customAdjust,
      proteinPerKg,
      fatPerKg,
      carbsPerKg
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  // Berechnung ausführen
  const handleCalculate = () => {
    // Validierung
    const weightNum = parseFloat(weight)
    const heightNum = parseFloat(height)
    const ageNum = parseInt(age)
    
    if (!weightNum || !heightNum || !ageNum || weightNum <= 0 || heightNum <= 0 || ageNum <= 0) {
      alert('Bitte gib gültige Werte für Gewicht, Größe und Alter ein.')
      return
    }

    // Aktivitätsfaktor bestimmen
    const finalActivityFactor = customActivity ? parseFloat(customActivity) : activityFactor
    if (!finalActivityFactor || finalActivityFactor <= 0) {
      alert('Bitte gib einen gültigen Aktivitätsfaktor ein.')
      return
    }

    // Kalorienanpassung bestimmen
    let kcalAdjust = 0
    if (goalPreset === 'custom') {
      kcalAdjust = parseFloat(customAdjust) || 0
    } else {
      const preset = GOAL_PRESETS.find(p => p.id === goalPreset)
      kcalAdjust = preset?.adjust || 0
    }

    // Eingaben für Berechnung
    const input: CalcInput = {
      weightKg: weightNum,
      heightCm: heightNum,
      age: ageNum,
      sex,
      activityFactor: finalActivityFactor,
      kcalAdjust,
      proteinPerKg,
      fatPerKg,
      ...(carbsPerKg !== '' ? { carbsPerKg: Number(carbsPerKg) } : {})
    }

    try {
      // Get current settings
      const settings = getSettings()

      // Prüfe auf extreme Kalorienanpassung
      const extremeAdjust = Math.abs(kcalAdjust) > 1000;
      let extremeAdjustWarning: ValidationWarning | null = null;
      if (extremeAdjust) {
        extremeAdjustWarning = {
          type: 'extreme_adjust',
          message: 'Kalorienanpassung größer ±1000 kcal ist unrealistisch. Bitte reduziere deinen Wert.'
        };
      }

      // Apply macro overrides if enabled
      let finalProteinPerKg = proteinPerKg
      let finalFatPerKg = fatPerKg

      if (settings.macroOverride.enabled) {
        if (settings.macroOverride.protein !== null) {
          finalProteinPerKg = settings.macroOverride.protein
        }
        // Fett-Override wird nach der ersten Makro-Berechnung angewendet (siehe unten)
      }

      // Update input with overrides (Fett-Override wird ggf. später angewendet)
      let finalInput: CalcInput = {
        ...input,
        proteinPerKg: finalProteinPerKg,
        fatPerKg: finalFatPerKg
      }

      let { result: calcResult, warnings: calcWarnings } = macrosFromTargets(finalInput);

      // Fett-Override nach Zielkalorien anwenden, falls aktiviert
      if (settings.macroOverride.enabled && settings.macroOverride.fat !== null) {
        const fatPercentOverride = settings.macroOverride.fat / 100;
        const fatGramsTotal = calcResult.targetKcal * fatPercentOverride / 9;
        const newFatPerKg = fatGramsTotal / weightNum;
        finalInput = {
          ...finalInput,
          fatPerKg: newFatPerKg
        };
        // Makros erneut berechnen mit korrektem Fettwert
        const recalculated = macrosFromTargets(finalInput);
        calcResult = recalculated.result;
        calcWarnings = recalculated.warnings;
      }
      
      // Apply precision formatting
      const formattedResult: MacroResult = {
        ...calcResult,
        targetKcal: formatValue(calcResult.targetKcal, 'calories'),
        proteinG: formatValue(calcResult.proteinG, 'macros'),
        carbsG: formatValue(calcResult.carbsG, 'macros'),
        fatG: formatValue(calcResult.fatG, 'macros'),
        ...(calcResult.carbsPerKg !== undefined ? { carbsPerKg: calcResult.carbsPerKg } : {})
      }
      
      // Validate results with settings guardrails
      const calorieValidation = validateCalorieGoal(formattedResult.targetKcal)
      const macroValidation = validateMacros(
        formattedResult.proteinG, 
        formattedResult.fatG, 
        formattedResult.carbsG, 
        formattedResult.targetKcal
      )
      
      // Combine all warnings - convert validation warnings to the expected format
      const settingsWarnings: ValidationWarning[] = []
      
      // Add calorie warnings
      if (!calorieValidation.isValid) {
        settingsWarnings.push({
          type: 'activity_factor_extreme',
          message: calorieValidation.warnings.join('; ')
        })
      }
      
      // Add macro warnings  
      if (!macroValidation.isValid) {
        settingsWarnings.push({
          type: 'fat_too_low',
          message: macroValidation.warnings.join('; ')
        })
      }
      
      const allWarnings = [...calcWarnings, ...settingsWarnings]

  // Füge ggf. Warnung für extreme Kalorienanpassung hinzu
  const finalWarnings = extremeAdjustWarning ? [...allWarnings, extremeAdjustWarning] : allWarnings;

  setResult(formattedResult)
  setWarnings(finalWarnings)
  setIsCalculated(true)

      // Ergebnis persistent speichern
      saveCalcResult({
        dailyKcal: calcResult.targetKcal,
        protein_g: calcResult.proteinG,
        carbs_g: calcResult.carbsG,
        fat_g: calcResult.fatG,
        source: 'rechner',
      });
      
      // Store aktualisieren
  setProfile({
    name: '',
    weight: weightNum,
    height: heightNum,
    age: ageNum,
    gender: sex === 'M' ? 'male' : 'female',
    activityLevel: finalActivityFactor >= 1.7 ? 'very_active' : 
          finalActivityFactor >= 1.55 ? 'moderately_active' :
          finalActivityFactor >= 1.375 ? 'lightly_active' : 'sedentary',
    goal: goalPreset === 'maintain' ? 'maintain' : 
      kcalAdjust > 0 ? 'gain' : 'lose',
    targetKcal: typeof formattedResult.targetKcal === 'number' ? formattedResult.targetKcal : parseFloat(formattedResult.targetKcal)
  })
      
      // Eingaben speichern
      saveInputs()
    } catch (error) {
      alert(`Fehler bei der Berechnung: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    }
  }

  // Ziel-Preset auswählen
  const handleGoalChange = (goalId: string) => {
    setGoalPreset(goalId);
    saveGoalPref(mapRechnerLabelToKey(goalId));
    if (goalId !== 'custom') {
      setCustomAdjust('');
    }
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Grundwerte oben entfernt, Anzeige unten bleibt */}
      {/* Header */}
      <div className="bg-surface rounded-2xl p-6 shadow-soft">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Calculator className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">Makro-Rechner</h1>
            <p className="text-text-secondary text-sm">
              Berechne deinen individuellen Kalorienbedarf und Makroverteilung
            </p>
          </div>
        </div>
      </div>

      {/* Eingabeformular */}
      <div className="bg-surface rounded-2xl p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
          <Scale className="w-5 h-5 text-primary" />
          Körperdaten
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Gewicht (kg)
            </label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="z.B. 70"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Größe (cm)
            </label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="z.B. 175"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Alter (Jahre)
            </label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="z.B. 25"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Geschlecht
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setSex('M')}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${
                  sex === 'M'
                    ? 'bg-primary text-background'
                    : 'bg-background border border-border text-text hover:bg-surface'
                }`}
              >
                Männlich
              </button>
              <button
                onClick={() => setSex('F')}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${
                  sex === 'F'
                    ? 'bg-primary text-background'
                    : 'bg-background border border-border text-text hover:bg-surface'
                }`}
              >
                Weiblich
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Aktivitätsfaktor */}
      <div className="bg-surface rounded-2xl p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Aktivitätslevel
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Vordefinierte Werte
            </label>
            <select
              value={customActivity ? '' : activityFactor}
              onChange={(e) => {
                setActivityFactor(parseFloat(e.target.value))
                setCustomActivity('')
              }}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            >
              {ACTIVITY_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Oder eigener Wert (1.0 - 2.0)
            </label>
            <input
              type="number"
              value={customActivity}
              onChange={(e) => setCustomActivity(e.target.value)}
              placeholder="z.B. 1.65"
              step="0.1"
              min="1.0"
              max="2.0"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Ziele */}
      <div className="bg-surface rounded-2xl p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Ziel & Kalorienanpassung
        </h2>
        
        <div className="space-y-3 mb-4">
          {GOAL_PRESETS.map(preset => (
            <div key={preset.id}>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-background transition-colors cursor-pointer">
                <input
                  type="radio"
                  name="goal"
                  value={preset.id}
                  checked={goalPreset === preset.id}
                  onChange={(e) => handleGoalChange(e.target.value)}
                  className="w-4 h-4 text-primary focus:ring-primary/20"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text">{preset.label}</span>
                    {preset.warning && (
                      <AlertTriangle className="w-4 h-4 text-warning" />
                    )}
                  </div>
                  <p className="text-sm text-text-secondary">{preset.description}</p>
                </div>
              </label>
              
              {preset.warning && goalPreset === preset.id && (
                <div className="mt-2 p-3 bg-warning/10 border border-warning/20 rounded-xl">
                  <p className="text-sm text-warning">
                    ⚠️ Aggressive Diäten sollten nur kurzfristig und unter fachlicher Betreuung durchgeführt werden.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {goalPreset === 'custom' && (
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Kalorienanpassung (kcal)
            </label>
            <input
              type="number"
              value={customAdjust}
              onChange={(e) => setCustomAdjust(e.target.value)}
              placeholder="z.B. +300 oder -500"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>
        )}
      </div>

      {/* Makronährstoff-Einstellungen */}
      <div className="bg-surface rounded-2xl p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-text mb-4">
          Makronährstoff-Voreinstellungen
        </h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text mb-3">
              Protein: {proteinPerKg.toFixed(1)} g/kg
            </label>
            <div className="flex items-center gap-4">
              <span className="text-sm text-text-secondary">1.8</span>
              <input
                type="range"
                min="1.8"
                max="2.5"
                step="0.1"
                value={proteinPerKg}
                onChange={(e) => setProteinPerKg(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer slider"
              />
              <span className="text-sm text-text-secondary">2.5</span>
              <input
                type="number"
                value={proteinPerKg}
                onChange={(e) => setProteinPerKg(parseFloat(e.target.value) || 1.8)}
                step="0.1"
                min="1.8"
                max="2.5"
                className="w-20 px-2 py-1 text-sm rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Empfohlen: 1.8-2.5 g/kg für Kraftsport und Muskelaufbau
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-3">
              Fett: {fatPerKg.toFixed(1)} g/kg
            </label>
            <div className="flex items-center gap-4">
              <span className="text-sm text-text-secondary">0.8</span>
              <input
                type="range"
                min="0.8"
                max="1.2"
                step="0.1"
                value={fatPerKg}
                onChange={(e) => setFatPerKg(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer slider"
              />
              <span className="text-sm text-text-secondary">1.2</span>
              <input
                type="number"
                value={fatPerKg}
                onChange={(e) => setFatPerKg(parseFloat(e.target.value) || 0.8)}
                step="0.1"
                min="0.8"
                max="1.2"
                className="w-20 px-2 py-1 text-sm rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Empfohlen: 0.8-1.2 g/kg, mindestens 20% der Gesamtkalorien
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-3">
              Kohlenhydrate: {carbsPerKg !== '' ? Number(carbsPerKg).toFixed(1) : '–'} g/kg
            </label>
            <div className="flex items-center gap-4">
              <span className="text-sm text-text-secondary">2.0</span>
              <input
                type="range"
                min="2.0"
                max="7.0"
                step="0.1"
                value={carbsPerKg === '' ? 2.0 : carbsPerKg}
                onChange={(e) => setCarbsPerKg(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer slider"
              />
              <span className="text-sm text-text-secondary">7.0</span>
              <input
                type="number"
                value={carbsPerKg}
                onChange={(e) => {
                  const val = e.target.value;
                  setCarbsPerKg(val === '' ? '' : parseFloat(val));
                }}
                step="0.1"
                min="2.0"
                max="7.0"
                className="w-20 px-2 py-1 text-sm rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
              <button
                type="button"
                className="ml-2 text-xs text-text-secondary underline"
                onClick={() => setCarbsPerKg('')}
                title="Automatisch berechnen lassen"
              >
                Auto
              </button>
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Empfohlen: 3–6 g/kg je nach Trainingsvolumen/Ziel
            </p>
          </div>
        </div>
      </div>

      {/* Berechnen Button */}
      <button
        onClick={handleCalculate}
        className="w-full bg-primary hover:bg-primary-hover text-background font-semibold py-4 px-6 rounded-2xl transition-colors shadow-soft flex items-center justify-center gap-2 text-lg"
      >
        <Calculator className="w-5 h-5" />
        Berechnen
      </button>

      {/* Hinweisbox */}
      <div className="bg-info/10 border border-info/20 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-info mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-info font-medium mb-1">
              💡 Wichtiger Hinweis zum Aktivitätsfaktor
            </p>
            <p className="text-sm text-info">
              Überprüfe deinen Aktivitätsfaktor nach 2 Wochen anhand deiner Gewichtsentwicklung und passe ihn gegebenenfalls an. 
              Zu schnelle oder zu langsame Veränderungen deuten auf einen unpassenden Faktor hin.
            </p>
          </div>
        </div>
      </div>

      {/* Warnungen */}
      {warnings.length > 0 && (
        <div className="bg-warning/10 border border-warning/20 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-warning font-medium mb-2">Hinweise zu deinen Eingaben:</p>
              <ul className="space-y-1">
                {warnings.map((warning, index) => (
                  <li key={index} className="text-sm text-warning">
                    • {warning.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Ergebnisse */}
      {result && isCalculated && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-text">Deine Ergebnisse</h2>
            {(() => {
              const settings = getSettings()
              const hasOverrides = settings.macroOverride.enabled && 
                (settings.macroOverride.protein !== null || settings.macroOverride.fat !== null)
              if (hasOverrides) {
                return (
                  <div className="flex items-center gap-2 text-sm text-accent">
                    <Settings className="w-4 h-4" />
                    <span>Manuelle Makro-Werte aktiv</span>
                  </div>
                )
              }
              return null
            })()}
          </div>
          {/* Kalorien-Gleichung */}
          <div className="bg-surface rounded-2xl p-4 mb-2">
            <div className="text-sm text-text-secondary">
              {result.carbsPerKg !== undefined
                ? (<>
                  <b>Kalorien-Gleichung:</b> {result.proteinG}g × 4 + {result.fatG}g × 9 + {result.carbsG}g × 4 = <b>{result.targetKcal} kcal</b><br />
                  <span className="text-xs">(Kohlenhydrate fest: {result.carbsPerKg.toFixed(1)} g/kg)</span>
                </>)
                : (<>
                  <b>Kalorien-Gleichung:</b> {result.targetKcal} kcal − ({result.proteinG}g × 4 + {result.fatG}g × 9) / 4 = <b>{result.carbsG}g Kohlenhydrate</b><br />
                  <span className="text-xs">(Kohlenhydrate automatisch berechnet)</span>
                </>)}
            </div>
            {/* Warnung bei negativen Rest-Kalorien */}
            {result.carbsG === 0 && (
              <div className="mt-2 text-xs text-warning">
                ⚠️ Protein und Fett übersteigen die Zielkalorien. Reduziere Protein/Fett oder erhöhe die Zielkalorien.
              </div>
            )}
          </div>
          {/* Grundwerte */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* BMR */}
            <BmrTdeeZielCard
              label="BMR"
              value={(result && result.bmr) ? result.bmr : eff.bmr}
              color="#3F51B5"
              infoText={INFO_TEXTS.BMR}
            />
            {/* TDEE */}
            <BmrTdeeZielCard
              label="TDEE"
              value={eff.tdee}
              color="#FF9800"
              infoText={INFO_TEXTS.TDEE}
            />
            {/* Zielkalorien */}
            <BmrTdeeZielCard
              label="Zielkalorien"
              value={result.targetKcal}
              color="#00BCD4"
              infoText={INFO_TEXTS.Zielkalorien}
            />
          </div>
          
          {/* Makronährstoffe */}
          <div className="bg-surface rounded-2xl p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-text mb-4">Makronährstoff-Verteilung</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-macro-protein mb-2">
                  {result.proteinG}g
                </div>
                <div className="text-sm font-medium text-text mb-1">Protein</div>
                <div className="text-xs text-text-secondary">
                  {result.proteinG * 4} kcal • {Math.round((result.proteinG * 4 / result.targetKcal) * 100)}%
                </div>
                <div className="text-xs text-text-secondary mt-1">
                  Muskelaufbau & Sättigung
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-macro-carb mb-2">
                  {result.carbsG}g
                </div>
                <div className="text-sm font-medium text-text mb-1">Kohlenhydrate</div>
                <div className="text-xs text-text-secondary">
                  {result.carbsG * 4} kcal • {Math.round((result.carbsG * 4 / result.targetKcal) * 100)}%
                </div>
                <div className="text-xs text-text-secondary mt-1">
                  Energie & Leistung
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-macro-fat mb-2">
                  {result.fatG}g
                </div>
                <div className="text-sm font-medium text-text mb-1">Fett</div>
                <div className="text-xs text-text-secondary">
                  {result.fatG * 9} kcal • {Math.round((result.fatG * 9 / result.targetKcal) * 100)}%
                </div>
                <div className="text-xs text-text-secondary mt-1">
                  Hormone & Vitamine
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}