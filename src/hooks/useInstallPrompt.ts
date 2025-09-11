// ...existing code up to the first export function useInstallPrompt...
import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const STORAGE_KEY = 'kernnutrition-install-dismissed'
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstallable, setIsInstallable] = useState(false)

  // Check if user has previously dismissed the prompt
  const checkDismissStatus = (): boolean => {
    try {
      const dismissedData = localStorage.getItem(STORAGE_KEY)
      if (dismissedData) {
        const { timestamp } = JSON.parse(dismissedData)
        const now = Date.now()
        const timeSinceDismissed = now - timestamp
        
        // If less than 7 days have passed, don't show prompt
        if (timeSinceDismissed < DISMISS_DURATION) {
          return false
        } else {
          // More than 7 days have passed, remove the flag
          localStorage.removeItem(STORAGE_KEY)
        }
      }
      return true
    } catch (error) {
      console.warn('Error checking install prompt dismiss status:', error)
      return true
    }
  }

  const markAsDismissed = (): void => {
    try {
      const dismissData = {
        timestamp: Date.now(),
        version: '1.0.0' // Can be updated when SW version changes
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissData))
    } catch (error) {
      console.warn('Error saving install prompt dismiss status:', error)
    }
  }

  const handleInstall = async (): Promise<void> => {
    if (deferredPrompt) {
      try {
        // Show the installation dialog
        await deferredPrompt.prompt()

        // Wait for user choice
        const { outcome } = await deferredPrompt.userChoice
        
        if (outcome === 'accepted') {
          console.log('User accepted the install prompt')
          markAsDismissed()
        }
      } catch (error) {
        console.error('Error during installation:', error)
      }
    }
    
    // Reset state
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = (): void => {
    markAsDismissed()
    setShowPrompt(false)
    setDeferredPrompt(null)
  }

  useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      // Prevent automatic display
      e.preventDefault()
      
      setIsInstallable(true)
      
      // Check if we should show the prompt
      if (checkDismissStatus()) {
        // Store the event for later
        setDeferredPrompt(e)
        setShowPrompt(true)
      }
    }

    // Check for iOS Safari (doesn't support beforeinstallprompt)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    
    if (isIOS && !isStandalone && checkDismissStatus()) {
      // Show custom iOS install prompt after a delay
      setTimeout(() => {
        setIsInstallable(true)
        setShowPrompt(true)
      }, 2000)
    }

    window.addEventListener('beforeinstallprompt', handler as EventListener)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler as EventListener)
    }
  }, [])

  return {
    showPrompt,
    isInstallable,
    handleInstall,
    handleDismiss,
    canInstall: !!deferredPrompt
  }
}

// Utility functions for testing
export const installPromptUtils = {
  getStorageKey: () => STORAGE_KEY,
  getDismissDuration: () => DISMISS_DURATION,
  clearDismissFlag: () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.warn('Error clearing dismiss flag:', error)
    }
  },
  setDismissFlag: (customTimestamp?: number) => {
    try {
      const dismissData = {
        timestamp: customTimestamp || Date.now(),
        version: '1.0.0'
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissData))
    } catch (error) {
      console.warn('Error setting dismiss flag:', error)
    }
  }
}
