import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { installPromptUtils } from './useInstallPrompt'

// Mock localStorage
const mockLocalStorage = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => mockLocalStorage.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorage.store[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete mockLocalStorage.store[key]
  }),
  clear: vi.fn(() => {
    mockLocalStorage.store = {}
  })
}

describe('InstallPrompt Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.clear()
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return correct storage key and duration', () => {
  expect(installPromptUtils.getStorageKey()).toBe('kernnutrition-install-dismissed')
    expect(installPromptUtils.getDismissDuration()).toBe(7 * 24 * 60 * 60 * 1000)
  })

  it('should set dismiss flag with current timestamp by default', () => {
    const beforeTimestamp = Date.now()
    installPromptUtils.setDismissFlag()
    const afterTimestamp = Date.now()
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
  'kernnutrition-install-dismissed',
      expect.stringContaining('"timestamp"')
    )

  const storedData = JSON.parse(mockLocalStorage.store['kernnutrition-install-dismissed'])
    expect(storedData.timestamp).toBeGreaterThanOrEqual(beforeTimestamp)
    expect(storedData.timestamp).toBeLessThanOrEqual(afterTimestamp)
    expect(storedData.version).toBe('1.0.0')
  })

  it('should set dismiss flag with custom timestamp', () => {
    const customTimestamp = 1234567890
    installPromptUtils.setDismissFlag(customTimestamp)
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
  'kernnutrition-install-dismissed',
      JSON.stringify({
        timestamp: customTimestamp,
        version: '1.0.0'
      })
    )
  })

  it('should clear dismiss flag', () => {
    // First set a flag
    installPromptUtils.setDismissFlag()
  expect(mockLocalStorage.store['kernnutrition-install-dismissed']).toBeTruthy()
    
    // Then clear it
    installPromptUtils.clearDismissFlag()
  expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('kernnutrition-install-dismissed')
  })

  it('should handle localStorage setItem errors gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new Error('Storage full')
    })

    // Should not throw
    expect(() => installPromptUtils.setDismissFlag()).not.toThrow()
    expect(consoleSpy).toHaveBeenCalledWith('Error setting dismiss flag:', expect.any(Error))
    
    consoleSpy.mockRestore()
  })

  it('should handle localStorage removeItem errors gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockLocalStorage.removeItem.mockImplementation(() => {
      throw new Error('Storage error')
    })

    // Should not throw
    expect(() => installPromptUtils.clearDismissFlag()).not.toThrow()
    expect(consoleSpy).toHaveBeenCalledWith('Error clearing dismiss flag:', expect.any(Error))
    
    consoleSpy.mockRestore()
  })
})

// Simple integration test simulation
describe('InstallPrompt Dismiss Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.clear()
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })
  })

  it('should not show prompt if dismissed within 7 days', () => {
    // Simulate user dismissing 3 days ago
    const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000)
    installPromptUtils.setDismissFlag(threeDaysAgo)

    // Simulate checking if should show prompt (from hook logic)
  const dismissedData = localStorage.getItem('kernnutrition-install-dismissed')
    expect(dismissedData).toBeTruthy()
    
    if (dismissedData) {
      const { timestamp } = JSON.parse(dismissedData)
      const timeSinceDismissed = Date.now() - timestamp
      const shouldShow = timeSinceDismissed >= installPromptUtils.getDismissDuration()
      
      expect(shouldShow).toBe(false) // Should not show within 7 days
    }
  })

  it('should show prompt if dismissed more than 7 days ago', () => {
    // Simulate user dismissing 8 days ago
    const eightDaysAgo = Date.now() - (8 * 24 * 60 * 60 * 1000)
    installPromptUtils.setDismissFlag(eightDaysAgo)

    // Simulate checking if should show prompt
  const dismissedData = localStorage.getItem('kernnutrition-install-dismissed')
    expect(dismissedData).toBeTruthy()
    
    if (dismissedData) {
      const { timestamp } = JSON.parse(dismissedData)
      const timeSinceDismissed = Date.now() - timestamp
      const shouldShow = timeSinceDismissed >= installPromptUtils.getDismissDuration()
      
      expect(shouldShow).toBe(true) // Should show after 7 days
    }
  })

  it('should show prompt if no dismiss flag exists', () => {
  const dismissedData = localStorage.getItem('kernnutrition-install-dismissed')
    expect(dismissedData).toBe(null)
    
    // No flag means user has never dismissed, should show
    const shouldShow = !dismissedData
    expect(shouldShow).toBe(true)
  })
})
