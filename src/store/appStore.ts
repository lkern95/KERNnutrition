import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface UserProfile {
  name: string
  age: number
  weight: number
  height: number
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active'
  goal: 'maintain' | 'lose' | 'gain'
  gender: 'male' | 'female'
}

export interface DailyIntake {
  calories: number
  protein: number
  carbs: number
  fat: number
  date: string
}

export interface CheckinEntry {
  id: string
  date: string
  weight: number
  bodyFat?: number
  waist?: number
  trainingDays?: number
  sleep?: number // 1-5
  stress?: number // 1-5
  notes?: string
}

export interface AppSettings {
  // Macro overrides
  macroOverride: {
    enabled: boolean
    protein: number | null
    fat: number | null
  }
  
  // Units and precision
  units: 'metric' | 'imperial'
  precision: {
    calories: number
    macros: number
    weight: number
  }
  
  // Activity factor help
  showActivityHelp: boolean
  reminderFrequency: 'weekly' | 'biweekly' | 'monthly' | 'never'
  
  // Guardrails
  guardrails: {
    minFatPercentage: number
    aggressiveDeficitWarning: boolean
    extremeCalorieWarning: boolean
  }
  
  // Notifications
  notifications: {
    meals: boolean
    water: boolean
    progress: boolean
  }
  
  // Privacy
  analytics: boolean
  crashReports: boolean
}

export interface AppState {
  // User profile
  profile: UserProfile | null
  setProfile: (profile: UserProfile) => void
  
  // Check-in tracking
  checkins: CheckinEntry[]
  addCheckin: (checkin: CheckinEntry) => void
  updateCheckin: (date: string, checkin: Partial<CheckinEntry>) => void
  
  // Daily intake tracking
  dailyIntakes: DailyIntake[]
  addDailyIntake: (intake: DailyIntake) => void
  updateDailyIntake: (date: string, intake: Partial<DailyIntake>) => void
  
  // App settings
  isOnboarded: boolean
  setOnboarded: (value: boolean) => void
  
  // UI state
  activeTab: string
  setActiveTab: (tab: string) => void
  
  // Settings (loaded separately from localStorage)
  getSettings: () => AppSettings
}

const defaultSettings: AppSettings = {
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

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      profile: null,
      checkins: [],
      dailyIntakes: [],
      isOnboarded: false,
      activeTab: 'rechner',
      
      // Actions
      setProfile: (profile) => set({ profile }),
      
      addCheckin: (checkin) => set((state) => ({
        checkins: [...state.checkins, checkin]
      })),
      
      updateCheckin: (date, checkin) => set((state) => ({
        checkins: state.checkins.map(entry => 
          entry.date === date 
            ? { ...entry, ...checkin }
            : entry
        )
      })),
      
      addDailyIntake: (intake) => set((state) => ({
        dailyIntakes: [...state.dailyIntakes, intake]
      })),
      
      updateDailyIntake: (date, intake) => set((state) => ({
        dailyIntakes: state.dailyIntakes.map(daily => 
          daily.date === date 
            ? { ...daily, ...intake }
            : daily
        )
      })),
      
      setOnboarded: (value) => set({ isOnboarded: value }),
      
      setActiveTab: (tab) => set({ activeTab: tab }),
      
      getSettings: () => {
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
    }),
    {
      name: 'macrocal-storage',
      // Nur wichtige Daten persistieren
      partialize: (state) => ({
        profile: state.profile,
        checkins: state.checkins,
        dailyIntakes: state.dailyIntakes,
        isOnboarded: state.isOnboarded,
      }),
    }
  )
)
