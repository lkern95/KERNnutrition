import { describe, it, expect } from 'vitest'

// Planer formula function - if it doesn't exist, we'll create it
export function calculateRestDayCalories(
  dailyTarget: number,
  nTrainDays: number,
  kcalTrain: number
): number {
  if (dailyTarget <= 0) {
    throw new Error('Tagesziel muss positiv sein')
  }
  
  if (nTrainDays === 7) {
    throw new Error('Bei 7 Trainingstagen gibt es keine Ruhetage')
  }
  
  if (nTrainDays < 0 || nTrainDays > 7) {
    throw new Error('Anzahl Trainingstage muss zwischen 0 und 7 liegen')
  }
  
  if (kcalTrain <= 0) {
    throw new Error('Trainingstag-Kalorien müssen positiv sein')
  }

  // Formel: kcal_rest = (7*daily_target - n*kcal_train) / (7 - n)
  const restDays = 7 - nTrainDays
  const totalWeeklyTarget = 7 * dailyTarget
  const totalTrainCalories = nTrainDays * kcalTrain
  const calculatedRestCalories = (totalWeeklyTarget - totalTrainCalories) / restDays

  if (calculatedRestCalories <= 0) {
    throw new Error('Ruhetag-Kalorien wären negativ')
  }

  if (calculatedRestCalories < 800) {
    throw new Error('Ruhetag-Kalorien unter 800 kcal sind gesundheitlich bedenklich')
  }

  return Math.round(calculatedRestCalories)
}

describe('Planer Formula - calculateRestDayCalories', () => {
  it('should calculate rest day calories correctly - example case', () => {
    // Beispiel: 3148, n=4, kcal_train=3348 → kcal_rest≈2881
    const result = calculateRestDayCalories(3148, 4, 3348)
    expect(result).toBe(2881)
    
    // Verification: (7*3148 - 4*3348) / (7-4) = (22036 - 13392) / 3 = 8644 / 3 = 2881.33... ≈ 2881
    const verification = Math.round((7 * 3148 - 4 * 3348) / (7 - 4))
    expect(result).toBe(verification)
  })

  it('should calculate rest day calories for different scenarios', () => {
    // Szenario 1: Moderate Werte
    const result1 = calculateRestDayCalories(2500, 3, 2700)
    const expected1 = Math.round((7 * 2500 - 3 * 2700) / (7 - 3)) // (17500 - 8100) / 4 = 2350
    expect(result1).toBe(expected1)
    expect(result1).toBe(2350)

    // Szenario 2: Weniger Trainingstage
    const result2 = calculateRestDayCalories(2200, 2, 2400)
    const expected2 = Math.round((7 * 2200 - 2 * 2400) / (7 - 2)) // (15400 - 4800) / 5 = 2120
    expect(result2).toBe(expected2)
    expect(result2).toBe(2120)

    // Szenario 3: Viele Trainingstage
    const result3 = calculateRestDayCalories(3000, 5, 3200)
    const expected3 = Math.round((7 * 3000 - 5 * 3200) / (7 - 5)) // (21000 - 16000) / 2 = 2500
    expect(result3).toBe(expected3)
    expect(result3).toBe(2500)
  })

  it('should handle edge cases', () => {
    // 0 Trainingstage (nur Ruhetage)
    const result1 = calculateRestDayCalories(2000, 0, 2200)
    expect(result1).toBe(2000) // Alle Tage sind Ruhetage

    // 6 Trainingstage (nur 1 Ruhetag)
    const result2 = calculateRestDayCalories(2500, 6, 2700)
    const expected2 = Math.round((7 * 2500 - 6 * 2700) / 1) // (17500 - 16200) / 1 = 1300
    expect(result2).toBe(expected2)
    expect(result2).toBe(1300)
  })

  it('should throw error for invalid inputs', () => {
    // Negative oder null Tagesziel
    expect(() => calculateRestDayCalories(-2000, 3, 2200)).toThrow('Tagesziel muss positiv sein')
    expect(() => calculateRestDayCalories(0, 3, 2200)).toThrow('Tagesziel muss positiv sein')

    // Ungültige Trainingstage
    expect(() => calculateRestDayCalories(2000, -1, 2200)).toThrow('Anzahl Trainingstage muss zwischen 0 und 7 liegen')
    expect(() => calculateRestDayCalories(2000, 8, 2200)).toThrow('Anzahl Trainingstage muss zwischen 0 und 7 liegen')
    expect(() => calculateRestDayCalories(2000, 7, 2200)).toThrow('Bei 7 Trainingstagen gibt es keine Ruhetage')

    // Negative oder null Trainings-Kalorien
    expect(() => calculateRestDayCalories(2000, 3, -2200)).toThrow('Trainingstag-Kalorien müssen positiv sein')
    expect(() => calculateRestDayCalories(2000, 3, 0)).toThrow('Trainingstag-Kalorien müssen positiv sein')
  })

  it('should throw error when rest calories would be negative', () => {
    // Zu hohe Trainings-Kalorien führen zu negativen Ruhetag-Kalorien
    expect(() => calculateRestDayCalories(2000, 4, 5000)).toThrow('Ruhetag-Kalorien wären negativ')
  })

  it('should throw error when rest calories would be too low', () => {
    // Ruhetag-Kalorien unter 800 kcal
    expect(() => calculateRestDayCalories(1000, 5, 1200)).toThrow('Ruhetag-Kalorien unter 800 kcal sind gesundheitlich bedenklich')
  })

  it('should handle decimal inputs correctly', () => {
    // Dezimalstellen sollten korrekt verarbeitet werden
    const result = calculateRestDayCalories(2500.5, 3, 2700.7)
    const expected = Math.round((7 * 2500.5 - 3 * 2700.7) / (7 - 3))
    expect(result).toBe(expected)
    expect(Number.isInteger(result)).toBe(true)
  })
})
