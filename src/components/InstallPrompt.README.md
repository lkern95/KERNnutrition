# InstallPrompt Komponente

## Übersicht

Die `InstallPrompt` Komponente zeigt automatisch einen Installationsaufforderung für die PWA beim ersten Besuch der Seite an, falls das Gerät die Installation unterstützt.

## Features

### ✅ **Automatische Erkennung**
- Reagiert auf `beforeinstallprompt` Event (Chrome/Edge/Samsung Browser)
- Spezielle iOS Safari Behandlung mit Anweisungen
- Standalone-Mode Erkennung

### ✅ **Intelligente Persistierung**
- **7-Tage Timeout**: Nach "Später" wird 7 Tage lang nicht mehr angezeigt
- **LocalStorage**: `kernbalance-install-dismissed` Flag mit Timestamp
- **Version-basiert**: Kann bei SW-Updates zurückgesetzt werden

### ✅ **Benutzerfreundlich**
- Erscheint nur beim ersten Besuch (wenn installierbar)
- Responsive Design mit Theme-Farben
- Barrierefrei (ARIA Labels, Keyboard Navigation)
- iOS-spezifische Anweisungen

### ✅ **Zuverlässig auf iOS und Android**
- **Android**: Nutzt natives `beforeinstallprompt` Event
- **iOS**: Zeigt manuelle Installationsanweisungen
- **Edge Cases**: Graceful Fallbacks und Error Handling

## Komponenten-Struktur

```
src/
├── components/
│   └── InstallPrompt.tsx          # UI Komponente
├── hooks/
│   ├── useInstallPrompt.ts        # Logic Hook
│   └── useInstallPrompt.test.ts   # Unit Tests
└── App.jsx                        # Import & Integration
```

## Technische Details

### Hook: `useInstallPrompt`

```typescript
const {
  showPrompt,      // boolean - Soll Modal angezeigt werden?
  isInstallable,   // boolean - Ist PWA installierbar?
  handleInstall,   // function - Installation starten
  handleDismiss,   // function - Modal schließen + Flag setzen
  canInstall       // boolean - Natives beforeinstallprompt verfügbar?
} = useInstallPrompt()
```

### Utils: `installPromptUtils`

```typescript
installPromptUtils.getStorageKey()        // 'kernbalance-install-dismissed'
installPromptUtils.getDismissDuration()   // 7 * 24 * 60 * 60 * 1000 ms
installPromptUtils.clearDismissFlag()     // Für Testing/Reset
installPromptUtils.setDismissFlag(ts?)    // Für Testing
```

## Verhalten

### **Desktop/Android (Chrome/Edge)**
1. `beforeinstallprompt` Event wird abgefangen
2. Modal erscheint automatisch (einmalig)
3. "Installieren" → `deferredPrompt.prompt()`
4. "Später" → Modal schließen, 7-Tage Flag setzen

### **iOS Safari**
1. Erkennung über User-Agent + Standalone-Check
2. Modal mit manuellen Anweisungen nach 2s Delay
3. "Später" → 7-Tage Flag setzen
4. Text: "Tippe auf 'Teilen' und dann 'Zum Home-Bildschirm'"

### **Bereits installiert/Standalone**
- Kein Modal wird angezeigt
- Hook gibt `showPrompt: false` zurück

## Testing

```bash
# Unit Tests ausführen
npm run test useInstallPrompt

# Test Coverage
npm run test:coverage -- hooks/useInstallPrompt
```

### **Test-Szenarien**
- ✅ LocalStorage Flag Persistierung
- ✅ 7-Tage Timeout Logic
- ✅ Error Handling (Storage Fehler)
- ✅ Utility Functions
- ✅ iOS/Android Detection

## Anpassungen

### **Timeout ändern**
```typescript
// In useInstallPrompt.ts
const DISMISS_DURATION = 14 * 24 * 60 * 60 * 1000 // 14 Tage
```

### **Storage Key ändern**
```typescript
const STORAGE_KEY = 'myapp-install-dismissed'
```

### **Texte anpassen**
```typescript
// In InstallPrompt.tsx
<h3>App herunterladen</h3>
<p>Lade KERNbalance für bessere Performance herunter</p>
```

### **Styling anpassen**
```typescript
// Tailwind Classes in InstallPrompt.tsx
className="fixed bottom-4 left-4 right-4 z-50"  // Unten statt oben
className="bg-red-500 border-red-600"           // Andere Farben
```

## Integration in andere Komponenten

```jsx
// Optional: Manual trigger in Einstellungen
import { useInstallPrompt } from '../hooks/useInstallPrompt'

function EinstellungenPage() {
  const { isInstallable, handleInstall } = useInstallPrompt()
  
  return (
    <div>
      {isInstallable && (
        <button onClick={handleInstall}>
          App installieren
        </button>
      )}
    </div>
  )
}
```

## Browser Support

| Browser | Support | Verhalten |
|---------|---------|-----------|
| Chrome Mobile | ✅ Full | Native beforeinstallprompt |
| Samsung Internet | ✅ Full | Native beforeinstallprompt |
| Edge Mobile | ✅ Full | Native beforeinstallprompt |
| iOS Safari | ✅ Manual | Custom Instructions |
| Firefox Mobile | ⚠️ Limited | Fallback (no prompt) |
| Chrome Desktop | ✅ Full | Native beforeinstallprompt |

## Debugging

```javascript
// Console Commands für Testing
localStorage.removeItem('kernbalance-install-dismissed')  // Reset Flag
window.dispatchEvent(new Event('beforeinstallprompt'))   // Simulate Event

// Hook State prüfen (in DevTools React)
$r.props.children.props.showPrompt  // true/false
```
