import React, { useState } from 'react'
import { Calculator, User, Target, Activity } from 'lucide-react'
import { useAppStore, UserProfile } from '../store/appStore'
import { 
  calculateAdvancedMacros,
  calculateBMI, 
  calculateWaterIntake,
  validateProfile 
} from '../lib/calculations'

export function RechnerPage() {
  const { profile, setProfile } = useAppStore()
  const [formData, setFormData] = useState<Partial<UserProfile>>(
    profile || {
      name: '',
      age: 25,
      weight: 70,
      height: 170,
      activityLevel: 'moderately_active',
      goal: 'maintain',
      gender: 'female'
    }
  )
  const [errors, setErrors] = useState<string[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationErrors = validateProfile(formData)
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }
    
    setProfile(formData as UserProfile)
    setErrors([])
  }

  const handleInputChange = (field: keyof UserProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Berechnungen für die Anzeige
  const results = profile ? (() => {
    const advanced = calculateAdvancedMacros(profile)
    return {
      targetCalories: advanced.targetKcal,
      macros: advanced.macros,
      bmi: calculateBMI(profile.weight, profile.height),
      waterIntake: calculateWaterIntake(profile),
      warnings: advanced.warnings
    }
  })() : null

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24">
      <div className="text-center mb-6">
        <Calculator className="w-12 h-12 text-accent mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-text mb-2">Makronährstoff-Rechner</h1>
        <p className="text-text/70">
          Berechne deinen individuellen Kalorienbedarf und die optimale Nährstoffverteilung
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Eingabeformular */}
        <div className="container-card p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-accent" />
            Deine Daten
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <ul className="text-red-400 text-sm space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text mb-1">
                Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full p-3 rounded-lg bg-text/5 border border-text/10 text-text focus:ring-2 focus:ring-accent/50 focus:border-accent/50"
                placeholder="Dein Name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="age" className="block text-sm font-medium text-text mb-1">
                  Alter (Jahre)
                </label>
                <input
                  type="number"
                  id="age"
                  value={formData.age || ''}
                  onChange={(e) => handleInputChange('age', parseInt(e.target.value))}
                  className="w-full p-3 rounded-lg bg-text/5 border border-text/10 text-text focus:ring-2 focus:ring-accent/50 focus:border-accent/50"
                  min="15"
                  max="100"
                />
              </div>
              
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-text mb-1">
                  Geschlecht
                </label>
                <select
                  id="gender"
                  value={formData.gender || 'female'}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className="w-full p-3 rounded-lg bg-text/5 border border-text/10 text-text focus:ring-2 focus:ring-accent/50 focus:border-accent/50"
                >
                  <option value="female">Weiblich</option>
                  <option value="male">Männlich</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="weight" className="block text-sm font-medium text-text mb-1">
                  Gewicht (kg)
                </label>
                <input
                  type="number"
                  id="weight"
                  value={formData.weight || ''}
                  onChange={(e) => handleInputChange('weight', parseFloat(e.target.value))}
                  className="w-full p-3 rounded-lg bg-text/5 border border-text/10 text-text focus:ring-2 focus:ring-accent/50 focus:border-accent/50"
                  min="30"
                  max="300"
                  step="0.1"
                />
              </div>
              
              <div>
                <label htmlFor="height" className="block text-sm font-medium text-text mb-1">
                  Größe (cm)
                </label>
                <input
                  type="number"
                  id="height"
                  value={formData.height || ''}
                  onChange={(e) => handleInputChange('height', parseInt(e.target.value))}
                  className="w-full p-3 rounded-lg bg-text/5 border border-text/10 text-text focus:ring-2 focus:ring-accent/50 focus:border-accent/50"
                  min="100"
                  max="250"
                />
              </div>
            </div>

            <div>
              <label htmlFor="activityLevel" className="block text-sm font-medium text-text mb-1">
                Aktivitätslevel
              </label>
              <select
                id="activityLevel"
                value={formData.activityLevel || 'moderately_active'}
                onChange={(e) => handleInputChange('activityLevel', e.target.value)}
                className="w-full p-3 rounded-lg bg-text/5 border border-text/10 text-text focus:ring-2 focus:ring-accent/50 focus:border-accent/50"
              >
                <option value="sedentary">Sitzend (wenig/keine Bewegung)</option>
                <option value="lightly_active">Leicht aktiv (1-3 Tage/Woche)</option>
                <option value="moderately_active">Moderat aktiv (3-5 Tage/Woche)</option>
                <option value="very_active">Sehr aktiv (6-7 Tage/Woche)</option>
                <option value="extra_active">Extrem aktiv (2x täglich)</option>
              </select>
            </div>

            <div>
              <label htmlFor="goal" className="block text-sm font-medium text-text mb-1">
                Dein Ziel
              </label>
              <select
                id="goal"
                value={formData.goal || 'maintain'}
                onChange={(e) => handleInputChange('goal', e.target.value)}
                className="w-full p-3 rounded-lg bg-text/5 border border-text/10 text-text focus:ring-2 focus:ring-accent/50 focus:border-accent/50"
              >
                <option value="lose">Abnehmen</option>
                <option value="maintain">Gewicht halten</option>
                <option value="gain">Zunehmen</option>
              </select>
            </div>

            <button type="submit" className="w-full primary-button">
              Berechnen
            </button>
          </form>
        </div>

        {/* Ergebnisse */}
        {results && (
          <div className="container-card p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-accent" />
              Deine Empfehlungen
            </h2>
            
            {/* Warnungen anzeigen */}
            {results.warnings && results.warnings.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
                <h3 className="font-medium text-amber-300 mb-2">Hinweise:</h3>
                <ul className="text-amber-200 text-sm space-y-1">
                  {results.warnings.map((warning, index) => (
                    <li key={index}>• {warning.message}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="bg-accent/10 rounded-lg p-4">
                <h3 className="font-semibold text-accent mb-2">Täglicher Kalorienbedarf</h3>
                <p className="text-2xl font-bold text-text">{results.targetCalories} kcal</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-text/5 rounded-lg p-3 text-center">
                  <p className="text-text/70 text-sm">Protein</p>
                  <p className="font-bold text-text">{results.macros.protein}g</p>
                </div>
                <div className="bg-text/5 rounded-lg p-3 text-center">
                  <p className="text-text/70 text-sm">Kohlenhydrate</p>
                  <p className="font-bold text-text">{results.macros.carbs}g</p>
                </div>
                <div className="bg-text/5 rounded-lg p-3 text-center">
                  <p className="text-text/70 text-sm">Fett</p>
                  <p className="font-bold text-text">{results.macros.fat}g</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-text/5 rounded-lg p-3">
                  <p className="text-text/70 text-sm">BMI</p>
                  <p className="font-bold text-text">{results.bmi.value}</p>
                  <p className="text-xs text-text/60">{results.bmi.category}</p>
                </div>
                <div className="bg-text/5 rounded-lg p-3">
                  <p className="text-text/70 text-sm">Wasserbedarf</p>
                  <p className="font-bold text-text">{results.waterIntake}L</p>
                  <p className="text-xs text-text/60">pro Tag</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
