import { describe, it, expect } from 'vitest'

// CheckinTrendAnalysis Test
interface CheckinEntry {
  id: string
  date: string
  weight: number
  trainingDays?: number
  sleep?: number
  stress?: number
  notes?: string
}

// Zielbereich-Definitionen (% pro Woche)
const GOAL_RANGES = {
  lean_bulk: { min: 0.25, max: 0.5, label: 'Lean Bulk' },
  aggressive_bulk: { min: 0.5, max: 0.75, label: 'Aggressiver Aufbau' },
  cut: { min: -1.0, max: -0.5, label: 'Diät' },
  maintain: { min: -0.25, max: 0.25, label: 'Erhaltung' }
}

function getTrendAnalysis(checkins: CheckinEntry[], selectedGoal: keyof typeof GOAL_RANGES) {
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

describe('Check-in Trend Analysis', () => {
  const mockCheckins: CheckinEntry[] = [
    {
      id: '1',
      date: '2025-09-01',
      weight: 80.2,
      trainingDays: 4,
      sleep: 4,
      stress: 2,
      notes: 'Gute Woche'
    },
    {
      id: '2',
      date: '2025-08-25',
      weight: 80.0,
      trainingDays: 3,
      sleep: 3,
      stress: 3,
      notes: ''
    },
    {
      id: '3',
      date: '2025-08-18',
      weight: 79.8,
      trainingDays: 4,
      sleep: 4,
      stress: 2,
      notes: 'Starke Woche'
    }
  ]

  it('should return null for insufficient data', () => {
    const result = getTrendAnalysis([], 'maintain')
    expect(result).toBeNull()

    const result2 = getTrendAnalysis([mockCheckins[0]], 'maintain')
    expect(result2).toBeNull()
  })

  it('should calculate 2-week trend correctly', () => {
    const result = getTrendAnalysis(mockCheckins.slice(0, 2), 'lean_bulk')
    
    expect(result).not.toBeNull()
    expect(result!.weightChange).toBeCloseTo(0.2, 1) // 80.2 - 80.0
    expect(result!.weeklyChange).toBeCloseTo(0.2, 1) // 7 days apart
    expect(result!.weeklyChangePercent).toBeCloseTo(0.25, 2) // 0.2/80 * 100
    expect(result!.dataPoints).toBe(2)
  })

  it('should calculate 3-week moving average', () => {
    const result = getTrendAnalysis(mockCheckins, 'lean_bulk')
    
    expect(result).not.toBeNull()
    expect(result!.movingAverage).toBeCloseTo(80.0, 1) // (80.2 + 80.0 + 79.8) / 3
  })

  it('should classify goals correctly', () => {
    // Test Lean Bulk (0.25-0.5% per week)
    const leanBulkResult = getTrendAnalysis(mockCheckins.slice(0, 2), 'lean_bulk')
    expect(leanBulkResult!.classification).toBe('in') // 0.25% is in range
    expect(leanBulkResult!.goalRange.label).toBe('Lean Bulk')

    // Test maintain goal (should be 'over' for 0.25% gain)
    const maintainResult = getTrendAnalysis(mockCheckins.slice(0, 2), 'maintain')
    expect(maintainResult!.classification).toBe('over') // 0.25% > 0.25% max
    
    // Test aggressive bulk
    const aggressiveResult = getTrendAnalysis(mockCheckins.slice(0, 2), 'aggressive_bulk')
    expect(aggressiveResult!.classification).toBe('under') // 0.25% < 0.5% min
  })

  it('should handle different time intervals correctly', () => {
    // Test with 14-day interval
    const checkins14Days: CheckinEntry[] = [
      {
        id: '1',
        date: '2025-09-01',
        weight: 81.0,
        trainingDays: 4,
        sleep: 4,
        stress: 2
      },
      {
        id: '2',
        date: '2025-08-18', // 14 days earlier
        weight: 80.0,
        trainingDays: 3,
        sleep: 3,
        stress: 3
      }
    ]

    const result = getTrendAnalysis(checkins14Days, 'lean_bulk')
    expect(result!.weightChange).toBe(1.0)
    expect(result!.weeklyChange).toBeCloseTo(0.5, 1) // 1kg over 14 days = 0.5kg/week
    expect(result!.weeklyChangePercent).toBeCloseTo(0.625, 2) // 0.5/80 * 100
  })

  it('should validate goal ranges', () => {
    expect(GOAL_RANGES.lean_bulk.min).toBe(0.25)
    expect(GOAL_RANGES.lean_bulk.max).toBe(0.5)
    expect(GOAL_RANGES.aggressive_bulk.min).toBe(0.5)
    expect(GOAL_RANGES.aggressive_bulk.max).toBe(0.75)
    expect(GOAL_RANGES.cut.min).toBe(-1.0)
    expect(GOAL_RANGES.cut.max).toBe(-0.5)
    expect(GOAL_RANGES.maintain.min).toBe(-0.25)
    expect(GOAL_RANGES.maintain.max).toBe(0.25)
  })

  it('should handle weight loss correctly', () => {
    const weightLossCheckins: CheckinEntry[] = [
      {
        id: '1',
        date: '2025-09-01',
        weight: 79.0,
        trainingDays: 4,
        sleep: 4,
        stress: 2
      },
      {
        id: '2',
        date: '2025-08-25',
        weight: 80.0,
        trainingDays: 3,
        sleep: 3,
        stress: 3
      }
    ]

    const result = getTrendAnalysis(weightLossCheckins, 'cut')
    expect(result!.weightChange).toBe(-1.0)
    expect(result!.weeklyChangePercent).toBeCloseTo(-1.25, 2) // -1/80 * 100
    expect(result!.classification).toBe('under') // -1.25% is more aggressive than -1.0% min (faster loss = under target)
  })
})
