import { describe, it, expect } from 'vitest'

// Rule engine types and functions
export type ProgressStatus = 'under_target' | 'on_target' | 'over_target'
export type EnergyLevel = 'low' | 'normal' | 'high'
export type PerformanceLevel = 'poor' | 'normal' | 'good'

export interface RuleEngineInput {
  weightChange: number // kg pro Woche
  targetWeightChange: number // kg pro Woche
  tolerance: number // Toleranz in kg
  averageSleep: number // 1-5 Skala
  averageStress: number // 1-5 Skala
  averageTrainingDays: number
  eventCalories?: number // Extra Kalorien für Events
}

export interface RuleEngineResult {
  status: ProgressStatus
  energyLevel: EnergyLevel
  performanceLevel: PerformanceLevel
  recommendations: string[]
  calorieAdjustment: number
  warning?: string
}

export function evaluateProgress(input: RuleEngineInput): RuleEngineResult {
  const { weightChange, targetWeightChange, tolerance, averageSleep, averageStress, averageTrainingDays, eventCalories } = input
  
  // Status bestimmen
  let status: ProgressStatus
  if (weightChange < targetWeightChange - tolerance) {
    status = 'under_target'
  } else if (weightChange > targetWeightChange + tolerance) {
    status = 'over_target'
  } else {
    status = 'on_target'
  }

  // Energie-Level basierend auf Schlaf und Stress
  let energyLevel: EnergyLevel = 'normal'
  if (averageSleep <= 2 || averageStress >= 4) {
    energyLevel = 'low'
  } else if (averageSleep >= 4 && averageStress <= 2) {
    energyLevel = 'high'
  }

  // Performance-Level basierend auf Training und Energie
  let performanceLevel: PerformanceLevel = 'normal'
  if (averageTrainingDays <= 2 || energyLevel === 'low') {
    performanceLevel = 'poor'
  } else if (averageTrainingDays >= 5 && energyLevel === 'high') {
    performanceLevel = 'good'
  }

  // Empfehlungen und Kalorien-Anpassungen
  const recommendations: string[] = []
  let calorieAdjustment = 0
  let warning: string | undefined

  // Regel 1: Unter Ziel
  if (status === 'under_target') {
    calorieAdjustment = 200
    recommendations.push('Erhöhe Kalorien um 200 kcal')
    if (energyLevel === 'low') {
      recommendations.push('Fokussiere auf mehr Kohlenhydrate für Energie')
      calorieAdjustment += 100
    }
  }

  // Regel 2: Über Ziel
  if (status === 'over_target') {
    calorieAdjustment = -150
    recommendations.push('Reduziere Kalorien um 150 kcal')
    if (performanceLevel === 'good') {
      recommendations.push('Erhöhe Cardio-Anteil')
    }
  }

  // Regel 3: Energie/Leistung schlecht
  if (energyLevel === 'low' && performanceLevel === 'poor') {
    recommendations.push('Priorisiere Schlaf und Stressmanagement')
    recommendations.push('Reduziere Trainingsintensität temporär')
    if (status === 'on_target') {
      calorieAdjustment = 100 // Leichte Erhöhung für Recovery
    }
    warning = 'Regeneration ist derzeit wichtiger als Kalorienziel'
  }

  // Regel 4: Events-Kompensation
  if (eventCalories && eventCalories > 0) {
    const dailyCompensation = Math.round(eventCalories / 7)
    calorieAdjustment -= dailyCompensation
    recommendations.push(`Kompensiere Event-Kalorien: -${dailyCompensation} kcal/Tag für 1 Woche`)
  }

  // Regel 5: Im Ziel - Feintuning
  if (status === 'on_target') {
    if (energyLevel === 'high' && performanceLevel === 'good') {
      recommendations.push('Halte aktuelle Strategie bei')
    } else if (energyLevel === 'low') {
      recommendations.push('Optimiere Mikronährstoffe und Timing')
    } else {
      recommendations.push('Halte aktuelle Strategie bei')
    }
  }

  return {
    status,
    energyLevel,
    performanceLevel,
    recommendations,
    calorieAdjustment,
    warning
  }
}

describe('Rule Engine - evaluateProgress', () => {
  const baseInput: RuleEngineInput = {
    weightChange: 0.3,
    targetWeightChange: 0.35,
    tolerance: 0.1,
    averageSleep: 3,
    averageStress: 3,
    averageTrainingDays: 4
  }

  describe('Progress Status Rules', () => {
    it('should identify "under_target" correctly', () => {
      const input = { ...baseInput, weightChange: 0.1, targetWeightChange: 0.35 }
      const result = evaluateProgress(input)
      
      expect(result.status).toBe('under_target')
      expect(result.calorieAdjustment).toBe(200)
      expect(result.recommendations).toContain('Erhöhe Kalorien um 200 kcal')
    })

    it('should identify "on_target" correctly', () => {
      const input = { ...baseInput, weightChange: 0.35, targetWeightChange: 0.35 }
      const result = evaluateProgress(input)
      
      expect(result.status).toBe('on_target')
      expect(result.recommendations).toContain('Halte aktuelle Strategie bei')
    })

    it('should identify "over_target" correctly', () => {
      const input = { ...baseInput, weightChange: 0.6, targetWeightChange: 0.35 }
      const result = evaluateProgress(input)
      
      expect(result.status).toBe('over_target')
      expect(result.calorieAdjustment).toBe(-150)
      expect(result.recommendations).toContain('Reduziere Kalorien um 150 kcal')
    })

    it('should respect tolerance boundaries', () => {
      // Innerhalb Toleranz (unten)
      const input1 = { ...baseInput, weightChange: 0.25, targetWeightChange: 0.35, tolerance: 0.1 }
      const result1 = evaluateProgress(input1)
      expect(result1.status).toBe('on_target')

      // Innerhalb Toleranz (oben)
      const input2 = { ...baseInput, weightChange: 0.44, targetWeightChange: 0.35, tolerance: 0.1 }
      const result2 = evaluateProgress(input2)
      expect(result2.status).toBe('on_target')

      // Außerhalb Toleranz (unten)
      const input3 = { ...baseInput, weightChange: 0.24, targetWeightChange: 0.35, tolerance: 0.1 }
      const result3 = evaluateProgress(input3)
      expect(result3.status).toBe('under_target')

      // Außerhalb Toleranz (oben)
      const input4 = { ...baseInput, weightChange: 0.46, targetWeightChange: 0.35, tolerance: 0.1 }
      const result4 = evaluateProgress(input4)
      expect(result4.status).toBe('over_target')
    })
  })

  describe('Energy Level Rules', () => {
    it('should identify low energy correctly', () => {
      // Schlechter Schlaf
      const input1 = { ...baseInput, averageSleep: 2, averageStress: 3 }
      const result1 = evaluateProgress(input1)
      expect(result1.energyLevel).toBe('low')

      // Hoher Stress
      const input2 = { ...baseInput, averageSleep: 3, averageStress: 4 }
      const result2 = evaluateProgress(input2)
      expect(result2.energyLevel).toBe('low')

      // Beides schlecht
      const input3 = { ...baseInput, averageSleep: 1, averageStress: 5 }
      const result3 = evaluateProgress(input3)
      expect(result3.energyLevel).toBe('low')
    })

    it('should identify high energy correctly', () => {
      const input = { ...baseInput, averageSleep: 4, averageStress: 2 }
      const result = evaluateProgress(input)
      expect(result.energyLevel).toBe('high')
    })

    it('should identify normal energy correctly', () => {
      const input = { ...baseInput, averageSleep: 3, averageStress: 3 }
      const result = evaluateProgress(input)
      expect(result.energyLevel).toBe('normal')
    })
  })

  describe('Performance Level Rules', () => {
    it('should identify poor performance correctly', () => {
      // Wenig Training
      const input1 = { ...baseInput, averageTrainingDays: 2 }
      const result1 = evaluateProgress(input1)
      expect(result1.performanceLevel).toBe('poor')

      // Niedrige Energie
      const input2 = { ...baseInput, averageSleep: 1, averageStress: 5 }
      const result2 = evaluateProgress(input2)
      expect(result2.performanceLevel).toBe('poor')
    })

    it('should identify good performance correctly', () => {
      const input = { ...baseInput, averageTrainingDays: 5, averageSleep: 4, averageStress: 2 }
      const result = evaluateProgress(input)
      expect(result.performanceLevel).toBe('good')
    })
  })

  describe('Combined Rules', () => {
    it('should handle "unter Ziel" + low energy correctly', () => {
      const input = { 
        ...baseInput, 
        weightChange: 0.1, 
        targetWeightChange: 0.35,
        averageSleep: 2 
      }
      const result = evaluateProgress(input)
      
      expect(result.status).toBe('under_target')
      expect(result.energyLevel).toBe('low')
      expect(result.calorieAdjustment).toBe(300) // 200 + 100 for low energy
      expect(result.recommendations).toContain('Erhöhe Kalorien um 200 kcal')
      expect(result.recommendations).toContain('Fokussiere auf mehr Kohlenhydrate für Energie')
    })

    it('should handle "über Ziel" + good performance correctly', () => {
      const input = { 
        ...baseInput, 
        weightChange: 0.6, 
        targetWeightChange: 0.35,
        averageTrainingDays: 5,
        averageSleep: 4,
        averageStress: 2
      }
      const result = evaluateProgress(input)
      
      expect(result.status).toBe('over_target')
      expect(result.performanceLevel).toBe('good')
      expect(result.calorieAdjustment).toBe(-150)
      expect(result.recommendations).toContain('Reduziere Kalorien um 150 kcal')
      expect(result.recommendations).toContain('Erhöhe Cardio-Anteil')
    })

    it('should handle poor energy and performance correctly', () => {
      const input = { 
        ...baseInput, 
        averageSleep: 1, 
        averageStress: 5,
        averageTrainingDays: 2
      }
      const result = evaluateProgress(input)
      
      expect(result.energyLevel).toBe('low')
      expect(result.performanceLevel).toBe('poor')
      expect(result.calorieAdjustment).toBe(100) // Recovery boost
      expect(result.recommendations).toContain('Priorisiere Schlaf und Stressmanagement')
      expect(result.recommendations).toContain('Reduziere Trainingsintensität temporär')
      expect(result.warning).toBe('Regeneration ist derzeit wichtiger als Kalorienziel')
    })
  })

  describe('Event Compensation Rules', () => {
    it('should compensate for event calories correctly', () => {
      const input = { ...baseInput, eventCalories: 1400 } // 200 kcal/Tag für 1 Woche
      const result = evaluateProgress(input)
      
      expect(result.calorieAdjustment).toBe(-200) // -1400/7 = -200
      expect(result.recommendations).toContain('Kompensiere Event-Kalorien: -200 kcal/Tag für 1 Woche')
    })

    it('should combine event compensation with other adjustments', () => {
      const input = { 
        ...baseInput, 
        weightChange: 0.1, // unter Ziel → +200 kcal
        targetWeightChange: 0.35,
        eventCalories: 700 // -100 kcal/Tag
      }
      const result = evaluateProgress(input)
      
      expect(result.status).toBe('under_target')
      expect(result.calorieAdjustment).toBe(100) // 200 - 100 = 100
      expect(result.recommendations).toContain('Erhöhe Kalorien um 200 kcal')
      expect(result.recommendations).toContain('Kompensiere Event-Kalorien: -100 kcal/Tag für 1 Woche')
    })
  })
})
