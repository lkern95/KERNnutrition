import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  getSettings, 
  saveSettings, 
  roundValue, 
  formatValue, 
  convertWeight, 
  convertHeight,
  getActivityFactorRanges,
  validateCalorieGoal,
  validateMacros
} from './settings'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('Settings Utilities', () => {
  beforeEach(() => {
    // Clear all mocks
    localStorageMock.getItem.mockReset()
    localStorageMock.setItem.mockReset()
    localStorageMock.removeItem.mockReset()
  })

  describe('getSettings', () => {
    it('should return default settings when localStorage is empty', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const settings = getSettings()
      
      expect(settings.units).toBe('metric')
      expect(settings.precision.calories).toBe(10)
      expect(settings.macroOverride.enabled).toBe(false)
      expect(settings.guardrails.minFatPercentage).toBe(20)
    })

    it('should merge saved settings with defaults', () => {
      const savedSettings = {
        units: 'imperial',
        precision: { calories: 25, macros: 1, weight: 1 } // Include all precision fields
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedSettings))
      
      const settings = getSettings()
      
      expect(settings.units).toBe('imperial')
      expect(settings.precision.calories).toBe(25)
      expect(settings.precision.macros).toBe(1) // default value
    })

    it('should handle invalid JSON gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json')
      
      const settings = getSettings()
      
      expect(settings.units).toBe('metric') // defaults
    })
  })

  describe('saveSettings', () => {
    it('should save settings to localStorage', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const newSettings = { units: 'imperial' as const }
      saveSettings(newSettings)
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'kerncare-settings',
        expect.stringContaining('imperial')
      )
    })
  })

  describe('roundValue', () => {
    it('should round to specified precision', () => {
      expect(roundValue(2847, 10)).toBe(2850)
      expect(roundValue(2847, 25)).toBe(2850)
      expect(roundValue(2847, 5)).toBe(2845)
      expect(roundValue(2847, 1)).toBe(2847)
    })

    it('should handle decimal precision', () => {
      expect(roundValue(142.7, 0.1)).toBeCloseTo(142.7, 1)
      expect(roundValue(142.73, 0.1)).toBeCloseTo(142.7, 1)
    })
  })

  describe('formatValue', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        precision: {
          calories: 10,
          macros: 1,
          weight: 1
        }
      }))
    })

    it('should format calories according to settings', () => {
      expect(formatValue(2847, 'calories')).toBe(2850)
    })

    it('should format macros according to settings', () => {
      expect(formatValue(142.7, 'macros')).toBe(143)
    })

    it('should format weight according to settings', () => {
      expect(formatValue(75.3, 'weight')).toBe(75)
    })
  })

  describe('convertWeight', () => {
    it('should convert kg to lbs for imperial units', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        units: 'imperial'
      }))
      
      const result = convertWeight(75)
      expect(result).toBeCloseTo(165.35, 1) // 75 kg ≈ 165.35 lbs
    })

    it('should keep kg for metric units', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        units: 'metric'
      }))
      
      const result = convertWeight(75)
      expect(result).toBe(75)
    })

    it('should force conversion when toImperial is true', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        units: 'metric'
      }))
      
      const result = convertWeight(75, true)
      expect(result).toBeCloseTo(165.35, 1)
    })
  })

  describe('convertHeight', () => {
    it('should convert cm to feet/inches for imperial units', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        units: 'imperial'
      }))
      
      const result = convertHeight(180) as { feet: number; inches: number }
      expect(result.feet).toBe(5)
      expect(result.inches).toBeCloseTo(10.87, 1) // 180 cm ≈ 5'10.87"
    })

    it('should keep cm for metric units', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        units: 'metric'
      }))
      
      const result = convertHeight(180)
      expect(result).toBe(180)
    })
  })

  describe('getActivityFactorRanges', () => {
    it('should return correct activity factor ranges', () => {
      const ranges = getActivityFactorRanges()
      
      expect(ranges.sedentary.min).toBe(1.2)
      expect(ranges.sedentary.max).toBe(1.39)
      expect(ranges.very_active.min).toBe(1.9)
      expect(ranges.extra_active.max).toBe(2.5)
    })
  })

  describe('validateCalorieGoal', () => {
    it('should warn about very low calories', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        guardrails: { extremeCalorieWarning: true }
      }))
      
      const result = validateCalorieGoal(1000)
      
      expect(result.isValid).toBe(false)
      expect(result.warnings).toContain('Sehr niedrige Kalorienzufuhr (<1200 kcal) - bitte ärztlich abklären')
    })

    it('should warn about very high calories', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        guardrails: { extremeCalorieWarning: true }
      }))
      
      const result = validateCalorieGoal(4500)
      
      expect(result.isValid).toBe(true) // High calories don't invalidate
      expect(result.warnings).toContain('Sehr hohe Kalorienzufuhr (>4000 kcal) - bitte überprüfen')
    })

    it('should not warn when guardrails disabled', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        guardrails: { extremeCalorieWarning: false }
      }))
      
      const result = validateCalorieGoal(1000)
      
      expect(result.isValid).toBe(true)
      expect(result.warnings).toHaveLength(0)
    })
  })

  describe('validateMacros', () => {
    it('should warn about low fat percentage', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        guardrails: { minFatPercentage: 20 }
      }))
      
      // 40g fat in 2000 kcal = 18% fat
      const result = validateMacros(120, 40, 200, 2000)
      
      expect(result.isValid).toBe(false)
      expect(result.warnings[0]).toContain('Fettanteil zu niedrig')
      expect(result.warnings[0]).toContain('18.0%')
    })

    it('should pass with adequate fat percentage', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        guardrails: { minFatPercentage: 20 }
      }))
      
      // 60g fat in 2000 kcal = 27% fat
      const result = validateMacros(120, 60, 180, 2000)
      
      expect(result.isValid).toBe(true)
      expect(result.warnings).toHaveLength(0)
    })
  })
})
