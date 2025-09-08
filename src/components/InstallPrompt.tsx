import React, { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      // Verhindere die automatische Anzeige
      e.preventDefault()
      // Speichere das Event für später
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler as EventListener)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler as EventListener)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    // Zeige den Installationsdialog
    deferredPrompt.prompt()

    // Warte auf die Benutzerentscheidung
    const { outcome } = await deferredPrompt.userChoice

    // Zurücksetzen
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDeferredPrompt(null)
  }

  if (!showPrompt || !deferredPrompt) {
    return null
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="bg-background border border-accent/30 rounded-xl p-4 shadow-soft-lg">
        <div className="flex items-start gap-3">
          <div className="bg-accent/20 p-2 rounded-lg">
            <Download className="w-5 h-5 text-accent" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-text mb-1">
              App installieren
            </h3>
            <p className="text-text/70 text-sm mb-3">
              Installiere KERNcares auf deinem Gerät für schnelleren Zugriff
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="primary-button py-2 px-4 text-sm"
              >
                Installieren
              </button>
              <button
                onClick={handleDismiss}
                className="secondary-button py-2 px-4 text-sm"
              >
                Später
              </button>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="text-text/50 hover:text-text/70 p-1"
            aria-label="Schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
