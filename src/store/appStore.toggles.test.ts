import { describe, it, vi, expect, beforeEach } from 'vitest';

import { Analytics } from '../lib/analytics';
import { CrashReporter } from '../lib/crashReporter';
import { useAppStore } from './appStore';

vi.mock('../lib/analytics', () => ({
  Analytics: {
    enable: vi.fn(),
    disable: vi.fn(),
  },
}));
vi.mock('../lib/crashReporter', () => ({
  CrashReporter: {
    enable: vi.fn(),
    disable: vi.fn(),
  },
}));

// Helper to trigger the settings effect (copied from appStore.ts)
function triggerSettingsEffect() {
  const settings = useAppStore.getState().getSettings();
  if (settings.analytics) {
    Analytics.enable();
  } else {
    Analytics.disable();
  }
  if (settings.crashReports) {
    CrashReporter.enable();
  } else {
    CrashReporter.disable();
  }
}

describe('Settings Toggles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem('kerncare-settings');
  });

  it('enables Analytics when toggled on', () => {
    localStorage.setItem('kerncare-settings', JSON.stringify({ analytics: true }));
    triggerSettingsEffect();
    expect(Analytics.enable).toHaveBeenCalled();
    expect(Analytics.disable).not.toHaveBeenCalled();
  });

  it('disables Analytics when toggled off', () => {
    localStorage.setItem('kerncare-settings', JSON.stringify({ analytics: false }));
    triggerSettingsEffect();
    expect(Analytics.disable).toHaveBeenCalled();
    expect(Analytics.enable).not.toHaveBeenCalled();
  });

  it('enables CrashReporter when toggled on', () => {
    localStorage.setItem('kerncare-settings', JSON.stringify({ crashReports: true }));
    triggerSettingsEffect();
    expect(CrashReporter.enable).toHaveBeenCalled();
    expect(CrashReporter.disable).not.toHaveBeenCalled();
  });

  it('disables CrashReporter when toggled off', () => {
    localStorage.setItem('kerncare-settings', JSON.stringify({ crashReports: false }));
    triggerSettingsEffect();
    expect(CrashReporter.disable).toHaveBeenCalled();
    expect(CrashReporter.enable).not.toHaveBeenCalled();
  });
});
