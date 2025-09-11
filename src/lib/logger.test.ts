import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getLogger } from './logger'
import * as settingsModule from './settings'
import { defaultSettings } from './settings'

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(settingsModule, 'getSettings')
  })

  it('is no-op if both analytics and crashReports are false', () => {
    (settingsModule.getSettings as any).mockReturnValue({ ...defaultSettings, analytics: false, crashReports: false })
    const logger = getLogger()
    expect(logger.logEvent('foo')).toBeUndefined()
    expect(logger.logError('err')).toBeUndefined()
  })

  it('logs event if analytics is true', () => {
    (settingsModule.getSettings as any).mockReturnValue({ ...defaultSettings, analytics: true, crashReports: false })
    const logger = getLogger()
    // Should not throw or do anything visible (console.log is commented out)
    expect(() => logger.logEvent('test', { foo: 1 })).not.toThrow()
  })

  it('logs error if crashReports is true', () => {
    (settingsModule.getSettings as any).mockReturnValue({ ...defaultSettings, analytics: false, crashReports: true })
    const logger = getLogger()
    expect(() => logger.logError('fail', { bar: 2 })).not.toThrow()
  })
})
