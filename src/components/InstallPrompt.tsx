import React from 'react'
import { Download, X } from 'lucide-react'
import { useInstallPrompt } from '../hooks/useInstallPrompt'

export function InstallPrompt(props: { onClose?: () => void }) {
  const { showPrompt, handleInstall, canInstall } = useInstallPrompt()

  if (!showPrompt) {
    return null
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  // Use session-close only
  const onClose = props.onClose || (() => { sessionStorage.setItem('installPromptClosed', '1'); window.dispatchEvent(new Event('installPromptClosed')); })

  return (
    <div 
      className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto"
      role="dialog"
      aria-labelledby="install-prompt-title"
      aria-describedby="install-prompt-description"
    >
      <div className="bg-background border border-accent/30 rounded-xl p-4 shadow-soft-lg">
        <div className="flex items-start gap-3">
          <div className="bg-accent/20 p-2 rounded-lg" aria-hidden="true">
            <Download className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1">
            <h3 
              id="install-prompt-title"
              className="font-semibold text-text mb-1"
            >
              App installieren
            </h3>
            <p 
              id="install-prompt-description"
              className="text-text/70 text-sm mb-3"
            >
              {isIOS 
                ? 'Installiere KERNnutrition: Tippe auf "Teilen" und dann "Zum Home-Bildschirm"'
                : 'Installiere KERNnutrition auf deinem Gerät für schnelleren Zugriff'
              }
            </p>
            <div className="flex gap-2">
              {(canInstall && !isIOS) && (
                <button
                  onClick={handleInstall}
                  className="primary-button py-2 px-4 text-sm"
                  aria-describedby="install-prompt-description"
                >
                  Installieren
                </button>
              )}
              <button
                onClick={onClose}
                className="px-3 py-2 rounded-lg border"
                style={{ borderColor: 'rgba(255,208,0,.33)', color: '#ffd000' }}
              >
                Später
              </button>
            </div>
            <div className="text-xs text-text/50 mt-2">
              Der Hinweis erscheint erneut, bis die App installiert wurde.
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text/50 hover:text-text/70 p-1 transition-colors"
            aria-label="Installationsaufforderung schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
