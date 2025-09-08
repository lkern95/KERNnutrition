import React, { useState } from 'react'
import { 
  Calendar, 
  Activity, 
  AlertTriangle, 
  Calculator,
  ArrowRight,
  Clock,
  Users,
  ArrowLeft
} from 'lucide-react'
import { 
  generateEventRecommendations,
  generateInjuryRecommendations,
  type AdjustmentRecommendation
} from '../lib/adjust'

export function SpecialSituationsPage({ onBack }: { onBack?: () => void }) {
  const [activeTab, setActiveTab] = useState<'event' | 'injury' | 'travel'>('event')
  const [eventCalories, setEventCalories] = useState('')
  const [weeklyTarget, setWeeklyTarget] = useState('')
  const [injuryDuration, setInjuryDuration] = useState('')
  const [currentCalories, setCurrentCalories] = useState('')
  
  const [recommendation, setRecommendation] = useState<AdjustmentRecommendation | null>(null)
  const [injuryRecommendations, setInjuryRecommendations] = useState<AdjustmentRecommendation[]>([])

  const handleEventCalculation = () => {
    const eventCal = parseFloat(eventCalories)
    const weeklyTar = parseFloat(weeklyTarget)
    
    if (eventCal && weeklyTar) {
      const rec = generateEventRecommendations(eventCal, weeklyTar)
      setRecommendation(rec)
    }
  }

  const handleInjuryCalculation = () => {
    const currentCal = parseFloat(currentCalories)
    
    if (currentCal && injuryDuration) {
      const recs = generateInjuryRecommendations(currentCal, injuryDuration)
      setInjuryRecommendations(recs)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24 space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-3 mb-6">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-text-secondary hover:text-text transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Zurück
          </button>
        )}
        <div className="flex-1 text-center">
          <AlertTriangle className="w-12 h-12 text-accent mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-text mb-2">Spezielle Situationen</h1>
          <p className="text-text-secondary">
            Anpassungsempfehlungen für Events, Verletzungen und Reisen
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-surface rounded-2xl p-2 shadow-soft">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setActiveTab('event')}
            className={`p-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'event'
                ? 'bg-primary text-white'
                : 'text-text hover:bg-background'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Events
          </button>
          <button
            onClick={() => setActiveTab('injury')}
            className={`p-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'injury'
                ? 'bg-primary text-white'
                : 'text-text hover:bg-background'
            }`}
          >
            <Activity className="w-4 h-4" />
            Verletzung
          </button>
          <button
            onClick={() => setActiveTab('travel')}
            className={`p-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'travel'
                ? 'bg-primary text-white'
                : 'text-text hover:bg-background'
            }`}
          >
            <Users className="w-4 h-4" />
            Reisen
          </button>
        </div>
      </div>

      {/* Event Calculator */}
      {activeTab === 'event' && (
        <div className="bg-surface rounded-2xl p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Event-Kalorien planen
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Event-Kalorien (Gesamttag)
              </label>
              <input
                type="number"
                value={eventCalories}
                onChange={(e) => setEventCalories(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text"
                placeholder="z.B. 3500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Wöchentliches Kalorienziel (gesamt)
              </label>
              <input
                type="number"
                value={weeklyTarget}
                onChange={(e) => setWeeklyTarget(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text"
                placeholder="z.B. 19600 (2800 × 7)"
              />
            </div>

            <button
              onClick={handleEventCalculation}
              className="w-full primary-button py-3 flex items-center justify-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Empfehlung berechnen
            </button>

            {recommendation && (
              <RecommendationDisplay recommendation={recommendation} />
            )}
          </div>
        </div>
      )}

      {/* Injury Calculator */}
      {activeTab === 'injury' && (
        <div className="bg-surface rounded-2xl p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Verletzung/Trainingspause
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Aktuelle Kalorien/Tag
              </label>
              <input
                type="number"
                value={currentCalories}
                onChange={(e) => setCurrentCalories(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text"
                placeholder="z.B. 2800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Geschätzte Pausendauer
              </label>
              <select
                value={injuryDuration}
                onChange={(e) => setInjuryDuration(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text"
              >
                <option value="">Auswählen...</option>
                <option value="1-2 Wochen">1-2 Wochen</option>
                <option value="3-4 Wochen">3-4 Wochen</option>
                <option value="6-8 Wochen">6-8 Wochen</option>
                <option value="3+ Monate">3+ Monate</option>
              </select>
            </div>

            <button
              onClick={handleInjuryCalculation}
              className="w-full primary-button py-3 flex items-center justify-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Empfehlungen generieren
            </button>

            {injuryRecommendations.length > 0 && (
              <div className="space-y-3 mt-4">
                {injuryRecommendations.map((rec, index) => (
                  <RecommendationDisplay key={index} recommendation={rec} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Travel Tips */}
      {activeTab === 'travel' && (
        <div className="bg-surface rounded-2xl p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Reise-Anpassungen
          </h2>
          
          <div className="space-y-4">
            <div className="bg-info/10 border border-info/20 rounded-xl p-4">
              <h3 className="font-semibold text-info mb-2">Weniger Bewegung/NEAT</h3>
              <ul className="text-sm text-info space-y-1">
                <li>• Aktivitätsfaktor temporär um 0.05-0.15 reduzieren</li>
                <li>• Alternativ: 100-300 kcal/Tag weniger</li>
                <li>• Bei Rückkehr schrittweise wieder erhöhen</li>
              </ul>
            </div>

            <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
              <h3 className="font-semibold text-warning mb-2">Restaurant-Kalorien</h3>
              <ul className="text-sm text-warning space-y-1">
                <li>• Portionen sind oft 20-50% größer als geschätzt</li>
                <li>• Versteckte Fette und Öle beachten</li>
                <li>• Vorsichtige Schätzung: +20% auf eigene Berechnung</li>
                <li>• Wochenmittel wichtiger als einzelne Tage</li>
              </ul>
            </div>

            <div className="bg-success/10 border border-success/20 rounded-xl p-4">
              <h3 className="font-semibold text-success mb-2">Praktische Tipps</h3>
              <ul className="text-sm text-success space-y-1">
                <li>• Hotel-Gym oder Bodyweight-Training nutzen</li>
                <li>• Mehr Schritte durch Sightseeing</li>
                <li>• Protein-Snacks für unterwegs mitnehmen</li>
                <li>• Flexible Einstellung: 80/20-Regel anwenden</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Recommendation Display Component
function RecommendationDisplay({ recommendation }: { recommendation: AdjustmentRecommendation }) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-error bg-error/5'
      case 'high': return 'border-warning bg-warning/5'
      case 'medium': return 'border-info bg-info/5'
      case 'low': return 'border-text-secondary bg-text/5'
      default: return 'border-border bg-background'
    }
  }

  return (
    <div className={`p-4 rounded-xl border-2 ${getPriorityColor(recommendation.priority)}`}>
      <h3 className="font-semibold text-text mb-2">{recommendation.title}</h3>
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
        <div className="flex items-center gap-1 text-xs text-text-secondary mb-2">
          <Clock className="w-3 h-3" />
          <span><strong>Dauer:</strong> {recommendation.duration}</span>
        </div>
      )}

      {/* Conditions */}
      {recommendation.conditions && recommendation.conditions.length > 0 && (
        <div className="text-xs text-text-secondary">
          <strong>Hinweise:</strong>
          <ul className="mt-1 space-y-1">
            {recommendation.conditions.map((condition, idx) => (
              <li key={idx} className="flex items-start gap-1">
                <span className="text-primary">•</span>
                <span>{condition}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
