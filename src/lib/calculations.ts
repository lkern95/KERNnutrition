import { UserProfile } from '../store/appStore'
import { 
  mifflinStJeor, 
  tdee, 
  targetCalories, 
  macrosFromTargets,
  type Sex,
  type CalcInput 
} from './nutrition'

// Aktivitätsfaktoren für BMR-Berechnung
const ACTIVITY_FACTORS = {
  sedentary: 1.2,        // Sitzende Tätigkeit
  lightly_active: 1.375, // Leichte Aktivität 1-3 Tage/Woche
  moderately_active: 1.55, // Moderate Aktivität 3-5 Tage/Woche
  very_active: 1.725,    // Hohe Aktivität 6-7 Tage/Woche
  extra_active: 1.9      // Sehr hohe Aktivität, körperliche Arbeit
}

// Ziel-Faktoren für Kalorienbedarf
const GOAL_FACTORS = {
  lose: 0.8,     // 20% Kaloriendefizit
  maintain: 1.0, // Erhaltungskalorien
  gain: 1.2      // 20% Kalorienüberschuss
}

/**
 * Konvertiert UserProfile zu CalcInput für das nutrition Modul
 */
function profileToCalcInput(profile: UserProfile): CalcInput {
  const activityFactor = ACTIVITY_FACTORS[profile.activityLevel]
  const goalFactor = GOAL_FACTORS[profile.goal]
  
  // Berechne TDEE erstmal um Adjust zu bestimmen
  const bmr = mifflinStJeor(profile.weight, profile.height, profile.age, profile.gender === 'male' ? 'M' : 'F')
  const tdeeValue = tdee(bmr, activityFactor)
  const targetKcal = targetCalories(tdeeValue, 0) // Base target
  const adjustedTarget = Math.round(targetKcal * goalFactor)
  const kcalAdjust = adjustedTarget - targetKcal

  return {
    weightKg: profile.weight,
    heightCm: profile.height,
    age: profile.age,
    sex: profile.gender === 'male' ? 'M' : 'F',
    activityFactor,
    kcalAdjust,
    proteinPerKg: 2.0,  // Standard: 2.0g/kg
    fatPerKg: 1.0       // Standard: 1.0g/kg
  }
}

/**
 * Berechnet den Grundumsatz (BMR) nach Mifflin-St Jeor Formel
 * @deprecated Verwende stattdessen das nutrition Modul
 */
export function calculateBMR(profile: UserProfile): number {
  const sex: Sex = profile.gender === 'male' ? 'M' : 'F'
  return mifflinStJeor(profile.weight, profile.height, profile.age, sex)
}

/**
 * Berechnet den Gesamtumsatz (TDEE)
 * @deprecated Verwende stattdessen das nutrition Modul
 */
export function calculateTDEE(profile: UserProfile): number {
  const bmr = calculateBMR(profile)
  const activityFactor = ACTIVITY_FACTORS[profile.activityLevel]
  return tdee(bmr, activityFactor)
}

/**
 * Berechnet den Kalorienbedarf basierend auf dem Ziel
 * @deprecated Verwende stattdessen das nutrition Modul
 */
export function calculateTargetCalories(profile: UserProfile): number {
  const tdeeValue = calculateTDEE(profile)
  const goalFactor = GOAL_FACTORS[profile.goal]
  return Math.round(tdeeValue * goalFactor)
}

/**
 * Neue erweiterte Makronährstoff-Berechnung mit dem nutrition Modul
 */
export function calculateAdvancedMacros(profile: UserProfile) {
  const input = profileToCalcInput(profile)
  const { result, warnings } = macrosFromTargets(input)
  
  return {
    bmr: result.bmr,
    tdee: result.tdee,
    targetKcal: result.targetKcal,
    macros: {
      protein: result.proteinG,
      carbs: result.carbsG,
      fat: result.fatG
    },
    warnings
  }
}

/**
 * Berechnet die Makronährstoff-Verteilung
 * Standard: 30% Protein, 40% Kohlenhydrate, 30% Fett
 * @deprecated Verwende calculateAdvancedMacros für bessere Genauigkeit
 */
export function calculateMacros(targetCalories: number) {
  const protein = Math.round((targetCalories * 0.30) / 4) // 4 kcal pro g Protein
  const carbs = Math.round((targetCalories * 0.40) / 4)   // 4 kcal pro g Kohlenhydrate
  const fat = Math.round((targetCalories * 0.30) / 9)     // 9 kcal pro g Fett
  
  return { protein, carbs, fat }
}

/**
 * Berechnet die optimale Wasseraufnahme in Litern
 */
export function calculateWaterIntake(profile: UserProfile): number {
  const baseWater = profile.weight * 0.035 // 35ml pro kg Körpergewicht
  
  // Anpassung je nach Aktivitätslevel
  const activityMultiplier = {
    sedentary: 1.0,
    lightly_active: 1.1,
    moderately_active: 1.2,
    very_active: 1.3,
    extra_active: 1.4
  }
  
  return Math.round((baseWater * activityMultiplier[profile.activityLevel]) * 10) / 10
}

/**
 * BMI-Berechnung und Kategorisierung
 */
export function calculateBMI(weight: number, height: number): { value: number; category: string } {
  const bmi = weight / Math.pow(height / 100, 2)
  
  let category = ''
  if (bmi < 18.5) category = 'Untergewicht'
  else if (bmi < 25) category = 'Normalgewicht'
  else if (bmi < 30) category = 'Übergewicht'
  else category = 'Adipositas'
  
  return {
    value: Math.round(bmi * 10) / 10,
    category
  }
}

/**
 * Validiert die Eingabewerte für das Profil
 */
export function validateProfile(profile: Partial<UserProfile>): string[] {
  const errors: string[] = []
  
  if (!profile.name || profile.name.trim().length < 2) {
    errors.push('Name muss mindestens 2 Zeichen lang sein')
  }
  
  if (!profile.age || profile.age < 15 || profile.age > 100) {
    errors.push('Alter muss zwischen 15 und 100 Jahren liegen')
  }
  
  if (!profile.weight || profile.weight < 30 || profile.weight > 300) {
    errors.push('Gewicht muss zwischen 30 und 300 kg liegen')
  }
  
  if (!profile.height || profile.height < 100 || profile.height > 250) {
    errors.push('Größe muss zwischen 100 und 250 cm liegen')
  }
  
  return errors
}
