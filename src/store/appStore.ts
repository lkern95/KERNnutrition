// Selektor für das Tagesziel (finale Zielkalorie aus dem Rechner)
export const selectDailyTarget = (s: AppState) => {
  // Finale Zielkalorie aus dem Rechner (UserProfile)
  return (s.profile && (s.profile.targetKcal ?? null)) || null;
};
// Persist-Key für Zustand/persist
export const PERSIST_KEY = 'macrocal-storage';

// Getter für den initialen Zustand (für Tests und Reset)
export function getInitialState() {
  return {
    profile: null as UserProfile | null,
    checkins: [] as CheckinEntry[],
    dailyIntakes: [] as DailyIntake[],
    isOnboarded: false,
    activeTab: 'rechner',
  };
}
// Für globale Timerverwaltung (falls genutzt)
declare global {
  interface Window {
    __KERN_TIMERS__?: number[];
  }
}
// Zentrale Funktion zum Löschen aller Userdaten
export async function wipeAllUserData() {
  // Zustand zurücksetzen (alle Slices)
  if (window?.location) {
    try {
      // Zustand zurücksetzen (Zustand Store)
      const store = useAppStore.getState();
      useAppStore.setState({
        profile: null,
        checkins: [],
        dailyIntakes: [],
        isOnboarded: false,
        activeTab: 'rechner',
      });
    } catch (e) {
      // ignore
    }
  }

  // LocalStorage & Settings löschen
  try {
    localStorage.removeItem('macrocal-storage');
    localStorage.removeItem('kerncare-settings');
    // Alle kernnutrition- und kernbalance-Keys entfernen
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('kernnutrition-') || key.startsWith('kernbalance-')) {
        localStorage.removeItem(key);
      }
    });
    // Zustand-Store Persistenz komplett löschen (Zustand persist)
    localStorage.removeItem('zustand-store');
    // Optional: Alles löschen, falls keine anderen Daten benötigt werden
    // localStorage.clear();
  } catch (e) {}

  // IndexedDB/IDB-Keyval löschen (falls genutzt)
  if (window.indexedDB) {
    try {
      const dbs = await window.indexedDB.databases?.();
      if (dbs) {
        for (const db of dbs) {
          if (db.name && (db.name.startsWith('kernnutrition') || db.name.startsWith('kernbalance'))) {
            window.indexedDB.deleteDatabase(db.name);
          }
        }
      }
    } catch (e) {}
  }

  // Service Worker Caches löschen
  if (window.caches) {
    try {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        if (name.startsWith('kernnutrition') || name.startsWith('kernbalance')) {
          await caches.delete(name);
        }
      }
    } catch (e) {}
  }

  // Alle Timer/Intervals clearen (falls global verwaltet)
  if (window.__KERN_TIMERS__) {
    try {
      window.__KERN_TIMERS__.forEach(clearTimeout);
      window.__KERN_TIMERS__ = [];
    } catch (e) {}
  }

  // Lokale Benachrichtigungen (Notification API, falls genutzt)
  if ('Notification' in window && 'getNotifications' in (window as any).navigator?.serviceWorker) {
    try {
      const reg = await (window as any).navigator.serviceWorker.getRegistration();
      if (reg && reg.getNotifications) {
        const notifs = await reg.getNotifications({ tag: undefined });
        notifs.forEach(n => n.close());
      }
    } catch (e) {}
  }

  // Onboarding/Feature-Flags zurücksetzen
  try {
    useAppStore.setState({ isOnboarded: false });
    // Weitere Feature-Flags ggf. hier zurücksetzen
  } catch (e) {}
}
// Migriert LocalStorage-Keys von kernbalance- auf kernnutrition-
export function migrateLegacyStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const legacyPrefix = 'kernbalance-';
  const newPrefix = 'kernnutrition-';
  const keys = Object.keys(localStorage).filter(k => k.startsWith(legacyPrefix));
  keys.forEach(oldKey => {
    const newKey = newPrefix + oldKey.substring(legacyPrefix.length);
    if (!localStorage.getItem(newKey)) {
      const value = localStorage.getItem(oldKey);
      localStorage.setItem(newKey, value ?? '');
    }
    localStorage.removeItem(oldKey);
  });
}
// Beim App-Start Migration ausführen
if (typeof window !== 'undefined') {
  migrateLegacyStorage();
}
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
  targetKcal?: number // Finale Zielkalorie aus dem Rechner
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
  updateCheckin: (id: string, patch: Partial<CheckinEntry>) => CheckinEntry | undefined
  deleteCheckin: (id: string) => boolean

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
      

      updateCheckin: (id, patch) => {
        let updated: CheckinEntry | undefined = undefined;
        set((state) => ({
          checkins: state.checkins.map(entry => {
            if (entry.id === id) {
              updated = { ...entry, ...patch };
              return updated;
            }
            return entry;
          })
        }));
        return updated;
      },

      deleteCheckin: (id) => {
        let existed = false;
        set((state) => {
          const before = state.checkins.length;
          const filtered = state.checkins.filter(entry => entry.id !== id);
          existed = before !== filtered.length;
          return { checkins: filtered };
        });
        return existed;
      },
      
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
