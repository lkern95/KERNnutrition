import React, { useEffect } from 'react'
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
  const { activeTab, setActiveTab } = useAppStore();

  // Hash sync: set tab from hash on load/hashchange
  useEffect(() => {
    const setFromHash = () => {
      const tab = window.location.hash.replace('#', '');
      if (tab) setActiveTab(tab as any);
    };
    setFromHash();
    window.addEventListener('hashchange', setFromHash);
    return () => window.removeEventListener('hashchange', setFromHash);
  }, [setActiveTab]);

  // Set tab and update hash
  const setTab = (t: string) => {
    setActiveTab(t);
    window.location.hash = t;
  };

  const tabCount = tabs.length;
  const activeIdx = tabs.findIndex((t) => t.id === activeTab);

  return (
    <nav
      className="\n    fixed bottom-0 left-0 right-0 z-50\n    w-full max-w-[100vw] overflow-hidden\n    bg-[#292c2f] border-t border-[rgba(255,208,0,.15)]\n    bn-h pb-safe\n  "
    >
      <div className="h-full flex">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`\n            flex-1 min-w-0 h-full\n            flex flex-col items-center justify-center\n            gap-1 px-1\n            ${active ? 'text-[#ffd000]' : 'text-[#ececec]'}\n          `}
              aria-current={active ? 'page' : undefined}
            >
              {/* Icons konsistent ausrichten */}
              <tab.icon size={22} strokeWidth={2} />
              <span className="tab-label text-[11px] max-w-[72px]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
