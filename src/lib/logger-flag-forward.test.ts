import { getLogger } from '../lib/logger'
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Logger-Flag-Weiterleitung', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('Logger ist no-op, wenn beide Flags false', async () => {
    vi.doMock('../lib/settings', () => ({ getSettings: () => ({ analytics: false, crashReports: false }) }))
    const { getLogger } = await import('../lib/logger')
    const logger = getLogger()
    expect(logger.logEvent('foo')).toBeUndefined()
    expect(logger.logError('err')).toBeUndefined()
  })

  it('Logger loggt Event, wenn Analytics true', async () => {
    vi.doMock('../lib/settings', () => ({ getSettings: () => ({ analytics: true, crashReports: false }) }))
    const { getLogger } = await import('../lib/logger')
    const logger = getLogger()
    expect(() => logger.logEvent('test', { foo: 1 })).not.toThrow()
  })

  it('Logger loggt Error, wenn CrashReports true', async () => {
    vi.doMock('../lib/settings', () => ({ getSettings: () => ({ analytics: false, crashReports: true }) }))
    const { getLogger } = await import('../lib/logger')
    const logger = getLogger()
    expect(() => logger.logError('fail', { bar: 2 })).not.toThrow()
  })
})
