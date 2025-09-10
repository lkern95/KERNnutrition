import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useAppStore } from '../store/appStore'
import CheckinPage from './CheckinPageComponent'

// Hilfsfunktion: Store mit Testdaten befüllen
function setupStore() {
  const actions = useAppStore.getState()
  useAppStore.setState({
    ...actions,
    checkins: [
      { id: '1', date: '2025-09-10', weight: 80, trainingDays: 3, sleep: 3, stress: 3, notes: 'Test' },
      { id: '2', date: '2025-09-11', weight: 81, trainingDays: 2, sleep: 4, stress: 2 },
    ],
  }, true)
}

describe('CheckinPage UI', () => {
  beforeEach(() => {
    setupStore()
  })

  it('Bearbeiten ändert Gewicht', async () => {
    render(<CheckinPage />)
    // Edit-Button für ersten Eintrag klicken
    const editBtn = screen.getAllByTitle('Bearbeiten')[0]
    fireEvent.click(editBtn)
    // Modal erscheint
    expect(screen.getByText('Check-in bearbeiten')).toBeInTheDocument()
    // Gewicht ändern
    const input = screen.getByLabelText('Gewicht (kg)') as HTMLInputElement
    fireEvent.change(input, { target: { value: '85' } })
    // Speichern
    fireEvent.click(screen.getByText(/Speichern/))
    // Toast erscheint
    await waitFor(() => expect(screen.getByText('Check-in aktualisiert!')).toBeInTheDocument())
    // Gewicht in Liste aktualisiert
    expect(screen.getByText('85.0 kg')).toBeInTheDocument()
  })

  it('Löschen entfernt Eintrag', async () => {
    render(<CheckinPage />)
    // Delete-Button für ersten Eintrag klicken
    const delBtn = screen.getAllByTitle('Löschen')[0]
    fireEvent.click(delBtn)
    // Bestätigungsdialog erscheint
    expect(screen.getByText('Eintrag wirklich entfernen?')).toBeInTheDocument()
    // Entfernen klicken
    fireEvent.click(screen.getByText(/Entfernen/))
    // Toast erscheint
    await waitFor(() => expect(screen.getByText('Check-in gelöscht!')).toBeInTheDocument())
    // Eintrag ist nicht mehr in der Liste
    expect(screen.queryByText('80.0 kg')).not.toBeInTheDocument()
  })
})
