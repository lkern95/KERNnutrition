import { describe, it, expect } from 'vitest'
import {
  generateAdjustmentRecommendations,
  generateEventRecommendations,
  generateInjuryRecommendations,
  calculateNewTargetCalories,
  calculateNewActivityFactor,
  formatRecommendationsForUI,
  type CheckinData,
  type UserProfile,
  type TrendData
} from './adjust'

// Test data
const mockUserProfile: UserProfile = {
  weight: 80,
  height: 180,
  age: 30,
  sex: 'male',
  activityFactor: 1.6,
  goal: 'lean_bulk',
  targetCalories: 2800,
  currentCalories: 2800
}

const mockTrendData: TrendData = {
  weightChange: 0.2,
  weeklyChange: 0.2,
  weeklyChangePercent: 0.25,
  classification: 'in',
  goalRange: { min: 0.25, max: 0.5, label: 'Lean Bulk' },
  weeksInTrend: 2
}

const mockCheckins: CheckinData[] = [
  {
    id: '1',
    date: '2025-09-01',
    weight: 80.2,
    trainingDays: 4,
    sleep: 4,
    stress: 2,
    notes: ''
  },
  {
    id: '2',
    date: '2025-08-25',
    weight: 80.0,
    trainingDays: 4,
    sleep: 3,
    stress: 2,
    notes: ''
  }
]

describe('Adjustment Engine', () => {
  describe('generateAdjustmentRecommendations', () => {
    it('should return data collection message for insufficient data', () => {
      const recommendations = generateAdjustmentRecommendations(
        [mockCheckins[0]], // Only 1 check-in
        mockUserProfile,
        mockTrendData
      )

      expect(recommendations).toHaveLength(1)
      expect(recommendations[0].title).toBe('Mehr Daten sammeln')
      expect(recommendations[0].priority).toBe('low')
    })

    it('should recommend calorie increase when under target for 2+ weeks', () => {
      const underTrendData: TrendData = {
        ...mockTrendData,
        weeklyChangePercent: 0.1, // Under 0.25% target
        classification: 'under',
        weeksInTrend: 2
      }

      const recommendations = generateAdjustmentRecommendations(
        mockCheckins,
        mockUserProfile,
        underTrendData
      )

      const calorieRec = recommendations.find(r => r.type === 'calories')
      expect(calorieRec).toBeDefined()
      expect(calorieRec?.calorieAdjustment).toBeGreaterThan(0)
      expect(calorieRec?.title).toContain('Kalorien für Aufbau erhöhen')
    })

    it('should recommend calorie decrease when over target for 2+ weeks', () => {
      const overTrendData: TrendData = {
        ...mockTrendData,
        weeklyChangePercent: 0.8, // Over 0.5% target
        classification: 'over',
        weeksInTrend: 2
      }

      const recommendations = generateAdjustmentRecommendations(
        mockCheckins,
        { ...mockUserProfile, goal: 'cut' },
        overTrendData
      )

      const calorieRec = recommendations.find(r => r.type === 'calories')
      expect(calorieRec).toBeDefined()
      expect(calorieRec?.calorieAdjustment).toBeLessThan(0)
    })

    it('should recommend lifestyle changes for poor sleep/high stress', () => {
      const poorSleepCheckins: CheckinData[] = [
        { ...mockCheckins[0], sleep: 2, stress: 4 },
        { ...mockCheckins[1], sleep: 1, stress: 4 }
      ]

      const recommendations = generateAdjustmentRecommendations(
        poorSleepCheckins,
        mockUserProfile,
        mockTrendData
      )

      const lifestyleRec = recommendations.find(r => r.type === 'lifestyle')
      expect(lifestyleRec).toBeDefined()
      expect(lifestyleRec?.title).toBe('Erholung priorisieren')
      expect(lifestyleRec?.priority).toBe('high')
    })

    it('should detect stagnation and recommend adjustments', () => {
      const stagnationTrend: TrendData = {
        ...mockTrendData,
        weeklyChangePercent: 0.05, // Very low change
        classification: 'in',
        weeksInTrend: 3
      }

      const recommendations = generateAdjustmentRecommendations(
        mockCheckins,
        mockUserProfile,
        stagnationTrend
      )

      const stagnationRec = recommendations.find(r => r.title.includes('Stagnation'))
      expect(stagnationRec).toBeDefined()
      expect(stagnationRec?.calorieAdjustment).toBeLessThan(0)
    })

    it('should recommend activity factor adjustment for low training days', () => {
      const lowTrainingCheckins: CheckinData[] = [
        { ...mockCheckins[0], trainingDays: 1 },
        { ...mockCheckins[1], trainingDays: 2 }
      ]

      const recommendations = generateAdjustmentRecommendations(
        lowTrainingCheckins,
        mockUserProfile,
        mockTrendData
      )

      const activityRec = recommendations.find(r => r.type === 'activity_factor')
      expect(activityRec).toBeDefined()
      expect(activityRec?.activityFactorAdjustment).toBeLessThan(0)
    })

    it('should recommend carb increase for high training low sleep', () => {
      const highTrainingLowSleep: CheckinData[] = [
        { ...mockCheckins[0], trainingDays: 6, sleep: 2 },
        { ...mockCheckins[1], trainingDays: 5, sleep: 1 }
      ]

      const recommendations = generateAdjustmentRecommendations(
        highTrainingLowSleep,
        mockUserProfile,
        mockTrendData
      )

      const macroRec = recommendations.find(r => r.type === 'macros')
      expect(macroRec).toBeDefined()
      expect(macroRec?.title).toContain('Kohlenhydrate')
      expect(macroRec?.macroAdjustments?.carbs).toBeGreaterThan(0)
    })
  })

  describe('generateEventRecommendations', () => {
    it('should recommend daily reduction for large event surplus', () => {
      const recommendation = generateEventRecommendations(3500, 2800 * 7) // +700 kcal event
      
      expect(recommendation.type).toBe('calories')
      expect(recommendation.calorieAdjustment).toBeLessThan(0)
      expect(recommendation.title).toContain('Event-Kalorien ausgleichen')
    })

    it('should accept moderate event calories', () => {
      const recommendation = generateEventRecommendations(2900, 2800 * 7) // +100 kcal event
      
      expect(recommendation.title).toContain('Event im Rahmen')
      expect(recommendation.priority).toBe('low')
    })
  })

  describe('generateInjuryRecommendations', () => {
    it('should recommend calorie reduction and macro adjustments', () => {
      const recommendations = generateInjuryRecommendations(2800, '4-6 Wochen')
      
      expect(recommendations).toHaveLength(2)
      
      const calorieRec = recommendations.find(r => r.type === 'calories')
      expect(calorieRec).toBeDefined()
      expect(calorieRec?.calorieAdjustment).toBeLessThan(0)
      expect(calorieRec?.duration).toBe('4-6 Wochen')
      
      const macroRec = recommendations.find(r => r.type === 'macros')
      expect(macroRec).toBeDefined()
      expect(macroRec?.macroAdjustments?.carbs).toBeLessThan(0)
      expect(macroRec?.macroAdjustments?.protein).toBeGreaterThan(0)
    })
  })

  describe('calculateNewTargetCalories', () => {
    it('should calculate new calories correctly', () => {
      const recommendation = {
        type: 'calories' as const,
        priority: 'medium' as const,
        title: 'Test',
        description: 'Test',
        calorieAdjustment: 150
      }
      
      const newCalories = calculateNewTargetCalories(2800, recommendation)
      expect(newCalories).toBe(2950)
    })

    it('should return current calories when no adjustment', () => {
      const recommendation = {
        type: 'lifestyle' as const,
        priority: 'low' as const,
        title: 'Test',
        description: 'Test'
      }
      
      const newCalories = calculateNewTargetCalories(2800, recommendation)
      expect(newCalories).toBe(2800)
    })
  })

  describe('calculateNewActivityFactor', () => {
    it('should calculate new activity factor correctly', () => {
      const recommendation = {
        type: 'activity_factor' as const,
        priority: 'medium' as const,
        title: 'Test',
        description: 'Test',
        activityFactorAdjustment: -0.15
      }
      
      const newFactor = calculateNewActivityFactor(1.6, recommendation)
      expect(newFactor).toBe(1.45)
    })

    it('should round to 2 decimal places', () => {
      const recommendation = {
        type: 'activity_factor' as const,
        priority: 'medium' as const,
        title: 'Test',
        description: 'Test',
        activityFactorAdjustment: -0.123
      }
      
      const newFactor = calculateNewActivityFactor(1.6, recommendation)
      expect(newFactor).toBe(1.48)
    })
  })

  describe('formatRecommendationsForUI', () => {
    it('should group recommendations by priority', () => {
      const recommendations = [
        { type: 'calories' as const, priority: 'high' as const, title: 'High', description: 'High' },
        { type: 'lifestyle' as const, priority: 'low' as const, title: 'Low', description: 'Low' },
        { type: 'macros' as const, priority: 'critical' as const, title: 'Critical', description: 'Critical' },
        { type: 'calories' as const, priority: 'medium' as const, title: 'Medium', description: 'Medium' }
      ]
      
      const grouped = formatRecommendationsForUI(recommendations)
      
      expect(grouped.critical).toHaveLength(1)
      expect(grouped.high).toHaveLength(1)
      expect(grouped.medium).toHaveLength(1)
      expect(grouped.low).toHaveLength(1)
      
      expect(grouped.critical[0].title).toBe('Critical')
      expect(grouped.high[0].title).toBe('High')
      expect(grouped.medium[0].title).toBe('Medium')
      expect(grouped.low[0].title).toBe('Low')
    })
  })

  describe('Different goal types', () => {
    it('should handle cut goal appropriately', () => {
      const cutProfile: UserProfile = {
        ...mockUserProfile,
        goal: 'cut'
      }
      
      const overTrendData: TrendData = {
        ...mockTrendData,
        weeklyChangePercent: -1.5, // Too fast weight loss
        classification: 'over',
        weeksInTrend: 2
      }

      const recommendations = generateAdjustmentRecommendations(
        mockCheckins,
        cutProfile,
        overTrendData
      )

      const calorieRec = recommendations.find(r => r.type === 'calories')
      expect(calorieRec?.description).toContain('Sehr guter Fortschritt')
    })

    it('should handle maintain goal', () => {
      const maintainProfile: UserProfile = {
        ...mockUserProfile,
        goal: 'maintain'
      }
      
      const maintainTrend: TrendData = {
        ...mockTrendData,
        weeklyChangePercent: 0.1,
        classification: 'in',
        goalRange: { min: -0.25, max: 0.25, label: 'Erhaltung' },
        weeksInTrend: 2
      }

      const recommendations = generateAdjustmentRecommendations(
        mockCheckins,
        maintainProfile,
        maintainTrend
      )

      // Should have fewer aggressive recommendations for maintain goal
      const calorieRecs = recommendations.filter(r => r.type === 'calories')
      expect(calorieRecs.length).toBeLessThanOrEqual(1)
    })
  })

  describe('Edge cases', () => {
    it('should handle extreme deviations', () => {
      const extremeTrend: TrendData = {
        ...mockTrendData,
        weeklyChangePercent: 2.0, // Very extreme gain
        classification: 'over',
        weeksInTrend: 3
      }

      const recommendations = generateAdjustmentRecommendations(
        mockCheckins,
        mockUserProfile,
        extremeTrend
      )

      const calorieRec = recommendations.find(r => r.type === 'calories')
      expect(calorieRec?.calorieAdjustment).toBeLessThanOrEqual(-200) // Large reduction
    })

    it('should prioritize correctly', () => {
      const poorHealthCheckins: CheckinData[] = [
        { ...mockCheckins[0], sleep: 1, stress: 5, trainingDays: 1 },
        { ...mockCheckins[1], sleep: 1, stress: 5, trainingDays: 0 }
      ]

      const recommendations = generateAdjustmentRecommendations(
        poorHealthCheckins,
        mockUserProfile,
        mockTrendData
      )

      // Lifestyle should be prioritized over calories for poor health
      expect(recommendations[0].type).toBe('lifestyle')
      expect(recommendations[0].priority).toBe('high')
    })
  })
})
