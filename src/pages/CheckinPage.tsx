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
  BarChart3,
  Lightbulb,
  ArrowRight,
  Zap
} from 'lucide-react'
import { useAppStore, type CheckinEntry } from '../store/appStore'
import { 
  generateAdjustmentRecommendations,
  formatRecommendationsForUI,
  type CheckinData as AdjustCheckData,
  type UserProfile,
  type TrendData as AdjustTrendData
} from '../lib/adjust'

// Zielbereich-Definitionen (% pro Woche)
const GOAL_RANGES = {
  lean_bulk: { min: 0.25, max: 0.5, label: 'Lean Bulk' },
  aggressive_bulk: { min: 0.5, max: 0.75, label: 'Aggressiver Aufbau' },
  cut: { min: -1.0, max: -0.5, label: 'Diät' },
  maintain: { min: -0.25, max: 0.25, label: 'Erhaltung' }
}

// Recommendation Card Component
function RecommendationCard({ recommendation }: { recommendation: any }) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-error bg-error/5'
      case 'high': return 'border-warning bg-warning/5'
      case 'medium': return 'border-info bg-info/5'
      case 'low': return 'border-text-secondary bg-text/5'
      default: return 'border-border bg-background'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'calories': return <Scale className="w-4 h-4" />
      case 'activity_factor': return <Activity className="w-4 h-4" />
      case 'macros': return <BarChart3 className="w-4 h-4" />
      case 'lifestyle': return <Moon className="w-4 h-4" />
      case 'maintenance': return <Target className="w-4 h-4" />
      default: return <Lightbulb className="w-4 h-4" />
    }
  }

  return (
    <div className={`p-4 rounded-xl border-2 ${getPriorityColor(recommendation.priority)}`}>
      <div className="flex items-start gap-3">
        <div className="text-primary flex-shrink-0 mt-0.5">
          {getTypeIcon(recommendation.type)}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-text mb-2">{recommendation.title}</h4>
          <p className="text-sm text-text-secondary mb-3">{recommendation.description}</p>
          
          {/* Adjustments */}
          {(recommendation.calorieAdjustment || recommendation.activityFactorAdjustment) && (
            <div className="flex items-center gap-4 mb-3 text-sm">
              {recommendation.calorieAdjustment && (
                <div className="flex items-center gap-1">
                  <ArrowRight className="w-3 h-3 text-primary" />
                  <span className="font-medium">
                    {recommendation.calorieAdjustment > 0 ? '+' : ''}{recommendation.calorieAdjustment} kcal/Tag
                  </span>
                </div>
              )}
              {recommendation.activityFactorAdjustment && (
                <div className="flex items-center gap-1">
                  <ArrowRight className="w-3 h-3 text-primary" />
                  <span className="font-medium">
                    AF: {recommendation.activityFactorAdjustment > 0 ? '+' : ''}{recommendation.activityFactorAdjustment}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Duration */}
          {recommendation.duration && (
            <div className="text-xs text-text-secondary mb-2">
              <strong>Dauer:</strong> {recommendation.duration}
            </div>
          )}

          {/* Conditions */}
          {recommendation.conditions && recommendation.conditions.length > 0 && (
            <div className="text-xs text-text-secondary">
              <strong>Hinweise:</strong>
              <ul className="mt-1 space-y-1">
                {recommendation.conditions.map((condition: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-1">
                    <span className="text-primary">•</span>
                    <span>{condition}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
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

  // Storage keys
  const CHECKINS_KEY = 'kerncare_checkins'
  const GOAL_KEY = 'kerncare_checkin_goal'

  // Load data on mount
  useEffect(() => {
    loadCheckins()
    loadGoal()
  }, [])

  const loadCheckins = () => {
    try {
      const stored = localStorage.getItem(CHECKINS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setCheckins(Array.isArray(parsed) ? parsed : [])
      }
    } catch (error) {
      console.error('Fehler beim Laden der Check-ins:', error)
      setCheckins([])
    }
  }

  const saveCheckins = (newCheckins: CheckinEntry[]) => {
    try {
      localStorage.setItem(CHECKINS_KEY, JSON.stringify(newCheckins))
      setCheckins(newCheckins)
    } catch (error) {
      console.error('Fehler beim Speichern der Check-ins:', error)
    }
  }

  const loadGoal = () => {
    try {
      const stored = localStorage.getItem(GOAL_KEY)
      if (stored && stored in GOAL_RANGES) {
        setSelectedGoal(stored as keyof typeof GOAL_RANGES)
      }
    } catch (error) {
      console.error('Fehler beim Laden des Ziels:', error)
    }
  }

  const saveGoal = (goal: keyof typeof GOAL_RANGES) => {
    try {
      localStorage.setItem(GOAL_KEY, goal)
      setSelectedGoal(goal)
    } catch (error) {
      console.error('Fehler beim Speichern des Ziels:', error)
    }
  }

  // Form handling
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.weight || parseFloat(formData.weight) <= 0) {
      alert('Bitte gib ein gültiges Gewicht ein')
      return
    }

    const newCheckin: CheckinEntry = {
      id: Date.now().toString(),
      date: formData.date,
      weight: parseFloat(formData.weight),
      trainingDays: formData.trainingDays,
      sleep: formData.sleep,
      stress: formData.stress,
      notes: formData.notes
    }

    const updatedCheckins = [...checkins, newCheckin].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
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
      recent
    }
  }

  const trendData = getTrendAnalysis()

  // Generate smart recommendations
  const getRecommendations = () => {
    if (!trendData || checkins.length < 2) return []

    // Convert data to adjustment engine format
    const adjustCheckins: AdjustCheckData[] = checkins.map(c => ({
      id: c.id,
      date: c.date,
      weight: c.weight,
      trainingDays: c.trainingDays || 3, // default to 3 if not set
      sleep: c.sleep || 3, // default to 3 if not set
      stress: c.stress || 3, // default to 3 if not set
      notes: c.notes || ''
    }))

    // Create user profile from store (if available) or defaults
    const userProfile: UserProfile = {
      weight: trendData.recent[1].weight,
      height: 175, // Default - could come from user settings
      age: 30, // Default - could come from user settings
      sex: 'male', // Default - could come from user settings
      activityFactor: 1.6, // Default - could come from user settings
      goal: selectedGoal,
      targetCalories: 2500, // Default - could come from calculations
      currentCalories: 2500
    }

    // Create trend data for adjustment engine
    const adjustTrendData: AdjustTrendData = {
      weightChange: trendData.weightChange,
      weeklyChange: trendData.weeklyChange,
      weeklyChangePercent: trendData.weeklyChangePercent,
      classification: trendData.classification,
      goalRange: trendData.goalRange,
      weeksInTrend: Math.ceil(checkins.length / 2) // Estimate weeks
    }

    return generateAdjustmentRecommendations(adjustCheckins, userProfile, adjustTrendData)
  }

  const recommendations = getRecommendations()
  const groupedRecommendations = formatRecommendationsForUI(recommendations)

  // Helper functions
  const getClassificationText = (classification: 'under' | 'in' | 'over') => {
    switch (classification) {
      case 'under': return 'Unter Zielbereich'
      case 'in': return 'Im Zielbereich'
      case 'over': return 'Über Zielbereich'
    }
  }

  const getClassificationColor = (classification: 'under' | 'in' | 'over') => {
    switch (classification) {
      case 'under': return 'text-warning'
      case 'in': return 'text-success'
      case 'over': return 'text-error'
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24 space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <Scale className="w-12 h-12 text-primary mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-text mb-2">Wöchentlicher Check-in</h1>
        <p className="text-text-secondary">
          Verfolge dein Gewicht und analysiere deine Fortschritte
        </p>
      </div>

      {/* Ziel-Auswahl */}
      <div className="bg-surface rounded-2xl p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Dein Ziel
        </h2>
        
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(GOAL_RANGES) as Array<keyof typeof GOAL_RANGES>).map((goal) => (
            <button
              key={goal}
              onClick={() => saveGoal(goal)}
              className={`p-3 rounded-xl border-2 transition-all ${
                selectedGoal === goal
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-text hover:border-primary/50'
              }`}
            >
              <div className="font-medium">{GOAL_RANGES[goal].label}</div>
              <div className="text-sm opacity-75">
                {GOAL_RANGES[goal].min > 0 ? '+' : ''}{GOAL_RANGES[goal].min}% bis {GOAL_RANGES[goal].max > 0 ? '+' : ''}{GOAL_RANGES[goal].max}%
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Add Check-in Button/Form */}
      <div className="bg-surface rounded-2xl p-6 shadow-soft">
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full primary-button flex items-center justify-center gap-2 py-4"
          >
            <Plus className="w-5 h-5" />
            Neuen Check-in hinzufügen
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold text-text mb-4">Neuer Check-in</h3>
            
            {/* Datum */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Datum
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text"
                required
              />
            </div>

            {/* Gewicht */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                <Scale className="w-4 h-4 inline mr-1" />
                Gewicht (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="30"
                max="300"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text"
                placeholder="z.B. 70.5"
                required
              />
            </div>

            {/* Trainingstage */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                <Activity className="w-4 h-4 inline mr-1" />
                Trainingstage diese Woche: {formData.trainingDays}
              </label>
              <input
                type="range"
                min="0"
                max="7"
                value={formData.trainingDays}
                onChange={(e) => setFormData({ ...formData, trainingDays: parseInt(e.target.value) })}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-text-secondary mt-1">
                <span>0</span>
                <span>7</span>
              </div>
            </div>

            {/* Schlaf */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                <Moon className="w-4 h-4 inline mr-1" />
                Schlafqualität: {formData.sleep}/5
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={formData.sleep}
                onChange={(e) => setFormData({ ...formData, sleep: parseInt(e.target.value) })}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-text-secondary mt-1">
                <span>Schlecht</span>
                <span>Sehr gut</span>
              </div>
            </div>

            {/* Stress */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                Stress-Level: {formData.stress}/5
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={formData.stress}
                onChange={(e) => setFormData({ ...formData, stress: parseInt(e.target.value) })}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-text-secondary mt-1">
                <span>Niedrig</span>
                <span>Sehr hoch</span>
              </div>
            </div>

            {/* Notizen */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Notizen (optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text resize-none"
                rows={3}
                placeholder="Wie fühlst du dich? Besondere Ereignisse?"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 secondary-button py-3"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="flex-1 primary-button py-3"
              >
                Check-in speichern
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Trend-Analyse */}
      {trendData && (
        <div className="bg-surface rounded-2xl p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Trend-Analyse
          </h2>
          
          <div className="space-y-4">
            {/* Gewichtsänderung */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-text mb-1">
                  {trendData.weightChange > 0 ? '+' : ''}{trendData.weightChange.toFixed(1)} kg
                </div>
                <div className="text-sm text-text-secondary">Gewichtsänderung</div>
                <div className="text-xs text-text-secondary mt-1">
                  {new Date(trendData.recent[0].date).toLocaleDateString('de-DE')} → {new Date(trendData.recent[1].date).toLocaleDateString('de-DE')}
                </div>
              </div>
              
              <div className="bg-background rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-text mb-1">
                  {trendData.movingAverage.toFixed(1)} kg
                </div>
                <div className="text-sm text-text-secondary">3-Wochen-Mittelwert</div>
                <div className="text-xs text-text-secondary mt-1">
                  Letzten {Math.min(checkins.length, 3)} Check-ins
                </div>
              </div>
            </div>

            {/* Wöchentlicher Trend */}
            <div className="bg-background rounded-xl p-4 text-center">
              <div className={`text-2xl font-bold mb-1 flex items-center justify-center gap-2 ${
                trendData.weeklyChange > 0 ? 'text-info' : 'text-primary'
              }`}>
                {trendData.weeklyChange > 0 ? 
                  <TrendingUp className="w-6 h-6" /> : 
                  <TrendingDown className="w-6 h-6" />
                }
                {trendData.weeklyChange > 0 ? '+' : ''}{trendData.weeklyChange.toFixed(1)} kg/Woche
              </div>
              <div className="text-sm text-text-secondary">Wöchentlicher Trend</div>
              <div className="text-xs text-text-secondary mt-1">
                ({trendData.weeklyChangePercent > 0 ? '+' : ''}{trendData.weeklyChangePercent.toFixed(2)}% vom Körpergewicht)
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
        </div>
      )}

      {/* Smart Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-surface rounded-2xl p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-accent" />
            Intelligente Empfehlungen
          </h2>
          
          <div className="space-y-4">
            {/* Critical Recommendations */}
            {groupedRecommendations.critical.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-error flex items-center gap-1">
                  <Zap className="w-4 h-4" />
                  Kritisch - Sofort handeln
                </h3>
                {groupedRecommendations.critical.map((rec, index) => (
                  <RecommendationCard key={index} recommendation={rec} />
                ))}
              </div>
            )}

            {/* High Priority Recommendations */}
            {groupedRecommendations.high.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-warning flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Hohe Priorität
                </h3>
                {groupedRecommendations.high.map((rec, index) => (
                  <RecommendationCard key={index} recommendation={rec} />
                ))}
              </div>
            )}

            {/* Medium Priority Recommendations */}
            {groupedRecommendations.medium.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-info flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  Mittlere Priorität
                </h3>
                {groupedRecommendations.medium.map((rec, index) => (
                  <RecommendationCard key={index} recommendation={rec} />
                ))}
              </div>
            )}

            {/* Low Priority Recommendations */}
            {groupedRecommendations.low.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-text-secondary flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Niedrige Priorität
                </h3>
                {groupedRecommendations.low.map((rec, index) => (
                  <RecommendationCard key={index} recommendation={rec} />
                ))}
              </div>
            )}
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

// Explicit exports for better bundler compatibility
export { CheckinPage }         // sorgt explizit für den named export
export default CheckinPage     // zusätzlich ein default export


