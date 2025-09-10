// logger.ts: Lokaler Logger für Analytics/Crash-Events (no-op bei deaktiviertem Setting)
import { getSettings } from './settings'

export interface Logger {
  logEvent: (event: string, data?: Record<string, any>) => void
  logError: (error: Error | string, info?: Record<string, any>) => void
}

class LocalLogger implements Logger {
  logEvent(event: string, data?: Record<string, any>) {
    // Nur loggen, wenn Analytics aktiviert
    if (getSettings().analytics) {
      // Lokal loggen (z.B. in localStorage oder nur für Debug)
      // Hier: Nur Konsole, keine Übertragung
      // console.log('[Analytics]', event, data)
    }
  }
  logError(error: Error | string, info?: Record<string, any>) {
    if (getSettings().crashReports) {
      // console.log('[CrashReport]', error, info)
    }
  }
}

class NoopLogger implements Logger {
  logEvent() {}
  logError() {}
}

export function getLogger(): Logger {
  const settings = getSettings()
  if (!settings.analytics && !settings.crashReports) return new NoopLogger()
  return new LocalLogger()
}
