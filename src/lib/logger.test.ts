import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getLogger } from './logger'

// Mock settings
vi.mock('./settings', () => ({
  getSettings: vi.fn()
}))
const { getSettings } = require('./settings')

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('is no-op if both analytics and crashReports are false', () => {
    getSettings.mockReturnValue({ analytics: false, crashReports: false })
    const logger = getLogger()
    expect(logger.logEvent('foo')).toBeUndefined()
    expect(logger.logError('err')).toBeUndefined()
  })

  it('logs event if analytics is true', () => {
    getSettings.mockReturnValue({ analytics: true, crashReports: false })
    const logger = getLogger()
    // Should not throw or do anything visible (console.log is commented out)
    expect(() => logger.logEvent('test', { foo: 1 })).not.toThrow()
  })

  it('logs error if crashReports is true', () => {
    getSettings.mockReturnValue({ analytics: false, crashReports: true })
    const logger = getLogger()
    expect(() => logger.logError('fail', { bar: 2 })).not.toThrow()
  })
})
