import { describe, it, expect } from 'vitest'
import { 
  mifflinStJeor, 
  tdee, 
  targetCalories, 
  macrosFromTargets,
  validateInput,
  validateFatPercentage,
  getMacroPercentages,
  type CalcInput,
  type Sex 
} from './nutrition'

describe('mifflinStJeor', () => {
  it('should calculate BMR correctly for males', () => {
    // Test case: 80kg, 180cm, 30 Jahre, männlich
    // Erwartung: 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    const result = mifflinStJeor(80, 180, 30, 'M')
    expect(result).toBe(1780)
  })

  it('should calculate BMR correctly for females', () => {
    // Test case: 65kg, 165cm, 25 Jahre, weiblich
    // Erwartung: 10*65 + 6.25*165 - 5*25 - 161 = 650 + 1031.25 - 125 - 161 = 1395.25 → 1395
    const result = mifflinStJeor(65, 165, 25, 'F')
    expect(result).toBe(1395)
  })

  it('should round results to nearest integer', () => {
    // Test case mit Nachkommastellen
    const result = mifflinStJeor(70.5, 172.3, 28, 'F')
    expect(Number.isInteger(result)).toBe(true)
  })

  it('should throw error for invalid inputs', () => {
    expect(() => mifflinStJeor(-80, 180, 30, 'M')).toThrow('Gewicht, Größe und Alter müssen positive Werte sein')
    expect(() => mifflinStJeor(80, -180, 30, 'M')).toThrow('Gewicht, Größe und Alter müssen positive Werte sein')
    expect(() => mifflinStJeor(80, 180, -30, 'M')).toThrow('Gewicht, Größe und Alter müssen positive Werte sein')
    expect(() => mifflinStJeor(80, 180, 30, 'X' as Sex)).toThrow('Geschlecht muss "M" oder "F" sein')
  })

  it('should handle edge cases', () => {
    // Sehr junger Mann
    const youngMale = mifflinStJeor(60, 170, 18, 'M')
    expect(youngMale).toBeGreaterThan(1500)
    
    // Ältere Frau
    const olderFemale = mifflinStJeor(55, 160, 65, 'F')
    expect(olderFemale).toBeGreaterThan(1000)
    expect(olderFemale).toBeLessThan(1500)
  })
})

describe('tdee', () => {
  it('should calculate TDEE correctly', () => {
    const bmr = 1800
    const activityFactor = 1.5
    const result = tdee(bmr, activityFactor)
    expect(result).toBe(2700) // 1800 * 1.5 = 2700
  })

  it('should round results to nearest integer', () => {
    const bmr = 1750
    const activityFactor = 1.375 // 1750 * 1.375 = 2406.25
    const result = tdee(bmr, activityFactor)
    expect(result).toBe(2406)
    expect(Number.isInteger(result)).toBe(true)
  })

  it('should throw error for invalid BMR', () => {
    expect(() => tdee(-1800, 1.5)).toThrow('BMR muss ein positiver Wert sein')
    expect(() => tdee(0, 1.5)).toThrow('BMR muss ein positiver Wert sein')
  })

  it('should throw error for extreme activity factors', () => {
    expect(() => tdee(1800, 0.5)).toThrow('Aktivitätsfaktor sollte zwischen 1.0 und 2.0 liegen')
    expect(() => tdee(1800, 2.5)).toThrow('Aktivitätsfaktor sollte zwischen 1.0 und 2.0 liegen')
  })

  it('should handle boundary activity factors', () => {
    const bmr = 1800
    expect(() => tdee(bmr, 1.0)).not.toThrow()
    expect(() => tdee(bmr, 2.0)).not.toThrow()
    expect(() => tdee(bmr, 1.2)).not.toThrow()
    expect(() => tdee(bmr, 1.9)).not.toThrow()
  })
})

describe('targetCalories', () => {
  it('should calculate target calories for maintenance', () => {
    const result = targetCalories(2500, 0)
    expect(result).toBe(2500)
  })

  it('should calculate target calories for bulk', () => {
    const result = targetCalories(2500, 300)
    expect(result).toBe(2800)
  })

  it('should calculate target calories for cut', () => {
    const result = targetCalories(2500, -500)
    expect(result).toBe(2000)
  })

  it('should round results to nearest integer', () => {
    const result = targetCalories(2500.7, 250.3)
    expect(Number.isInteger(result)).toBe(true)
  })

  it('should throw error for invalid TDEE', () => {
    expect(() => targetCalories(-2500, 0)).toThrow('TDEE muss ein positiver Wert sein')
  })

  it('should throw error when adjustment makes target too low', () => {
    expect(() => targetCalories(1500, -2000)).toThrow('Zielkalorien müssen positiv sein')
  })
})

describe('validateInput', () => {
  const validInput: CalcInput = {
    weightKg: 80,
    heightCm: 180,
    age: 30,
    sex: 'M',
    activityFactor: 1.5,
    kcalAdjust: 0,
    proteinPerKg: 2.0,
    fatPerKg: 1.0
  }

  it('should return no warnings for valid input', () => {
    const warnings = validateInput(validInput)
    expect(warnings).toHaveLength(0)
  })

  it('should warn about protein out of range', () => {
    const lowProtein = { ...validInput, proteinPerKg: 1.5 }
    const highProtein = { ...validInput, proteinPerKg: 3.0 }
    
    expect(validateInput(lowProtein)).toContainEqual(
      expect.objectContaining({ type: 'protein_out_of_range' })
    )
    expect(validateInput(highProtein)).toContainEqual(
      expect.objectContaining({ type: 'protein_out_of_range' })
    )
  })

  it('should warn about fat out of range', () => {
    const lowFat = { ...validInput, fatPerKg: 0.5 }
    const highFat = { ...validInput, fatPerKg: 1.5 }
    
    expect(validateInput(lowFat)).toContainEqual(
      expect.objectContaining({ type: 'fat_out_of_range' })
    )
    expect(validateInput(highFat)).toContainEqual(
      expect.objectContaining({ type: 'fat_out_of_range' })
    )
  })

  it('should warn about extreme activity factors', () => {
    const lowActivity = { ...validInput, activityFactor: 1.0 }
    const highActivity = { ...validInput, activityFactor: 2.0 }
    
    expect(validateInput(lowActivity)).toContainEqual(
      expect.objectContaining({ type: 'activity_factor_extreme' })
    )
    expect(validateInput(highActivity)).toContainEqual(
      expect.objectContaining({ type: 'activity_factor_extreme' })
    )
  })
})

describe('validateFatPercentage', () => {
  it('should return null for adequate fat percentage', () => {
    // 50g Fett = 450 kcal, bei 2000 kcal = 22.5%
    const result = validateFatPercentage(50, 2000)
    expect(result).toBeNull()
  })

  it('should warn about low fat percentage', () => {
    // 30g Fett = 270 kcal, bei 2000 kcal = 13.5%
    const result = validateFatPercentage(30, 2000)
    expect(result).toMatchObject({
      type: 'fat_too_low',
      message: expect.stringContaining('13.5%')
    })
  })
})

describe('macrosFromTargets', () => {
  const testInput: CalcInput = {
    weightKg: 80,
    heightCm: 180,
    age: 30,
    sex: 'M',
    activityFactor: 1.5,
    kcalAdjust: 0,
    proteinPerKg: 2.0,
    fatPerKg: 1.0
  }

  it('should calculate complete macro profile correctly', () => {
    const { result, warnings } = macrosFromTargets(testInput)
    
    // BMR für 80kg, 180cm, 30J Mann = 1780
    expect(result.bmr).toBe(1780)
    
    // TDEE = 1780 * 1.5 = 2670
    expect(result.tdee).toBe(2670)
    
    // Target = 2670 + 0 = 2670
    expect(result.targetKcal).toBe(2670)
    
    // Protein = 80 * 2.0 = 160g
    expect(result.proteinG).toBe(160)
    
    // Fett = 80 * 1.0 = 80g
    expect(result.fatG).toBe(80)
    
    // Protein kcal = 160 * 4 = 640
    // Fett kcal = 80 * 9 = 720
    // Verbleibend = 2670 - 640 - 720 = 1310
    // Carbs = 1310 / 4 = 327.5 → 328g
    expect(result.carbsG).toBe(328)
  })

  it('should round all gram values', () => {
    const input: CalcInput = {
      weightKg: 75.5,
      heightCm: 175,
      age: 28,
      sex: 'F',
      activityFactor: 1.375,
      kcalAdjust: 100,
      proteinPerKg: 2.1,
      fatPerKg: 0.9
    }
    
    const { result } = macrosFromTargets(input)
    
    expect(Number.isInteger(result.proteinG)).toBe(true)
    expect(Number.isInteger(result.fatG)).toBe(true)
    expect(Number.isInteger(result.carbsG)).toBe(true)
  })

  it('should handle edge case with very high protein/fat requirements', () => {
    const highMacroInput: CalcInput = {
      ...testInput,
      proteinPerKg: 2.5,   // This is exactly at the upper boundary
      fatPerKg: 1.2,       // This is exactly at the upper boundary  
      kcalAdjust: -800     // Aggressive cut
    }
    
    const { result, warnings } = macrosFromTargets(highMacroInput)
    
    // Should handle case where protein+fat might exceed target calories
    expect(result.carbsG).toBeGreaterThanOrEqual(0)
    // Since 2.5 and 1.2 are exactly at boundaries, they won't trigger warnings
    // Let's just check the calculation is stable
    expect(result.proteinG).toBe(200) // 80 * 2.5
    expect(result.fatG).toBe(96)      // 80 * 1.2
  })

  it('should provide warnings for problematic inputs', () => {
    const problematicInput: CalcInput = {
      ...testInput,
      proteinPerKg: 3.0, // Too high
      fatPerKg: 0.5,     // Too low
      activityFactor: 1.95 // High but valid
    }
    
    const { warnings } = macrosFromTargets(problematicInput)
    
    expect(warnings).toContainEqual(
      expect.objectContaining({ type: 'protein_out_of_range' })
    )
    expect(warnings).toContainEqual(
      expect.objectContaining({ type: 'fat_out_of_range' })
    )
    expect(warnings).toContainEqual(
      expect.objectContaining({ type: 'activity_factor_extreme' })
    )
  })
})

describe('getMacroPercentages', () => {
  it('should calculate macro percentages correctly', () => {
    const result = {
      bmr: 1800,
      tdee: 2700,
      targetKcal: 2700,
      proteinG: 150,  // 600 kcal = 22.2%
      fatG: 75,       // 675 kcal = 25%
      carbsG: 356     // 1424 kcal = 52.7%
    }
    
    const percentages = getMacroPercentages(result)
    
    expect(percentages.protein).toBe(22) // Gerundet
    expect(percentages.fat).toBe(25)
    expect(percentages.carbs).toBe(53)
    
    // Summe sollte etwa 100% ergeben (Rundungsfehler tolerieren)
    const total = percentages.protein + percentages.fat + percentages.carbs
    expect(total).toBeGreaterThanOrEqual(99)
    expect(total).toBeLessThanOrEqual(101)
  })
})

describe('Integration Tests', () => {
  it('should produce stable results for the same input', () => {
    const input: CalcInput = {
      weightKg: 70,
      heightCm: 170,
      age: 25,
      sex: 'F',
      activityFactor: 1.4,
      kcalAdjust: -200,
      proteinPerKg: 2.2,
      fatPerKg: 1.1
    }
    
    const result1 = macrosFromTargets(input)
    const result2 = macrosFromTargets(input)
    
    expect(result1.result).toEqual(result2.result)
    expect(result1.warnings).toEqual(result2.warnings)
  })

  it('should handle realistic scenarios', () => {
    // Szenario 1: Normalgewichtige Frau, Diät
    const femalecut: CalcInput = {
      weightKg: 60,
      heightCm: 165,
      age: 28,
      sex: 'F',
      activityFactor: 1.3,
      kcalAdjust: -300,
      proteinPerKg: 2.0,
      fatPerKg: 0.8
    }
    
    const { result: cutResult } = macrosFromTargets(femalecut)
    expect(cutResult.targetKcal).toBeLessThan(cutResult.tdee)
    expect(cutResult.proteinG).toBe(120) // 60 * 2.0
    expect(cutResult.fatG).toBe(48)      // 60 * 0.8
    
    // Szenario 2: Männlicher Athlet, Bulk
    const maleBulk: CalcInput = {
      weightKg: 85,
      heightCm: 185,
      age: 24,
      sex: 'M',
      activityFactor: 1.7,
      kcalAdjust: 400,
      proteinPerKg: 2.3,
      fatPerKg: 1.0
    }
    
    const { result: bulkResult } = macrosFromTargets(maleBulk)
    expect(bulkResult.targetKcal).toBeGreaterThan(bulkResult.tdee)
    expect(bulkResult.proteinG).toBe(195) // 85 * 2.3 = 195.5 → 195 (rounded)
    expect(bulkResult.fatG).toBe(85)      // 85 * 1.0
  })

  it('should maintain mathematical consistency', () => {
    const input: CalcInput = {
      weightKg: 75,
      heightCm: 175,
      age: 30,
      sex: 'M',
      activityFactor: 1.5,
      kcalAdjust: 0,
      proteinPerKg: 2.0,
      fatPerKg: 1.0
    }
    
    const { result } = macrosFromTargets(input)
    
    // Überprüfe, dass die Kalorienbilanz stimmt
    const proteinKcal = result.proteinG * 4
    const fatKcal = result.fatG * 9
    const carbsKcal = result.carbsG * 4
    const totalKcal = proteinKcal + fatKcal + carbsKcal
    
    // Toleriere kleine Rundungsfehler
    expect(Math.abs(totalKcal - result.targetKcal)).toBeLessThanOrEqual(4)
  })
})

// Seed-Datensatz Tests
describe('Seed Data Integration Tests', () => {
  // Seed-Datensatz: 80 kg, 180 cm, 30 J, M, AF 1.6, Ziel Lean Bulk +250, Protein 2.0 g/kg, Fett 0.9 g/kg
  const seedInput: CalcInput = {
    weightKg: 80,
    heightCm: 180,
    age: 30,
    sex: 'M',
    activityFactor: 1.6,
    kcalAdjust: 250, // Lean Bulk
    proteinPerKg: 2.0,
    fatPerKg: 0.9
  }

  it('should calculate BMR correctly for seed data', () => {
    const bmr = mifflinStJeor(seedInput.weightKg, seedInput.heightCm, seedInput.age, seedInput.sex)
    // BMR = 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    expect(bmr).toBe(1780)
  })

  it('should calculate TDEE correctly for seed data', () => {
    const bmr = mifflinStJeor(seedInput.weightKg, seedInput.heightCm, seedInput.age, seedInput.sex)
    const tdeeResult = tdee(bmr, seedInput.activityFactor)
    // TDEE = 1780 * 1.6 = 2848
    expect(tdeeResult).toBe(2848)
  })

  it('should calculate target calories correctly for seed data', () => {
    const bmr = mifflinStJeor(seedInput.weightKg, seedInput.heightCm, seedInput.age, seedInput.sex)
    const tdeeResult = tdee(bmr, seedInput.activityFactor)
    const target = targetCalories(tdeeResult, seedInput.kcalAdjust)
    // Target = 2848 + 250 = 3098
    expect(target).toBe(3098)
  })

  it('should calculate macros correctly for seed data', () => {
    const { result: macros } = macrosFromTargets(seedInput)

    // Expected calculations:
    // Protein: 80 * 2.0 = 160g = 640 kcal
    // Fat: 80 * 0.9 = 72g = 648 kcal
    // Carbs: (3098 - 640 - 648) / 4 = 1810 / 4 = 452.5g ≈ 453g

    expect(macros.proteinG).toBe(160)
    expect(macros.fatG).toBe(72)
    expect(macros.carbsG).toBe(453) // rounded
    
    // Verify calorie totals add up
    const totalCalculated = macros.proteinG * 4 + macros.fatG * 9 + macros.carbsG * 4
    expect(totalCalculated).toBeCloseTo(macros.targetKcal, -1) // Allow small rounding difference
  })

  it('should pass all validations for seed data', () => {
    const warnings = validateInput(seedInput)
    expect(warnings).toHaveLength(0)
  })

  it('should have fat percentage in healthy range for seed data', () => {
    const target = 3098 // calculated above
    const fatG = seedInput.weightKg * seedInput.fatPerKg // 72g
    const fatKcal = fatG * 9 // 648 kcal
    const fatPercentage = (fatKcal / target) * 100 // 648/3098 = 20.9%

    expect(fatPercentage).toBeGreaterThan(20)
    expect(fatPercentage).toBeLessThan(25)
    expect(fatPercentage).toBeCloseTo(20.9, 1)
  })

  it('should create complete calculation result for seed data', () => {
    const result = macrosFromTargets(seedInput)

    // Verify complete result structure
    expect(result.result.bmr).toBe(1780)
    expect(result.result.tdee).toBe(2848)
    expect(result.result.targetKcal).toBe(3098)
    expect(result.result.proteinG).toBe(160)
    expect(result.result.fatG).toBe(72)
    expect(result.result.carbsG).toBe(453)
    expect(result.warnings).toHaveLength(0)
  })
})

// Edge cases and boundary tests
describe('Edge Cases and Boundary Tests', () => {
  it('should handle minimum viable inputs', () => {
    // Sehr kleine Person
    const bmr = mifflinStJeor(40, 140, 18, 'F')
    expect(bmr).toBeGreaterThan(800)
    expect(bmr).toBeLessThan(1200)
  })

  it('should handle maximum realistic inputs', () => {
    // Sehr große/schwere Person
    const bmr = mifflinStJeor(150, 210, 25, 'M')
    expect(bmr).toBeGreaterThan(2500)
    expect(bmr).toBeLessThan(3500)
  })

  it('should handle extreme activity factors within bounds', () => {
    const baseBMR = 1800
    
    const sedentary = tdee(baseBMR, 1.2)
    expect(sedentary).toBe(2160)
    
    const extremelyActive = tdee(baseBMR, 2.0)
    expect(extremelyActive).toBe(3600)
  })

  it('should handle aggressive cuts safely', () => {
    const baseTDEE = 2500
    
    // Moderate cut
    const moderateCut = targetCalories(baseTDEE, -500)
    expect(moderateCut).toBe(2000)
    
    // Aggressive cut
    const aggressiveCut = targetCalories(baseTDEE, -1000)
    expect(aggressiveCut).toBe(1500)
  })

  it('should handle aggressive bulks', () => {
    const baseTDEE = 2200
    
    // Lean bulk
    const leanBulk = targetCalories(baseTDEE, 250)
    expect(leanBulk).toBe(2450)
    
    // Aggressive bulk
    const aggressiveBulk = targetCalories(baseTDEE, 500)
    expect(aggressiveBulk).toBe(2700)
  })

  it('should calculate macros for extreme body compositions', () => {
    // Sehr proteinreich
    const highProteinInput: CalcInput = {
      weightKg: 80,
      heightCm: 180,
      age: 30,
      sex: 'M',
      activityFactor: 1.5,
      kcalAdjust: 500,
      proteinPerKg: 3.0,
      fatPerKg: 0.8
    }
    const { result: highProtein } = macrosFromTargets(highProteinInput)
    expect(highProtein.proteinG).toBe(240) // 80 * 3.0
    expect(highProtein.fatG).toBe(64) // 80 * 0.8
    expect(highProtein.carbsG).toBeGreaterThan(200) // Should still have carbs left

    // Sehr fettreich
    const highFatInput: CalcInput = {
      weightKg: 80,
      heightCm: 180,
      age: 30,
      sex: 'M',
      activityFactor: 1.5,
      kcalAdjust: 500,
      proteinPerKg: 1.8,
      fatPerKg: 1.5
    }
    const { result: highFat } = macrosFromTargets(highFatInput)
    expect(highFat.proteinG).toBe(144) // 80 * 1.8
    expect(highFat.fatG).toBe(120) // 80 * 1.5
    expect(highFat.carbsG).toBeGreaterThan(150) // Should still have carbs left
  })
})

// Performance and precision tests
describe('Calculation Precision and Performance', () => {
  it('should maintain precision across multiple calculations', () => {
    const iterations = 100
    const bmrValues: number[] = []
    
    for (let i = 0; i < iterations; i++) {
      const weight = 70 + (i * 0.1) // 70.0 to 79.9 kg
      const bmr = mifflinStJeor(weight, 175, 28, 'M')
      bmrValues.push(bmr)
    }
    
    // Values should increase consistently
    for (let i = 1; i < bmrValues.length; i++) {
      expect(bmrValues[i]).toBeGreaterThan(bmrValues[i-1])
    }
    
    // All values should be integers
    bmrValues.forEach(bmr => {
      expect(Number.isInteger(bmr)).toBe(true)
    })
  })

  it('should handle floating point precision correctly', () => {
    // Test with values that might cause floating point issues
    const bmr1 = mifflinStJeor(70.333, 175.555, 28, 'M')
    const bmr2 = mifflinStJeor(70.334, 175.556, 28, 'M')
    
    expect(Number.isInteger(bmr1)).toBe(true)
    expect(Number.isInteger(bmr2)).toBe(true)
    expect(Math.abs(bmr2 - bmr1)).toBeLessThan(5) // Small difference
  })

  it('should be consistent with repeated calculations', () => {
    const input = { weight: 80, height: 180, age: 30, sex: 'M' as const }
    
    const bmr1 = mifflinStJeor(input.weight, input.height, input.age, input.sex)
    const bmr2 = mifflinStJeor(input.weight, input.height, input.age, input.sex)
    const bmr3 = mifflinStJeor(input.weight, input.height, input.age, input.sex)
    
    expect(bmr1).toBe(bmr2)
    expect(bmr2).toBe(bmr3)
  })
})
