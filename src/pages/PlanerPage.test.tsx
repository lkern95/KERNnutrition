import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useAppStore } from '../store/appStore';
import { PlanerPage } from './PlanerPage';

// Hilfsfunktion zum Setzen des Rechner-Ziels im Store
function setRechnerTargetKcal(kcal: number) {
  useAppStore.getState().setProfile({
    name: '',
    age: 30,
    weight: 80,
    height: 180,
    activityLevel: 'moderately_active',
    goal: 'maintain',
    gender: 'male',
    targetKcal: kcal,
  });
}

describe('PlanerPage Prefill', () => {
  it('prefillt das Tagesziel aus dem Rechner, Nutzeränderung bleibt bestehen', async () => {
    // Rechnerziel setzen
    setRechnerTargetKcal(2700);

    render(<PlanerPage />);

    // Feld finden
    const input = await screen.findByPlaceholderText(/z\.B\. 2500/i);
    // Prefill prüfen
    await waitFor(() => expect((input as HTMLInputElement).value).toBe('2700'));

    // Nutzer ändert Wert
    fireEvent.change(input, { target: { value: '2200' } });
    expect((input as HTMLInputElement).value).toBe('2200');

    // Prefill-Hinweis verschwindet
    expect(screen.queryByText(/Automatisch aus Rechner übernommen/i)).toBeNull();
  });
});
