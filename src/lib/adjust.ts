/**
 * Regel-Engine für automatische Anpassungsempfehlungen
 * Basiert auf Check-in Daten, Trends und benutzerdefinierten Zielen
 */

// Types für die Regel-Engine
export interface CheckinData {
  id: string
  date: string
  weight: number
  trainingDays: number
  sleep: number // 1-5
  stress: number // 1-5
  notes: string
}

export interface UserProfile {
  weight: number
  height: number
  age: number
  sex: 'male' | 'female'
  activityFactor: number
  goal: 'lean_bulk' | 'aggressive_bulk' | 'cut' | 'maintain'
  targetCalories: number
  currentCalories?: number
}

export interface TrendData {
  weightChange: number
  weeklyChange: number
  weeklyChangePercent: number
  classification: 'under' | 'in' | 'over'
  goalRange: { min: number; max: number; label: string }
  weeksInTrend: number
}

export interface AdjustmentRecommendation {
  type: 'calories' | 'activity_factor' | 'macros' | 'lifestyle' | 'maintenance'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  calorieAdjustment?: number
  activityFactorAdjustment?: number
  macroAdjustments?: {
    carbs?: number
    protein?: number
    fat?: number
  }
  duration?: string
  conditions?: string[]
}

// Zielbereich-Definitionen (% pro Woche)
const GOAL_RANGES = {
  lean_bulk: { min: 0.25, max: 0.5, label: 'Lean Bulk' },
  aggressive_bulk: { min: 0.5, max: 0.75, label: 'Aggressiver Aufbau' },
  cut: { min: -1.0, max: -0.5, label: 'Diät' },
  maintain: { min: -0.25, max: 0.25, label: 'Erhaltung' }
}

/**
 * Hauptfunktion der Regel-Engine
 */
export function generateAdjustmentRecommendations(
  checkins: CheckinData[],
  userProfile: UserProfile,
  trendData: TrendData
): AdjustmentRecommendation[] {
  const recommendations: AdjustmentRecommendation[] = []
  
  if (checkins.length < 2) {
    return [{
      type: 'lifestyle',
      priority: 'low',
      title: 'Mehr Daten sammeln',
      description: 'Sammle mindestens 2-3 Check-ins über 2 Wochen für aussagekräftige Empfehlungen.'
    }]
  }

  // Analysiere verschiedene Faktoren
  const progressAnalysis = analyzeProgress(trendData, userProfile)
  const sleepStressAnalysis = analyzeSleepAndStress(checkins)
  const stagnationAnalysis = analyzeStagnation(checkins, trendData)
  const trainingConsistency = analyzeTrainingConsistency(checkins)

  // Generiere Empfehlungen basierend auf Analysen
  if (progressAnalysis) recommendations.push(...progressAnalysis)
  if (sleepStressAnalysis) recommendations.push(...sleepStressAnalysis)
  if (stagnationAnalysis) recommendations.push(...stagnationAnalysis)
  
  // Spezielle Situationen
  recommendations.push(...checkSpecialSituations(checkins, userProfile))

  // Sortiere nach Priorität
  return recommendations.sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
    return priorityOrder[b.priority] - priorityOrder[a.priority]
  })
}

/**
 * Analysiere Fortschritt gegenüber Zielbereich
 */
function analyzeProgress(
  trendData: TrendData,
  userProfile: UserProfile
): AdjustmentRecommendation[] {
  const recommendations: AdjustmentRecommendation[] = []
  const goalRange = GOAL_RANGES[userProfile.goal]
  
  // Berechne Abweichung vom Zielbereich
  const targetMid = (goalRange.min + goalRange.max) / 2
  const actualPercent = trendData.weeklyChangePercent
  const deviation = Math.abs(actualPercent - targetMid)
  const deviationPercent = Math.abs(actualPercent) < 0.1 ? 0 : 
    (actualPercent - targetMid) / Math.abs(targetMid)

  if (trendData.classification === 'under' && trendData.weeksInTrend >= 2) {
    // Unter Zielbereich - Kalorien erhöhen
    let calorieIncrease = 100
    
    if (deviation > 0.5) {
      calorieIncrease = 200
    } else if (deviation > 0.3) {
      calorieIncrease = 150
    }

    recommendations.push({
      type: 'calories',
      priority: trendData.weeksInTrend >= 3 ? 'high' : 'medium',
      title: userProfile.goal.includes('bulk') ? 'Kalorien für Aufbau erhöhen' : 'Defizit reduzieren',
      description: userProfile.goal.includes('bulk') 
        ? `Du bist ${trendData.weeksInTrend} Wochen unter deinem Zielbereich. Erhöhe die Kalorien um ${calorieIncrease} kcal täglich für besseren Muskelaufbau.`
        : `Dein Gewichtsverlust ist zu langsam. Du kannst das Defizit um ${calorieIncrease} kcal reduzieren oder mehr Geduld haben.`,
      calorieAdjustment: calorieIncrease,
      duration: '1-2 Wochen',
      conditions: ['Nach 1-2 Wochen erneut bewerten']
    })
  }
  
  else if (trendData.classification === 'over' && trendData.weeksInTrend >= 2) {
    // Über Zielbereich - Kalorien reduzieren
    let calorieDecrease = 150
    
    if (deviation > 0.8) {
      calorieDecrease = 300
    } else if (deviation > 0.5) {
      calorieDecrease = 200
    }

    recommendations.push({
      type: 'calories',
      priority: 'high',
      title: userProfile.goal.includes('bulk') ? 'Aufbau verlangsamen' : 'Defizit verstärken',
      description: userProfile.goal.includes('bulk')
        ? `Dein Gewichtszuwachs ist zu schnell (Risiko für Fettaufbau). Reduziere Kalorien um ${calorieDecrease} kcal täglich.`
        : `Sehr guter Fortschritt! Du kannst das Defizit um ${calorieDecrease} kcal verstärken oder das aktuelle Tempo beibehalten.`,
      calorieAdjustment: -calorieDecrease,
      duration: '1-2 Wochen',
      conditions: ['Überwache Kraft und Energie']
    })
  }

  return recommendations
}

/**
 * Analysiere Schlaf und Stress
 */
function analyzeSleepAndStress(checkins: CheckinData[]): AdjustmentRecommendation[] {
  const recommendations: AdjustmentRecommendation[] = []
  const recent = checkins.slice(0, 3) // Letzte 3 Check-ins
  
  const avgSleep = recent.reduce((sum, c) => sum + c.sleep, 0) / recent.length
  const avgStress = recent.reduce((sum, c) => sum + c.stress, 0) / recent.length
  
  // Schlechter Schlaf oder hoher Stress
  if (avgSleep <= 2.5 || avgStress >= 3.5) {
    recommendations.push({
      type: 'lifestyle',
      priority: 'high',
      title: 'Erholung priorisieren',
      description: `${avgSleep <= 2.5 ? 'Dein Schlaf' : 'Dein Stress-Level'} beeinträchtigt deinen Fortschritt. ` +
        'Wechsle temporär in die Erhaltungskalorien und reduziere das Trainingsvolumen um 20-30%.',
      calorieAdjustment: 100, // Näher zur Erhaltung
      duration: '1-2 Wochen',
      conditions: [
        'Priorisiere 7-9h Schlaf pro Nacht',
        'Stressmanagement-Techniken anwenden',
        'Weniger intensive Trainingseinheiten'
      ]
    })
  }

  return recommendations
}

/**
 * Analysiere Stagnation
 */
function analyzeStagnation(
  checkins: CheckinData[],
  trendData: TrendData
): AdjustmentRecommendation[] {
  const recommendations: AdjustmentRecommendation[] = []
  
  // Prüfe auf Gewichtsstagnation (< 0.1% Änderung pro Woche)
  if (Math.abs(trendData.weeklyChangePercent) < 0.1 && trendData.weeksInTrend >= 2) {
    recommendations.push({
      type: 'calories',
      priority: 'medium',
      title: 'Stagnation durchbrechen',
      description: 'Dein Gewicht stagniert seit 2+ Wochen. Mögliche Ursachen: Hidden Calories, ' +
        'NEAT-Adaptation oder ungenaues Tracking. Reduziere Kalorien um 150-200 kcal.',
      calorieAdjustment: -175,
      duration: '2 Wochen',
      conditions: [
        'Überprüfe Tracking-Genauigkeit',
        'Achte auf versteckte Kalorien (Öle, Saucen)',
        'Erhöhe tägliche Aktivität (mehr Schritte)',
        'Bei anhaltender Stagnation: weitere -100 kcal'
      ]
    })
  }

  return recommendations
}

/**
 * Analysiere Trainings-Konsistenz
 */
function analyzeTrainingConsistency(checkins: CheckinData[]): number {
  if (checkins.length === 0) return 0
  
  const avgTrainingDays = checkins.reduce((sum, c) => sum + c.trainingDays, 0) / checkins.length
  return avgTrainingDays
}

/**
 * Prüfe spezielle Situationen
 */
function checkSpecialSituations(
  checkins: CheckinData[],
  userProfile: UserProfile
): AdjustmentRecommendation[] {
  const recommendations: AdjustmentRecommendation[] = []
  const recent = checkins.slice(0, 2)
  
  if (recent.length === 0) return recommendations

  // Niedrige Trainingsfrequenz (Travel/weniger Bewegung)
  const avgTrainingDays = recent.reduce((sum, c) => sum + c.trainingDays, 0) / recent.length
  if (avgTrainingDays <= 2) {
    recommendations.push({
      type: 'activity_factor',
      priority: 'medium',
      title: 'Aktivitätsfaktor anpassen',
      description: `Du trainierst weniger als üblich (${avgTrainingDays.toFixed(1)} Tage/Woche). ` +
        'Reduziere temporär deinen Aktivitätsfaktor um 0.1 oder die Kalorien um 200 kcal.',
      activityFactorAdjustment: -0.1,
      calorieAdjustment: -200,
      duration: 'Bis Training wieder normal',
      conditions: ['Wähle eine der beiden Optionen', 'Bei Rückkehr zum normalen Training rückgängig machen']
    })
  }

  // Energie/Leistungsabfall (anhand von Notizen oder niedrigem Schlaf + viel Training)
  const highTrainingLowSleep = recent.some(c => c.trainingDays >= 5 && c.sleep <= 2)
  if (highTrainingLowSleep) {
    recommendations.push({
      type: 'macros',
      priority: 'medium',
      title: 'Kohlenhydrate für Energie erhöhen',
      description: 'Du trainierst viel aber schläfst wenig. Erhöhe primär die Kohlenhydrate um 50-100g ' +
        'oder die Gesamtkalorien um 150 kcal für bessere Regeneration.',
      calorieAdjustment: 150,
      macroAdjustments: {
        carbs: 75 // +75g Kohlenhydrate ≈ +300 kcal, aber empfehle +150 kcal total
      },
      duration: '1 Woche',
      conditions: ['Priorisiere Post-Workout Carbs', 'Bessere Schlafhygiene']
    })
  }

  return recommendations
}

/**
 * Spezielle Empfehlungen für Events/Wochenenden
 */
export function generateEventRecommendations(
  eventCalories: number,
  weeklyTarget: number
): AdjustmentRecommendation {
  const surplus = eventCalories - (weeklyTarget / 7)
  const dailyReduction = Math.round(surplus / 6) // Verteile auf 6 andere Tage
  
  if (surplus > 500) {
    return {
      type: 'calories',
      priority: 'medium',
      title: 'Event-Kalorien ausgleichen',
      description: `Du planst ${eventCalories} kcal für ein Event (+${surplus} kcal über dem Tagesziel). ` +
        `Reduziere die anderen 6 Tage um je ${dailyReduction} kcal oder akzeptiere diese Woche als leichten Überschuss.`,
      calorieAdjustment: -dailyReduction,
      duration: '6 Tage',
      conditions: [
        'Option 1: Tägliche Reduktion um das Event auszugleichen',
        'Option 2: Woche als Überschuss akzeptieren und nächste Woche normal weitermachen',
        'Das Wochenmittel ist entscheidend, nicht einzelne Tage'
      ]
    }
  }

  return {
    type: 'lifestyle',
    priority: 'low',
    title: 'Event im Rahmen',
    description: 'Dein geplantes Event liegt im normalen Bereich. Genieße es ohne schlechtes Gewissen!',
    duration: 'Einmalig'
  }
}

/**
 * Empfehlungen bei Verletzung/Trainingspause
 */
export function generateInjuryRecommendations(
  currentCalories: number,
  estimatedDuration: string
): AdjustmentRecommendation[] {
  return [
    {
      type: 'calories',
      priority: 'high',
      title: 'Kalorien für Trainingspause anpassen',
      description: 'Bei Verletzung/Pause: Wechsle in die Erhaltungskalorien oder ein leichtes Defizit (-200 kcal) ' +
        'um Fettaufbau zu vermeiden.',
      calorieAdjustment: -200,
      duration: estimatedDuration,
      conditions: ['Priorisiere Protein (1.6-2.2g/kg)', 'Heilung und Erholung stehen im Vordergrund']
    },
    {
      type: 'macros',
      priority: 'medium',
      title: 'Makros für Heilung optimieren',
      description: 'Reduziere Kohlenhydrate um 20-30% und halte Protein und Fette hoch für optimale Heilung.',
      macroAdjustments: {
        carbs: -50,
        protein: 10,
        fat: 5
      },
      duration: estimatedDuration,
      conditions: [
        'Entzündungshemmende Lebensmittel bevorzugen',
        'Ausreichend Omega-3 Fettsäuren',
        'Bei Rückkehr zum Training langsam steigern'
      ]
    }
  ]
}

/**
 * Hilfsfunktion: Berechne neue Zielkalorien basierend auf Empfehlung
 */
export function calculateNewTargetCalories(
  currentCalories: number,
  recommendation: AdjustmentRecommendation
): number {
  if (recommendation.calorieAdjustment) {
    return Math.round(currentCalories + recommendation.calorieAdjustment)
  }
  return currentCalories
}

/**
 * Hilfsfunktion: Berechne neuen Aktivitätsfaktor basierend auf Empfehlung
 */
export function calculateNewActivityFactor(
  currentFactor: number,
  recommendation: AdjustmentRecommendation
): number {
  if (recommendation.activityFactorAdjustment) {
    return Math.round((currentFactor + recommendation.activityFactorAdjustment) * 100) / 100
  }
  return currentFactor
}

/**
 * Priorisierung und Formatierung von Empfehlungen für die UI
 */
export function formatRecommendationsForUI(
  recommendations: AdjustmentRecommendation[]
): { critical: AdjustmentRecommendation[], high: AdjustmentRecommendation[], medium: AdjustmentRecommendation[], low: AdjustmentRecommendation[] } {
  return {
    critical: recommendations.filter(r => r.priority === 'critical'),
    high: recommendations.filter(r => r.priority === 'high'),
    medium: recommendations.filter(r => r.priority === 'medium'),
    low: recommendations.filter(r => r.priority === 'low')
  }
}
