// Settings utility functions
import type { AppSettings } from '../pages/EinstellungenPage'

export const defaultSettings: AppSettings = {
  macroOverride: {
    enabled: false,
    protein: null,
    fat: null
  },
  units: 'metric',
  precision: {
    calories: 10,
    macros: 1,
    weight: 1
  },
  showActivityHelp: true,
  reminderFrequency: 'weekly',
  guardrails: {
    minFatPercentage: 20,
    aggressiveDeficitWarning: true,
    extremeCalorieWarning: true
  },
  notifications: {
    meals: false,
    water: false,
    progress: true
  },
  analytics: false,
  crashReports: false
}

export function getSettings(): AppSettings {
  const saved = localStorage.getItem('kerncare-settings')
  if (saved) {
    try {
      return { ...defaultSettings, ...JSON.parse(saved) }
    } catch (e) {
      console.error('Failed to parse settings:', e)
    }
  }
  return defaultSettings
}

export function saveSettings(settings: Partial<AppSettings>) {
  const current = getSettings()
  const updated = { ...current, ...settings }
  localStorage.setItem('kerncare-settings', JSON.stringify(updated))
}

export function roundValue(value: number, precision: number): number {
  if (precision < 1) {
    return Math.round(value / precision) * precision
  }
  return Math.round(value / precision) * precision
}

export function formatValue(value: number, type: 'calories' | 'macros' | 'weight'): number {
  const settings = getSettings()
  return roundValue(value, settings.precision[type])
}

export function convertWeight(kg: number, toImperial: boolean = false): number {
  const settings = getSettings()
  if (settings.units === 'imperial' || toImperial) {
    return kg * 2.20462 // kg to lbs
  }
  return kg
}

export function convertHeight(cm: number, toImperial: boolean = false): { feet: number; inches: number } | number {
  const settings = getSettings()
  if (settings.units === 'imperial' || toImperial) {
    const totalInches = cm / 2.54
    const feet = Math.floor(totalInches / 12)
    const inches = totalInches % 12
    return { feet, inches }
  }
  return cm
}

export function getActivityFactorRanges() {
  return {
    sedentary: { min: 1.2, max: 1.39, label: 'Sitzend', description: 'Büroarbeit, wenig Bewegung' },
    lightly_active: { min: 1.4, max: 1.59, label: 'Leicht aktiv', description: 'Gelegentliche Spaziergänge, leichte Hausarbeit' },
    moderately_active: { min: 1.6, max: 1.89, label: 'Mäßig aktiv', description: '3-4x Training/Woche, moderate Aktivität' },
    very_active: { min: 1.9, max: 2.19, label: 'Sehr aktiv', description: '5-6x Training/Woche, körperliche Arbeit' },
    extra_active: { min: 2.2, max: 2.5, label: 'Extrem aktiv', description: '2x täglich Training, Hochleistungssport' }
  }
}

export function validateCalorieGoal(calories: number): { isValid: boolean; warnings: string[] } {
  const settings = getSettings()
  const warnings: string[] = []
  let isValid = true

  if (settings.guardrails.extremeCalorieWarning) {
    if (calories < 1200) {
      warnings.push('Sehr niedrige Kalorienzufuhr (<1200 kcal) - bitte ärztlich abklären')
      isValid = false
    }
    if (calories > 4000) {
      warnings.push('Sehr hohe Kalorienzufuhr (>4000 kcal) - bitte überprüfen')
    }
  }

  return { isValid, warnings }
}

export function validateMacros(protein: number, fat: number, carbs: number, totalCalories: number): { 
  isValid: boolean; 
  warnings: string[] 
} {
  const settings = getSettings()
  const warnings: string[] = []
  let isValid = true

  const fatCalories = fat * 9
  const fatPercentage = (fatCalories / totalCalories) * 100

  if (settings.guardrails.minFatPercentage && fatPercentage < settings.guardrails.minFatPercentage) {
    warnings.push(`Fettanteil zu niedrig (${fatPercentage.toFixed(1)}% < ${settings.guardrails.minFatPercentage}%)`)
    isValid = false
  }

  return { isValid, warnings }
}
