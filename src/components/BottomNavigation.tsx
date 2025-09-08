import React from 'react'
import { Calculator, Calendar, CheckCircle, Settings, Info } from 'lucide-react'
import { useAppStore } from '../store/appStore'

const tabs = [
  {
    id: 'rechner',
    label: 'Rechner',
    icon: Calculator,
    ariaLabel: 'Makronährstoff-Rechner'
  },
  {
    id: 'planer',
    label: 'Planer',
    icon: Calendar,
    ariaLabel: 'Ernährungs-Planer'
  },
  {
    id: 'checkin',
    label: 'Check-in',
    icon: CheckCircle,
    ariaLabel: 'Täglicher Check-in'
  },
  {
    id: 'einstellungen',
    label: 'Einstellungen',
    icon: Settings,
    ariaLabel: 'App-Einstellungen'
  },
  {
    id: 'info',
    label: 'Info',
    icon: Info,
    ariaLabel: 'App-Informationen'
  }
]

export function BottomNavigation() {
  const { activeTab, setActiveTab } = useAppStore()

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-background border-t border-accent/20 px-2 py-2 safe-area-bottom"
      role="navigation"
      aria-label="Haupt-Navigation"
    >
      <div className="flex justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-button ${isActive ? 'active' : ''}`}
              aria-label={tab.ariaLabel}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center
                transition-all duration-200
                ${isActive 
                  ? 'bg-accent shadow-soft' 
                  : 'bg-text/10'
                }
              `}>
                <Icon 
                  size={20} 
                  className={isActive ? 'text-icon' : 'text-text/70'}
                  aria-hidden="true"
                />
              </div>
              <span className={`
                text-xs font-medium mt-1 leading-tight
                ${isActive ? 'text-accent' : 'text-text/70'}
              `}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
