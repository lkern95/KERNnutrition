import React, { lazy, Suspense } from 'react'
import { useAppStore } from './store/appStore'
import { BottomNavigation } from './components/BottomNavigation'
import { InstallPrompt } from './components/InstallPrompt'
import { OfflineIndicator } from './components/OfflineIndicator'

// Lazy load pages for better performance
const RechnerPage = lazy(() => import('./pages/RechnerPage').then(module => ({ default: module.RechnerPage })))
const PlanerPage = lazy(() => import('./pages/PlanerPage').then(module => ({ default: module.PlanerPage })))
const CheckinPage = lazy(() => import('./pages/CheckinPageComponent').then(module => ({ default: module.default ?? module.CheckinPage })))
const EinstellungenPage = lazy(() => import('./pages/EinstellungenPage').then(module => ({ default: module.EinstellungenPage })))
const InfoPage = lazy(() => import('./pages/InfoPage').then(module => ({ default: module.InfoPage })))

const pages = {
  rechner: RechnerPage,
  planer: PlanerPage,
  checkin: CheckinPage,
  einstellungen: EinstellungenPage,
  info: InfoPage
}

// Loading component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin"></div>
        <p className="text-text/60 text-sm">Lade...</p>
      </div>
    </div>
  )
}

function App() {
  const { activeTab } = useAppStore()
  const CurrentPage = pages[activeTab] || pages.rechner

  return (
    <div className="min-h-screen bg-background">
      {/* PWA Install Prompt */}
      <InstallPrompt />
      
      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* Hauptinhalt */}
      <main className="pb-20">
        <Suspense fallback={<PageLoader />}>
          <CurrentPage />
        </Suspense>
      </main>

      {/* Navigation */}
      <BottomNavigation />
    </div>
  )
}

export default App
