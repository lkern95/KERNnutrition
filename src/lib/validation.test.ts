import { describe, it, expect } from 'vitest'

// Validation types and functions
export interface ValidationWarning {
  type: 'fat_too_low' | 'protein_out_of_range' | 'fat_out_of_range' | 'activity_factor_extreme' | 'calories_too_low' | 'macro_ratio_warning'
  message: string
  severity: 'warning' | 'error'
}

export interface NutritionInput {
  weightKg: number
  heightCm: number
  age: number
  sex: 'M' | 'F'
  activityFactor: number
  targetCalories: number
  proteinPerKg: number
  fatPerKg: number
}

export function validateFatPercentage(targetCalories: number, fatG: number): ValidationWarning | null {
  const fatKcal = fatG * 9
  const fatPercentage = (fatKcal / targetCalories) * 100

  if (fatPercentage <= 20) {
    return {
      type: 'fat_too_low',
      message: `Fettanteil (${fatPercentage.toFixed(1)}%) ist unter 20%. Empfohlen: mindestens 20-25% für optimale Hormonproduktion.`,
      severity: 'warning'
    }
  }

  if (fatPercentage > 40) {
    return {
      type: 'fat_out_of_range',
      message: `Fettanteil (${fatPercentage.toFixed(1)}%) ist sehr hoch. Empfohlen: 20-35% der Gesamtkalorien.`,
      severity: 'warning'
    }
  }

  return null
}

export function validateProteinRange(weightKg: number, proteinPerKg: number): ValidationWarning | null {
  if (proteinPerKg < 1.6) {
    return {
      type: 'protein_out_of_range',
      message: `Protein (${proteinPerKg} g/kg) ist niedrig. Empfohlen: 1.8-2.2 g/kg für Muskelaufbau/erhalt.`,
      severity: 'warning'
    }
  }

  if (proteinPerKg > 3.0) {
    return {
      type: 'protein_out_of_range',
      message: `Protein (${proteinPerKg} g/kg) ist sehr hoch. Über 2.5 g/kg meist unnötig.`,
      severity: 'warning'
    }
  }

  return null
}

export function validateActivityFactor(activityFactor: number): ValidationWarning | null {
  if (activityFactor < 1.2) {
    return {
      type: 'activity_factor_extreme',
      message: `Aktivitätsfaktor (${activityFactor}) ist sehr niedrig. Minimum meist 1.2.`,
      severity: 'warning'
    }
  }

  if (activityFactor > 2.0) {
    return {
      type: 'activity_factor_extreme',
      message: `Aktivitätsfaktor (${activityFactor}) ist sehr hoch. Über 1.9 meist nur bei Leistungssportlern.`,
      severity: 'warning'
    }
  }

  return null
}

export function validateMinimumCalories(targetCalories: number, weightKg: number, sex: 'M' | 'F'): ValidationWarning | null {
  const minimumCalories = sex === 'M' ? 1200 : 1000
  const bmrEstimate = sex === 'M' ? weightKg * 22 : weightKg * 20

  if (targetCalories < minimumCalories) {
    return {
      type: 'calories_too_low',
      message: `Zielkalorien (${targetCalories}) sind unter ${minimumCalories} kcal. Dies kann gesundheitlich bedenklich sein.`,
      severity: 'error'
    }
  }

  if (targetCalories < bmrEstimate * 1.1) {
    return {
      type: 'calories_too_low',
      message: `Zielkalorien (${targetCalories}) sind sehr nah am Grundumsatz (~${Math.round(bmrEstimate)}). Zu aggressiv?`,
      severity: 'warning'
    }
  }

  return null
}

export function validateNutritionInput(input: NutritionInput): ValidationWarning[] {
  const warnings: ValidationWarning[] = []
  
  // Berechne Makros
  const proteinG = input.weightKg * input.proteinPerKg
  const fatG = input.weightKg * input.fatPerKg
  const proteinKcal = proteinG * 4
  const fatKcal = fatG * 9
  const carbsKcal = input.targetCalories - proteinKcal - fatKcal
  const carbsG = carbsKcal / 4

  // Validierungen
  const fatValidation = validateFatPercentage(input.targetCalories, fatG)
  if (fatValidation) warnings.push(fatValidation)

  const proteinValidation = validateProteinRange(input.weightKg, input.proteinPerKg)
  if (proteinValidation) warnings.push(proteinValidation)

  const activityValidation = validateActivityFactor(input.activityFactor)
  if (activityValidation) warnings.push(activityValidation)

  const calorieValidation = validateMinimumCalories(input.targetCalories, input.weightKg, input.sex)
  if (calorieValidation) warnings.push(calorieValidation)

  // Kohlenhydrate-Validierung
  if (carbsG < 0) {
    warnings.push({
      type: 'macro_ratio_warning',
      message: 'Protein + Fett übersteigen die Zielkalorien. Reduziere Protein oder Fett.',
      severity: 'error'
    })
  } else if (carbsG < 50) {
    warnings.push({
      type: 'macro_ratio_warning',
      message: `Kohlenhydrate (${Math.round(carbsG)}g) sind sehr niedrig. Kann Performance beeinträchtigen.`,
      severity: 'warning'
    })
  }

  return warnings
}

describe('Validation Functions', () => {
  // Seed-Datensatz: 80 kg, 180 cm, 30 J, M, AF 1.6, Ziel Lean Bulk +250, Protein 2.0 g/kg, Fett 0.9 g/kg
  const seedData: NutritionInput = {
    weightKg: 80,
    heightCm: 180,
    age: 30,
    sex: 'M',
    activityFactor: 1.6,
    targetCalories: 3030, // BMR ~1780 * 1.6 = 2848 + 250 = 3098, rounded to 3030 for example
    proteinPerKg: 2.0,
    fatPerKg: 0.9
  }

  describe('validateFatPercentage', () => {
    it('should warn when fat percentage is under 20%', () => {
      // 80kg * 0.5 g/kg = 40g * 9 = 360 kcal bei 2500 kcal = 14.4%
      const result = validateFatPercentage(2500, 40)
      
      expect(result).not.toBeNull()
      expect(result!.type).toBe('fat_too_low')
      expect(result!.severity).toBe('warning')
      expect(result!.message).toContain('14.4%')
      expect(result!.message).toContain('unter 20%')
    })

    it('should pass when fat percentage is in healthy range', () => {
      // 80kg * 0.9 g/kg = 72g * 9 = 648 kcal bei 3030 kcal = 21.4%
      const result = validateFatPercentage(3030, 72)
      expect(result).toBeNull()
    })

    it('should warn when fat percentage is too high', () => {
      // 100g * 9 = 900 kcal bei 2000 kcal = 45%
      const result = validateFatPercentage(2000, 100)
      
      expect(result).not.toBeNull()
      expect(result!.type).toBe('fat_out_of_range')
      expect(result!.message).toContain('45.0%')
      expect(result!.message).toContain('sehr hoch')
    })

    it('should handle edge cases correctly', () => {
      // Genau 20% - sollte Warnung geben
      const result1 = validateFatPercentage(2000, 44.44) // 44.44 * 9 = 400 kcal = 20%
      expect(result1).not.toBeNull()

      // Über 20% aber unter 40%
      const result2 = validateFatPercentage(2000, 50) // 50 * 9 = 450 kcal = 22.5%
      expect(result2).toBeNull()

      // Über 40% - sollte Warnung geben wegen zu hoch  
      const result3 = validateFatPercentage(2000, 90) // 90 * 9 = 810 kcal = 40.5%
      expect(result3).not.toBeNull()
      expect(result3!.type).toBe('fat_out_of_range')
    })
  })

  describe('validateProteinRange', () => {
    it('should warn when protein is too low', () => {
      const result = validateProteinRange(80, 1.5)
      
      expect(result).not.toBeNull()
      expect(result!.type).toBe('protein_out_of_range')
      expect(result!.message).toContain('1.5 g/kg')
      expect(result!.message).toContain('niedrig')
    })

    it('should pass when protein is in optimal range', () => {
      const result1 = validateProteinRange(80, 2.0)
      expect(result1).toBeNull()

      const result2 = validateProteinRange(80, 1.8)
      expect(result2).toBeNull()

      const result3 = validateProteinRange(80, 2.2)
      expect(result3).toBeNull()
    })

    it('should warn when protein is too high', () => {
      const result = validateProteinRange(80, 3.5)
      
      expect(result).not.toBeNull()
      expect(result!.type).toBe('protein_out_of_range')
      expect(result!.message).toContain('3.5 g/kg')
      expect(result!.message).toContain('sehr hoch')
    })
  })

  describe('validateActivityFactor', () => {
    it('should warn when activity factor is too low', () => {
      const result = validateActivityFactor(1.0)
      
      expect(result).not.toBeNull()
      expect(result!.type).toBe('activity_factor_extreme')
      expect(result!.message).toContain('1')
      expect(result!.message).toContain('sehr niedrig')
    })

    it('should pass when activity factor is in normal range', () => {
      const result1 = validateActivityFactor(1.4)
      expect(result1).toBeNull()

      const result2 = validateActivityFactor(1.6)
      expect(result2).toBeNull()

      const result3 = validateActivityFactor(1.8)
      expect(result3).toBeNull()
    })

    it('should warn when activity factor is too high', () => {
      const result = validateActivityFactor(2.2)
      
      expect(result).not.toBeNull()
      expect(result!.type).toBe('activity_factor_extreme')
      expect(result!.message).toContain('2.2')
      expect(result!.message).toContain('sehr hoch')
    })
  })

  describe('validateMinimumCalories', () => {
    it('should error when calories are below absolute minimum', () => {
      const result1 = validateMinimumCalories(1000, 80, 'M')
      expect(result1!.severity).toBe('error')
      expect(result1!.message).toContain('unter 1200 kcal')

      const result2 = validateMinimumCalories(800, 60, 'F')
      expect(result2!.severity).toBe('error')
      expect(result2!.message).toContain('unter 1000 kcal')
    })

    it('should warn when calories are too close to BMR', () => {
      // Männer: BMR estimate = 80 * 22 = 1760, 1.1 * 1760 = 1936
      const result1 = validateMinimumCalories(1800, 80, 'M')
      expect(result1!.severity).toBe('warning')
      expect(result1!.message).toContain('sehr nah am Grundumsatz')

      // Frauen: BMR estimate = 60 * 20 = 1200, 1.1 * 1200 = 1320
      const result2 = validateMinimumCalories(1250, 60, 'F')
      expect(result2!.severity).toBe('warning')
      expect(result2!.message).toContain('sehr nah am Grundumsatz')
    })

    it('should pass when calories are adequate', () => {
      const result1 = validateMinimumCalories(2500, 80, 'M')
      expect(result1).toBeNull()

      const result2 = validateMinimumCalories(1800, 60, 'F')
      expect(result2).toBeNull()
    })
  })

  describe('validateNutritionInput - Full Integration', () => {
    it('should validate seed data correctly', () => {
      const warnings = validateNutritionInput(seedData)
      
      // Seed data sollte keine Warnungen erzeugen
      expect(warnings).toHaveLength(0)
    })

    it('should detect multiple validation issues', () => {
      const problematicInput: NutritionInput = {
        weightKg: 80,
        heightCm: 180,
        age: 30,
        sex: 'M',
        activityFactor: 2.5, // zu hoch
        targetCalories: 1100, // zu niedrig
        proteinPerKg: 3.5, // zu hoch
        fatPerKg: 0.3 // zu niedrig (führt zu <20% Fett)
      }

      const warnings = validateNutritionInput(problematicInput)
      
      expect(warnings.length).toBeGreaterThan(2)
      expect(warnings.some(w => w.type === 'activity_factor_extreme')).toBe(true)
      expect(warnings.some(w => w.type === 'calories_too_low')).toBe(true)
      expect(warnings.some(w => w.type === 'protein_out_of_range')).toBe(true)
      expect(warnings.some(w => w.type === 'fat_too_low')).toBe(true)
    })

    it('should detect impossible macro combinations', () => {
      const impossibleInput: NutritionInput = {
        weightKg: 80,
        heightCm: 180,
        age: 30,
        sex: 'M',
        activityFactor: 1.6,
        targetCalories: 1500,
        proteinPerKg: 3.0, // 240g = 960 kcal
        fatPerKg: 1.5 // 120g = 1080 kcal
        // Total: 2040 kcal > 1500 target → negative carbs
      }

      const warnings = validateNutritionInput(impossibleInput)
      
      expect(warnings.some(w => w.type === 'macro_ratio_warning' && w.severity === 'error')).toBe(true)
      expect(warnings.some(w => w.message.includes('übersteigen die Zielkalorien'))).toBe(true)
    })

    it('should warn about very low carbs', () => {
      const lowCarbInput: NutritionInput = {
        weightKg: 80,
        heightCm: 180,
        age: 30,
        sex: 'M',
        activityFactor: 1.6,
        targetCalories: 1700, // Reduced to force low carbs
        proteinPerKg: 2.0, // 160g = 640 kcal
        fatPerKg: 1.2 // 96g = 864 kcal
        // Remaining: 196 kcal = 49g carbs - should trigger warning
      }

      const warnings = validateNutritionInput(lowCarbInput)
      
      expect(warnings.some(w => 
        w.type === 'macro_ratio_warning' && 
        w.message.includes('Kohlenhydrate') && 
        w.message.includes('sehr niedrig')
      )).toBe(true)
    })

    it('should calculate macros correctly for seed data', () => {
      // Manual calculation for verification
      const proteinG = seedData.weightKg * seedData.proteinPerKg // 80 * 2.0 = 160g
      const fatG = seedData.weightKg * seedData.fatPerKg // 80 * 0.9 = 72g
      const proteinKcal = proteinG * 4 // 160 * 4 = 640 kcal
      const fatKcal = fatG * 9 // 72 * 9 = 648 kcal
      const carbsKcal = seedData.targetCalories - proteinKcal - fatKcal // 3030 - 640 - 648 = 1742 kcal
      const carbsG = carbsKcal / 4 // 1742 / 4 = 435.5g
      const fatPercentage = (fatKcal / seedData.targetCalories) * 100 // 648/3030 = 21.4%

      // Diese Werte sollten alle im gültigen Bereich liegen
      expect(proteinG).toBe(160)
      expect(fatG).toBe(72)
      expect(carbsG).toBeCloseTo(435.5, 1)
      expect(fatPercentage).toBeCloseTo(21.4, 1)
      expect(fatPercentage).toBeGreaterThan(20)
      expect(fatPercentage).toBeLessThan(40)
    })
  })
})
