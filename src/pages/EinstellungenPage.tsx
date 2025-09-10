import React, { useState, useEffect, useRef } from 'react'
import { 
  Settings, 
  Bell, 
  Database, 
  Palette, 
  Shield, 
  AlertTriangle, 
  Calendar, 
  Activity, 
  Users,
  Download,
  Upload,
  FileText,
  Info,
  Calculator,
  Target,
  Scale,
  BarChart3,
  Lock,
  Eye,
  HelpCircle,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react'
import { SpecialSituationsPage } from './SpecialSituationsPage'
import { useAppStore, wipeAllUserData } from '../store/appStore'
import { clearCalcResult } from '../lib/calcCache';
import { getLogger } from '../lib/logger'

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

export function EinstellungenPage() {
  const [activeView, setActiveView] = useState<'settings' | 'special'>('settings')
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [showActivityHelp, setShowActivityHelp] = useState(false)
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { profile, dailyIntakes } = useAppStore()

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('kerncare-settings')
    if (saved) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) })
      } catch (e) {
        console.error('Failed to parse settings:', e)
      }
    }
  }, [])

  // Save settings to localStorage
  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings }
    setSettings(updated)
    localStorage.setItem('kerncare-settings', JSON.stringify(updated))

    // Logger-Events für Privacy-Toggles
    const logger = getLogger()
    if (typeof newSettings.analytics === 'boolean') {
      logger.logEvent('toggle_analytics', { enabled: newSettings.analytics })
    }
    if (typeof newSettings.crashReports === 'boolean') {
      logger.logEvent('toggle_crashReports', { enabled: newSettings.crashReports })
    }
  }

  const handleExportData = () => {
    try {
      const data = {
        profile,
        dailyIntakes,
        settings,
        exportDate: new Date().toISOString(),
        version: '1.0'
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kerncare-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      setExportStatus('success')
      setTimeout(() => setExportStatus('idle'), 3000)
    } catch (error) {
      console.error('Export failed:', error)
      setExportStatus('error')
      setTimeout(() => setExportStatus('idle'), 3000)
    }
  }

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        
        // Validate data structure
        if (!data.profile && !data.dailyIntakes) {
          throw new Error('Invalid data format')
        }
        
        // Store imported data
        if (data.profile) {
          useAppStore.getState().setProfile(data.profile)
        }
        if (data.dailyIntakes && Array.isArray(data.dailyIntakes)) {
          // Clear existing and add imported
          localStorage.setItem('macrocal-storage', JSON.stringify({
            state: {
              profile: data.profile,
              dailyIntakes: data.dailyIntakes,
              isOnboarded: true
            },
            version: 0
          }))
        }
        if (data.settings) {
          updateSettings(data.settings)
        }
        
        setImportStatus('success')
        setTimeout(() => {
          setImportStatus('idle')
          window.location.reload() // Reload to apply imported data
        }, 2000)
        
      } catch (error) {
        console.error('Import failed:', error)
        setImportStatus('error')
        setTimeout(() => setImportStatus('idle'), 3000)
      }
    }
    reader.readAsText(file)
  }

  const handleClearAllData = async () => {
    const confirmed = window.confirm(
      'Alle Daten wirklich löschen? Diese Aktion ist IRREVERSIBEL und löscht alle lokalen Nutzerdaten unwiderruflich. Fortfahren?'
    );
    if (confirmed) {
      await wipeAllUserData();
      clearCalcResult();
      // Soft-Reload: Zustand neu initialisieren
      window.location.reload();
    }
  }

  if (activeView === 'special') {
    return <SpecialSituationsPage onBack={() => setActiveView('settings')} />
  }

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24">
      <div className="text-center mb-6">
        <Settings className="w-12 h-12 text-accent mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-text mb-2">Einstellungen</h1>
        <p className="text-text/70">
          Passe KERNnutrition nach deinen Wünschen an
        </p>
      </div>

      <div className="space-y-4">
        {/* Special Situations Quick Access */}
        <div className="container-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-accent" />
            Spezielle Situationen
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setActiveView('special')}
              className="p-4 bg-background rounded-xl border border-border hover:border-accent transition-colors text-left"
            >
              <Calendar className="w-5 h-5 text-accent mb-2" />
              <div className="font-medium text-text">Events & Feiern</div>
              <div className="text-sm text-text/70">Kalorienfenster planen</div>
            </button>
            
            <button
              onClick={() => setActiveView('special')}
              className="p-4 bg-background rounded-xl border border-border hover:border-accent transition-colors text-left"
            >
              <Activity className="w-5 h-5 text-accent mb-2" />
              <div className="font-medium text-text">Verletzung</div>
              <div className="text-sm text-text/70">Trainingspause anpassen</div>
            </button>
            
            <button
              onClick={() => setActiveView('special')}
              className="p-4 bg-background rounded-xl border border-border hover:border-accent transition-colors text-left"
            >
              <Users className="w-5 h-5 text-accent mb-2" />
              <div className="font-medium text-text">Reisen</div>
              <div className="text-sm text-text/70">Aktivität anpassen</div>
            </button>
          </div>
        </div>

        {/* Macro Manual Override */}
        <div className="container-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-accent" />
            Makro-Überschreibung
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="macro-override"
                checked={settings.macroOverride.enabled}
                onChange={(e) => updateSettings({
                  macroOverride: { ...settings.macroOverride, enabled: e.target.checked }
                })}
                className="w-5 h-5 text-accent"
              />
              <label htmlFor="macro-override" className="text-text">
                Manuelle Makro-Werte verwenden
              </label>
            </div>
            
            {settings.macroOverride.enabled && (
              <div className="ml-8 space-y-3 p-4 bg-background rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Protein (g/kg Körpergewicht)
                  </label>
                  <input
                    type="number"
                    min="0.8"
                    max="3.0"
                    step="0.1"
                    value={settings.macroOverride.protein || ''}
                    onChange={(e) => updateSettings({
                      macroOverride: { 
                        ...settings.macroOverride, 
                        protein: e.target.value ? parseFloat(e.target.value) : null 
                      }
                    })}
                    className="w-full px-3 py-2 bg-text/5 border border-text/10 rounded-lg text-text"
                    placeholder="z.B. 1.6"
                  />
                  <p className="text-xs text-text/60 mt-1">
                    Empfohlen: 1.2-2.2 g/kg je nach Ziel
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Fett (% der Kalorien)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="40"
                    step="1"
                    value={settings.macroOverride.fat || ''}
                    onChange={(e) => updateSettings({
                      macroOverride: { 
                        ...settings.macroOverride, 
                        fat: e.target.value ? parseFloat(e.target.value) : null 
                      }
                    })}
                    className="w-full px-3 py-2 bg-text/5 border border-text/10 rounded-lg text-text"
                    placeholder="z.B. 25"
                  />
                  <p className="text-xs text-text/60 mt-1">
                    Empfohlen: 20-35% (Kohlenhydrate werden automatisch berechnet)
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Units and Precision */}
        <div className="container-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Scale className="w-5 h-5 text-accent" />
            Einheiten & Genauigkeit
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Einheitensystem
              </label>
              <select 
                value={settings.units}
                onChange={(e) => updateSettings({ units: e.target.value as 'metric' | 'imperial' })}
                className="w-full px-3 py-2 bg-text/5 border border-text/10 rounded-lg text-text"
              >
                <option value="metric">Metrisch (kg, cm)</option>
                <option value="imperial">Imperial (lbs, ft/in)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Rundung Kalorien
              </label>
              <select 
                value={settings.precision.calories}
                onChange={(e) => updateSettings({ 
                  precision: { ...settings.precision, calories: parseInt(e.target.value) }
                })}
                className="w-full px-3 py-2 bg-text/5 border border-text/10 rounded-lg text-text"
              >
                <option value="1">Genau (2847 kcal)</option>
                <option value="5">5er-Schritte (2845 kcal)</option>
                <option value="10">10er-Schritte (2850 kcal)</option>
                <option value="25">25er-Schritte (2850 kcal)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Rundung Makros
              </label>
              <select 
                value={settings.precision.macros}
                onChange={(e) => updateSettings({ 
                  precision: { ...settings.precision, macros: parseInt(e.target.value) }
                })}
                className="w-full px-3 py-2 bg-text/5 border border-text/10 rounded-lg text-text"
              >
                <option value="0.1">Genau (142.7g)</option>
                <option value="1">Ganzzahlig (143g)</option>
                <option value="5">5er-Schritte (145g)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Activity Factor Help */}
        <div className="container-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-accent" />
            Aktivitätsfaktor-Hilfe
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="activity-help"
                checked={settings.showActivityHelp}
                onChange={(e) => updateSettings({ showActivityHelp: e.target.checked })}
                className="w-5 h-5 text-accent"
              />
              <label htmlFor="activity-help" className="text-text">
                PAL-Bereiche anzeigen
              </label>
            </div>
            
            <button
              onClick={() => setShowActivityHelp(!showActivityHelp)}
              className="secondary-button text-sm"
            >
              {showActivityHelp ? 'Hilfe ausblenden' : 'PAL-Bereiche anzeigen'}
            </button>
            
            {showActivityHelp && (
              <div className="p-4 bg-background rounded-lg text-sm space-y-2">
                <div><strong>Sitzend (1.2-1.4):</strong> Büroarbeit, wenig Bewegung</div>
                <div><strong>Leicht aktiv (1.4-1.6):</strong> Gelegentliche Spaziergänge, leichte Hausarbeit</div>
                <div><strong>Mäßig aktiv (1.6-1.9):</strong> 3-4x Training/Woche, moderate Aktivität</div>
                <div><strong>Sehr aktiv (1.9-2.2):</strong> 5-6x Training/Woche, körperliche Arbeit</div>
                <div><strong>Extrem aktiv (2.2+):</strong> 2x täglich Training, Hochleistungssport</div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Trend-Check Erinnerung
              </label>
              <select 
                value={settings.reminderFrequency}
                onChange={(e) => updateSettings({ reminderFrequency: e.target.value as any })}
                className="w-full px-3 py-2 bg-text/5 border border-text/10 rounded-lg text-text"
              >
                <option value="weekly">Wöchentlich</option>
                <option value="biweekly">Alle 2 Wochen</option>
                <option value="monthly">Monatlich</option>
                <option value="never">Nie</option>
              </select>
              <p className="text-xs text-text/60 mt-1">
                Erinnerung zur Überprüfung des Aktivitätsfaktors basierend auf Gewichtstrend
              </p>
            </div>
          </div>
        </div>

        {/* Guardrails */}
        <div className="container-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            Sicherheitsbegrenzungen
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Mindest-Fettanteil (%)
              </label>
              <input
                type="number"
                min="15"
                max="30"
                value={settings.guardrails.minFatPercentage}
                onChange={(e) => updateSettings({ 
                  guardrails: { 
                    ...settings.guardrails, 
                    minFatPercentage: parseInt(e.target.value) 
                  }
                })}
                className="w-full px-3 py-2 bg-text/5 border border-text/10 rounded-lg text-text"
              />
              <p className="text-xs text-text/60 mt-1">
                Warnung bei Unterschreitung (empfohlen: mind. 20%)
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="aggressive-deficit"
                  checked={settings.guardrails.aggressiveDeficitWarning}
                  onChange={(e) => updateSettings({ 
                    guardrails: { 
                      ...settings.guardrails, 
                      aggressiveDeficitWarning: e.target.checked 
                    }
                  })}
                  className="w-5 h-5 text-accent"
                />
                <label htmlFor="aggressive-deficit" className="text-text">
                  Warnung bei aggressivem Defizit (&gt;750 kcal)
                </label>
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="extreme-calories"
                  checked={settings.guardrails.extremeCalorieWarning}
                  onChange={(e) => updateSettings({ 
                    guardrails: { 
                      ...settings.guardrails, 
                      extremeCalorieWarning: e.target.checked 
                    }
                  })}
                  className="w-5 h-5 text-accent"
                />
                <label htmlFor="extreme-calories" className="text-text">
                  Warnung bei extremen Kalorienwerten (&lt;1200 oder &gt;4000)
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="container-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-accent" />
            Benachrichtigungen
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-text">Erinnerungen für Mahlzeiten</span>
              <input
                type="checkbox"
                checked={settings.notifications.meals}
                disabled
                title="Derzeit nicht verfügbar (kein zuverlässiges Scheduling im PWA-Offline-Modus)."
                className="w-5 h-5 text-accent"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text">Wassererinnerungen</span>
              <input
                type="checkbox"
                checked={settings.notifications.water}
                disabled
                title="Derzeit nicht verfügbar (kein zuverlässiges Scheduling im PWA-Offline-Modus)."
                className="w-5 h-5 text-accent"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text">Wöchentliche Fortschritte</span>
              <input
                type="checkbox"
                checked={settings.notifications.progress}
                disabled
                title="Derzeit nicht verfügbar (kein zuverlässiges Scheduling im PWA-Offline-Modus)."
                className="w-5 h-5 text-accent"
              />
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="container-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-accent" />
            Datenverwaltung
          </h2>
          
          <div className="space-y-3">
            <button 
              onClick={handleExportData}
              className="w-full secondary-button flex items-center justify-center gap-2"
              disabled={exportStatus === 'success'}
            >
              {exportStatus === 'success' ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Exportiert!
                </>
              ) : exportStatus === 'error' ? (
                <>
                  <AlertCircle className="w-4 h-4" />
                  Fehler beim Export
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Daten exportieren (JSON)
                </>
              )}
            </button>
            
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full secondary-button flex items-center justify-center gap-2"
                disabled={importStatus === 'success'}
              >
                {importStatus === 'success' ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Importiert! Wird neu geladen...
                  </>
                ) : importStatus === 'error' ? (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    Fehler beim Import
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Daten importieren (JSON)
                  </>
                )}
              </button>
            </div>
            
            <button 
              onClick={handleClearAllData}
              className="w-full bg-red-500/10 text-red-400 font-medium py-3 px-6 rounded-lg hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              Alle Daten löschen
            </button>
          </div>
          
          <div className="mt-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <p className="text-amber-200 text-sm flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Alle Daten werden nur lokal gespeichert. Export/Import funktioniert nur auf diesem Gerät.
            </p>
          </div>
        </div>

        {/* Privacy */}
        <div className="container-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-accent" />
            Datenschutz
          </h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div className="text-green-200">
                  <p className="font-medium mb-1">100% Lokale Datenspeicherung</p>
                  <p className="text-sm text-green-200/80">
                    Alle deine Daten bleiben auf deinem Gerät. Keine Cloud, keine Server, keine Übertragung.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-text">Anonyme Nutzungsstatistiken</span>
                <input
                  type="checkbox"
                  checked={settings.analytics}
                  onChange={(e) => updateSettings({ analytics: e.target.checked })}
                  className="w-5 h-5 text-accent"
                  title="Es werden keine externen Daten gesendet."
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text">Crash-Reports</span>
                <input
                  type="checkbox"
                  checked={settings.crashReports}
                  onChange={(e) => updateSettings({ crashReports: e.target.checked })}
                  className="w-5 h-5 text-accent"
                  title="Es werden keine externen Daten gesendet."
                />
              </div>
            </div>
            
            <div className="text-text/70 text-sm space-y-2">
              <p>• Keine Registrierung oder Anmeldung erforderlich</p>
              <p>• Keine Weitergabe an Dritte</p>
              <p>• Volle Kontrolle über deine Daten</p>
              <p>• Offline-Nutzung möglich</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
