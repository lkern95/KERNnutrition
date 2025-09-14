describe('Checkin Actions', () => {
  beforeEach(() => {
    // Actions aus aktuellem Store übernehmen, damit setState(replace: true) funktioniert
    const actions = useAppStore.getState();
    useAppStore.setState({
      ...getInitialState(),
      ...actions,
      checkins: [
        { id: '1', date: '2025-09-10', weight: 80, notes: 'Test' },
        { id: '2', date: '2025-09-11', weight: 81 },
      ],
    }, true);
  });

  it('updateCheckin ändert nur das gewünschte Feld (immutable)', () => {
    const updated = useAppStore.getState().updateCheckin('1', { weight: 82, notes: 'Bearbeitet' });
    const checkins = useAppStore.getState().checkins;
    expect(updated).toBeDefined();
    expect(updated?.weight).toBe(82);
    expect(updated?.notes).toBe('Bearbeitet');
    expect(checkins.find(c => c.id === '1')?.weight).toBe(82);
    // Andere Einträge bleiben unverändert
    expect(checkins.find(c => c.id === '2')?.weight).toBe(81);
  });

  it('updateCheckin für nicht vorhandene ID gibt undefined zurück', () => {
    const updated = useAppStore.getState().updateCheckin('999', { weight: 99 });
    expect(updated).toBeUndefined();
  });

  it('deleteCheckin entfernt Eintrag mit passender ID', () => {
    const existed = useAppStore.getState().deleteCheckin('1');
    const checkins = useAppStore.getState().checkins;
    expect(existed).toBe(true);
    expect(checkins.length).toBe(1);
    expect(checkins[0].id).toBe('2');
  });

  it('deleteCheckin für nicht vorhandene ID gibt false zurück', () => {
    const existed = useAppStore.getState().deleteCheckin('999');
    expect(existed).toBe(false);
    expect(useAppStore.getState().checkins.length).toBe(2);
  });
});
import { wipeAllUserData, useAppStore, PERSIST_KEY, getInitialState } from './appStore'
import { describe, it, expect, beforeEach } from 'vitest';

describe('wipeAllUserData', () => {
  beforeEach(() => {
    // Testdaten anlegen (vereinfacht)
    useAppStore.setState({
      ...getInitialState(),
      profile: { name: 'Test', age: 30, weight: 80, height: 180, activityLevel: 'moderately_active', goal: 'maintain', gender: 'male' },
      checkins: [{ id: '1', date: '2025-09-10', weight: 80 }],
      dailyIntakes: [{ calories: 2000, protein: 100, carbs: 200, fat: 50, date: '2025-09-10' }],
      isOnboarded: true,
      activeTab: 'rechner',
    }, true);
    // simuliert Persist
    localStorage.setItem(PERSIST_KEY, JSON.stringify({ state: useAppStore.getState(), version: 0 }));
    localStorage.setItem('kerncare-settings', JSON.stringify({ analytics: true }));
    localStorage.setItem('kernnutrition-test', 'foo');
  localStorage.setItem('kernnutrition-test', 'bar');
  });

  it('löscht alle Nutzdaten (Persist-Key darf leer "{}" sein)', async () => {
    await wipeAllUserData();

    const state = useAppStore.getState();
    expect(state.profile).toBeNull();
    expect(state.checkins).toEqual([]);
    expect(state.dailyIntakes).toEqual([]);
    expect(state.isOnboarded).toBe(false);
    expect(state.activeTab).toBe('rechner');

    // Hinweis: zustand/persist schreibt nach Reset ggf. ein leeres Objekt – das ist erwartetes Verhalten.
    const raw = localStorage.getItem(PERSIST_KEY);
    // Debug-Ausgabe für das tatsächliche Persist-Format
    // eslint-disable-next-line no-console
    console.log('Persist-Wert nach wipe:', raw);
    let valid = false;
    if (
      raw === null ||
      raw === '{}' ||
      raw === '{"state":{}}' ||
      /"state"\s*:\s*\{\s*\}/.test(raw) ||
      /"state"\s*:\s*\{\s*\},?\s*"version"\s*:\s*\d+/.test(raw)
    ) {
      valid = true;
    } else if (raw) {
      // Akzeptiere auch: {"state":{"profile":null,"checkins":[],...},"version":0}
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        parsed.state &&
        parsed.state.profile === null &&
        Array.isArray(parsed.state.checkins) && parsed.state.checkins.length === 0 &&
        Array.isArray(parsed.state.dailyIntakes) && parsed.state.dailyIntakes.length === 0 &&
        parsed.state.isOnboarded === false
      ) {
        valid = true;
      }
    }
    expect(valid).toBe(true);

    expect(localStorage.getItem('kerncare-settings')).toBeFalsy();
    expect(localStorage.getItem('kernnutrition-test')).toBeFalsy();
  expect(localStorage.getItem('kernnutrition-test')).toBeFalsy();
  });
});
