import { useInstallPrompt } from './hooks/useInstallPrompt';
import { InstallPrompt } from './components/InstallPrompt';
import React, { lazy, Suspense } from 'react';
import { useAppStore } from './store/appStore';
import { BottomNavigation } from './components/BottomNavigation';
import { OfflineIndicator } from './components/OfflineIndicator';
import UebersichtPage from './pages/UebersichtPage';
import './styles/slider.css';

const RechnerPage = lazy(() => import('./pages/RechnerPage').then(mod => ({ default: mod.RechnerPage })));
import PlanerPage from './pages/PlanerPage';
const CheckinPage = lazy(() => import('./pages/CheckinPageComponent'));
const EinstellungenPage = lazy(() => import('./pages/EinstellungenPage'));
const InfoPage = lazy(() => import('./pages/InfoPage'));
const SupplementsPage = lazy(() => import('./pages/SupplementsPage'));

const pages = {
  overview: UebersichtPage,
  supplements: SupplementsPage,
  rechner: RechnerPage,
  planer: PlanerPage,
  checkin: CheckinPage,
  einstellungen: EinstellungenPage,
  info: InfoPage
} as Record<string, React.ComponentType<any>>;

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin"></div>
        <p className="text-text/60 text-sm">Lade...</p>
      </div>
    </div>
  );
}

export default function App() {
  const { activeTab } = useAppStore();
  const CurrentPage = pages[activeTab] || pages.rechner;
    const { showPrompt, handleInstall, handleDismiss, canInstall } = useInstallPrompt();

  return (
    <>
      <InstallPrompt onClose={handleDismiss} />
      <div className="min-h-screen w-full px-3 pb-[calc(env(safe-area-inset-bottom)+80px)]">
        <OfflineIndicator />
        <div className="with-bottom-nav-pb">
          <main>
            <Suspense fallback={<PageLoader />}>
              <CurrentPage />
            </Suspense>
          </main>
        </div>
        <BottomNavigation />
      </div>
    </>
  );
}
