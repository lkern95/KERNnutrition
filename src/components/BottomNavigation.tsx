import React from 'react'
import { Calculator, Calendar, CheckCircle, Settings, Info, Gauge } from 'lucide-react'
import { useAppStore } from '../store/appStore'

const tabs = [
  {
    id: 'rechner',
    label: 'Rechner',
    icon: Calculator,
    ariaLabel: 'Makronährstoff-Rechner'
  },
  {
    id: 'checkin',
    label: 'Check-in',
    icon: CheckCircle,
    ariaLabel: 'Täglicher Check-in'
  },
  {
    id: 'planer',
    label: 'Planer',
    icon: Calendar,
    ariaLabel: 'Ernährungs-Planer'
  },
  {
    id: 'overview',
    label: 'Übersicht',
    icon: Gauge,
    ariaLabel: 'Übersichtsseite'
  },
  {
    id: 'supplements',
    label: 'Supplements',
    icon: Info, // Alternativ: ein passenderes Icon wählen
    ariaLabel: 'Supplement-Empfehlungen'
  },
  {
    id: 'info',
    label: 'Info',
    icon: Info,
    ariaLabel: 'App-Informationen (KERNnutrition)'
  },
  {
    id: 'einstellungen',
    label: 'Einstellungen',
    icon: Settings,
    ariaLabel: 'App-Einstellungen'
  }
]

export function BottomNavigation() {
  const { activeTab, setActiveTab } = useAppStore()

  const tabCount = tabs.length
  const activeIdx = tabs.findIndex((t) => t.id === activeTab)



  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-accent/20 px-0 py-0 safe-area-bottom z-50 shadow-[0_-2px_16px_0_rgba(0,0,0,0.04)]"
      role="navigation"
      aria-label="Haupt-Navigation"
    >
      <div className="relative flex justify-around max-w-md mx-auto h-16">
        {tabs.map((tab, idx) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={
                `group flex-1 min-w-0 flex flex-col items-center justify-center h-16 relative focus:outline-none transition-colors duration-200`
              }
              aria-label={tab.ariaLabel}
              aria-current={isActive ? 'page' : undefined}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <span
                className={
                  `flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 ease-out
                  ${isActive ? 'text-accent scale-110' : 'text-text/70 group-hover:text-accent/80 scale-100'}`
                }
              >
                <Icon
                  size={isActive ? 24 : 20}
                  className={`transition-all duration-200 ${isActive ? 'text-accent scale-110' : 'text-text/70 group-hover:text-accent/80 scale-100'}`}
                  aria-hidden="true"
                />
              </span>
              <span
                className={`text-xs font-medium mt-1 leading-[1.1rem] transition-all duration-200 ${isActive ? 'text-accent' : 'text-text/60 group-hover:text-accent/80'} ${isActive ? 'scale-105' : 'scale-100'}`}
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  width: '100%',
                  textAlign: 'center',
                  display: 'block',
                }}
                title={tab.label}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
