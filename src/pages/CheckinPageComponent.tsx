import React, { useState, useEffect } from 'react'
import { 
  CheckCircle, 
  Plus, 
  Scale, 
  Calendar, 
  Activity, 
  Moon, 
  AlertTriangle, 
  FileText,
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3
} from 'lucide-react'
import { useAppStore, type CheckinEntry } from '../store/appStore'

// Zielbereich-Definitionen (% pro Woche)
const GOAL_RANGES = {
  lean_bulk: { min: 0.25, max: 0.5, label: 'Lean Bulk' },
  aggressive_bulk: { min: 0.5, max: 0.75, label: 'Aggressiver Aufbau' },
  cut: { min: -1.0, max: -0.5, label: 'Diät' },
  maintain: { min: -0.25, max: 0.25, label: 'Erhaltung' }
}

function CheckinPage() {
  // State
  const [checkins, setCheckins] = useState<CheckinEntry[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<keyof typeof GOAL_RANGES>('maintain')
  
  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: '',
    trainingDays: 3,
    sleep: 3,
    stress: 3,
    notes: ''
  })

  // Store
  const { profile } = useAppStore()

  // Lokale Persistierung
  const STORAGE_KEY = 'kernBalance_checkins'

  // Check-ins beim Start laden
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const data = JSON.parse(saved)
        setCheckins(data)
      } catch (error) {
        console.warn('Fehler beim Laden der Check-ins:', error)
      }
    }
  }, [])

  // Check-ins speichern
  const saveCheckins = (newCheckins: CheckinEntry[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newCheckins))
    setCheckins(newCheckins)
  }

  // Neuen Check-in hinzufügen
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const weight = parseFloat(formData.weight)
    if (!weight || weight <= 0) {
      alert('Bitte gib ein gültiges Gewicht ein.')
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

    const updatedCheckins = [...checkins, newCheckin].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    
    saveCheckins(updatedCheckins)
    setShowForm(false)
    setFormData({
      date: new Date().toISOString().split('T')[0],
      weight: '',
      trainingDays: 3,
      sleep: 3,
      stress: 3,
      notes: ''
    })
  }

  // Trend-Analyse
  const getTrendAnalysis = () => {
    if (checkins.length < 2) return null

    const sortedCheckins = [...checkins].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    // 2-Wochen-Trend (letzte 2 Einträge wenn vorhanden)
    const recent = sortedCheckins.slice(-2)
    if (recent.length < 2) return null

    const weightChange = recent[1].weight - recent[0].weight
    const daysDiff = Math.abs(new Date(recent[1].date).getTime() - new Date(recent[0].date).getTime()) / (1000 * 60 * 60 * 24)
    const weeklyChange = (weightChange / daysDiff) * 7
    const weeklyChangePercent = (weeklyChange / recent[0].weight) * 100

    // 3-Wochen gleitender Mittelwert
    const last3 = sortedCheckins.slice(-3)
    const movingAverage = last3.length > 0 ? 
      last3.reduce((sum, entry) => sum + entry.weight, 0) / last3.length : 0

    // Ziel-Klassifikation
    const goalRange = GOAL_RANGES[selectedGoal]
    let classification: 'under' | 'in' | 'over' = 'in'
    
    if (weeklyChangePercent < goalRange.min) {
      classification = 'under'
    } else if (weeklyChangePercent > goalRange.max) {
      classification = 'over'
    }

    return {
      weightChange,
      weeklyChange,
      weeklyChangePercent,
      movingAverage,
      classification,
      goalRange,
      dataPoints: sortedCheckins.length
    }
  }

  const trendData = getTrendAnalysis()

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
      <div className="bg-surface rounded-2xl p-6 shadow-soft">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-primary/10 rounded-xl">
            <CheckCircle className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">Wöchentlicher Check-in</h1>
            <p className="text-text-secondary text-sm">
              Dokumentiere deinen Fortschritt und verfolge Trends
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full bg-primary hover:bg-primary-hover text-background font-semibold py-3 px-6 rounded-xl transition-colors shadow-soft flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Neuer Check-in
        </button>
      </div>

      {/* Eingabeformular */}
      {showForm && (
        <div className="bg-surface rounded-2xl p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-text mb-4">Wöchentlicher Check-in</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Datum
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Gewicht (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                  placeholder="z.B. 72.5"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
                <p className="text-xs text-text-secondary mt-1">
                  Morgens, nach Toilette, ohne Kleidung
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-3">
                Trainingstage diese Woche: {formData.trainingDays}
              </label>
              <div className="flex items-center gap-4">
                <span className="text-sm text-text-secondary">0</span>
                <input
                  type="range"
                  min="0"
                  max="7"
                  step="1"
                  value={formData.trainingDays}
                  onChange={(e) => setFormData(prev => ({ ...prev, trainingDays: parseInt(e.target.value) }))}
                  className="flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer slider"
                />
                <span className="text-sm text-text-secondary">7</span>
                <div className="w-8 text-center">
                  <span className="text-sm font-medium text-text">{formData.trainingDays}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-text mb-3">
                  Schlafqualität: {formData.sleep}/5
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-text-secondary">😴</span>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={formData.sleep}
                    onChange={(e) => setFormData(prev => ({ ...prev, sleep: parseInt(e.target.value) }))}
                    className="flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="text-sm text-text-secondary">😊</span>
                </div>
                <div className="flex justify-between text-xs text-text-secondary mt-1">
                  <span>Schlecht</span>
                  <span>Ausgezeichnet</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-3">
                  Stresslevel: {formData.stress}/5
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-text-secondary">😌</span>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={formData.stress}
                    onChange={(e) => setFormData(prev => ({ ...prev, stress: parseInt(e.target.value) }))}
                    className="flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="text-sm text-text-secondary">😰</span>
                </div>
                <div className="flex justify-between text-xs text-text-secondary mt-1">
                  <span>Entspannt</span>
                  <span>Sehr gestresst</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Notizen (optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="z.B. Gefühlslage, besondere Ereignisse, Herausforderungen..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-primary hover:bg-primary-hover text-background font-semibold py-3 px-6 rounded-xl transition-colors shadow-soft"
              >
                Check-in speichern
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-3 rounded-xl border border-border text-text hover:bg-surface transition-colors"
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
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(GOAL_RANGES).map(([key, range]) => (
            <button
              key={key}
              onClick={() => setSelectedGoal(key as keyof typeof GOAL_RANGES)}
              className={`p-3 rounded-xl text-sm font-medium transition-colors ${
                selectedGoal === key
                  ? 'bg-primary text-background'
                  : 'bg-background border border-border text-text hover:bg-surface'
              }`}
            >
              <div className="text-center">
                <div className="font-semibold">{range.label}</div>
                <div className="text-xs mt-1">
                  {range.min > 0 ? '+' : ''}{range.min}% bis {range.max > 0 ? '+' : ''}{range.max}%
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Trend-Analyse */}
      {trendData && (
        <div className="bg-surface rounded-2xl p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Trend-Analyse ({trendData.dataPoints} Datenpunkte)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-background rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-primary mb-1">
                {trendData.weeklyChange > 0 ? '+' : ''}{trendData.weeklyChange.toFixed(2)} kg
              </div>
              <div className="text-sm text-text-secondary">Wöchentlicher Trend</div>
            </div>
            
            <div className="bg-background rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-secondary mb-1">
                {trendData.weeklyChangePercent > 0 ? '+' : ''}{trendData.weeklyChangePercent.toFixed(2)}%
              </div>
              <div className="text-sm text-text-secondary">Prozentuale Änderung</div>
            </div>
            
            <div className="bg-background rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-accent mb-1">
                {trendData.movingAverage.toFixed(1)} kg
              </div>
              <div className="text-sm text-text-secondary">3-Wochen-Mittel</div>
            </div>
          </div>

          {/* Ziel-Klassifikation */}
          <div className={`p-4 rounded-xl border-2 ${
            trendData.classification === 'in' ? 'bg-success/10 border-success/20' :
            trendData.classification === 'under' ? 'bg-warning/10 border-warning/20' :
            'bg-error/10 border-error/20'
          }`}>
            <div className="flex items-center justify-center gap-2 mb-2">
              {trendData.classification === 'in' ? <Target className="w-5 h-5 text-success" /> :
               trendData.classification === 'under' ? <TrendingDown className="w-5 h-5 text-warning" /> :
               <TrendingUp className="w-5 h-5 text-error" />}
              <span className={`font-semibold ${getClassificationColor(trendData.classification)}`}>
                {getClassificationText(trendData.classification)}
              </span>
            </div>
            <div className="text-center text-sm">
              <p className={getClassificationColor(trendData.classification)}>
                Zielbereich für {trendData.goalRange.label}: {trendData.goalRange.min}% bis {trendData.goalRange.max}% pro Woche
              </p>
              <p className={`mt-1 ${getClassificationColor(trendData.classification)}`}>
                Dein Trend: {trendData.weeklyChangePercent > 0 ? '+' : ''}{trendData.weeklyChangePercent.toFixed(2)}% pro Woche
              </p>
            </div>
          </div>
        </div>
      )}

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
                  <div className="text-lg font-bold text-primary">
                    {checkin.weight.toFixed(1)} kg
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
    </div>
  )
}

export { CheckinPage }
export default CheckinPage
