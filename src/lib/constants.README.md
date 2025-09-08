# External Links Configuration

## Übersicht

Zentrale Verwaltung aller externen Verlinkungen für KERNbalance in `src/lib/constants.ts`.

## Konfigurierte Links

### ✅ **GitHub Repository**
- **URL**: `https://github.com/lkern95/KERNbalance`
- **Text**: "Quellcode auf GitHub"
- **Verwendung**: InfoPage Footer

### ✅ **Support Kontakt**
- **Email**: `mailto:lk@kerncares.de`
- **Text**: "Support kontaktieren"
- **Verwendung**: InfoPage Footer

### 🔄 **Zukünftige Links** (Vorbereitet)
- **Datenschutz**: `PRIVACY_POLICY` (TODO)
- **Nutzungsbedingungen**: `TERMS_OF_SERVICE` (TODO)
- **Social Media**: `TWITTER`, `LINKEDIN` (TODO)

## Verwendung

### Import
```typescript
import { EXTERNAL_LINKS, LINK_TEXTS } from '../lib/constants'
```

### Komponenten-Verwendung
```jsx
<a href={EXTERNAL_LINKS.GITHUB_REPO} target="_blank" rel="noopener noreferrer">
  {LINK_TEXTS.GITHUB_REPO}
</a>

<a href={EXTERNAL_LINKS.SUPPORT_EMAIL}>
  {LINK_TEXTS.SUPPORT_CONTACT}
</a>
```

### Validierung
```typescript
import { validateExternalLink } from '../lib/constants'

if (validateExternalLink(url)) {
  // URL ist valide
}
```

## Änderungen vornehmen

### **Link aktualisieren**
```typescript
// In src/lib/constants.ts
export const EXTERNAL_LINKS = {
  GITHUB_REPO: 'https://github.com/new-user/new-repo',
  SUPPORT_EMAIL: 'mailto:new-email@domain.com',
  // ...
}
```

### **Text ändern**
```typescript
// In src/lib/constants.ts
export const LINK_TEXTS = {
  GITHUB_REPO: 'Code auf GitHub ansehen',
  SUPPORT_CONTACT: 'Hilfe anfordern',
  // ...
}
```

### **Neuen Link hinzufügen**
```typescript
// 1. Link-URL hinzufügen
export const EXTERNAL_LINKS = {
  // ...existing links...
  DOCUMENTATION: 'https://docs.kernbalance.com',
} as const

// 2. Link-Text hinzufügen
export const LINK_TEXTS = {
  // ...existing texts...
  DOCUMENTATION: 'Dokumentation',
} as const

// 3. In Komponente verwenden
<a href={EXTERNAL_LINKS.DOCUMENTATION}>
  {LINK_TEXTS.DOCUMENTATION}
</a>
```

## Aktuelle Fundstellen

### **Aktualisierte Dateien**

1. **`src/lib/constants.ts`** ✅ NEU
   - Zentrale Link-Konfiguration
   - Validierungsfunktionen
   - TypeScript-Typen

2. **`src/pages/InfoPage.tsx`** ✅ AKTUALISIERT
   - GitHub: `macrocal/app` → `lkern95/KERNbalance`
   - Support: `support@macrocal.app` → `lk@kerncares.de`
   - Verwendet jetzt Constants statt Hardcoding

3. **`src/lib/constants.test.ts`** ✅ NEU
   - 8 Unit Tests für Link-Konfiguration
   - URL-Validierung Tests
   - Konsistenz-Prüfungen

### **Keine Änderungen nötig**
- **dist/**: Build-Output, wird bei `npm run build` regeneriert
- **package-lock.json**: Dependency URLs (extern)
- **README.md**: Vite-Template Links (extern)

## Testing

```bash
# Link-Konfiguration testen
npm test -- constants

# Alle Tests ausführen
npm test

# Coverage für Links
npm run test:coverage -- lib/constants
```

### **Test-Szenarien**
- ✅ GitHub URL Validierung
- ✅ Support Email Format
- ✅ Link-Text Konsistenz
- ✅ URL-Validierungsfunktion
- ✅ Vollständigkeit der Konfiguration

## Migration Notes

### **Von hardcoded zu Constants**
**Vorher:**
```jsx
<a href="https://github.com/macrocal/app">Quellcode auf GitHub</a>
<a href="mailto:support@macrocal.app">Support kontaktieren</a>
```

**Nachher:**
```jsx
<a href={EXTERNAL_LINKS.GITHUB_REPO}>{LINK_TEXTS.GITHUB_REPO}</a>
<a href={EXTERNAL_LINKS.SUPPORT_EMAIL}>{LINK_TEXTS.SUPPORT_CONTACT}</a>
```

### **Vorteile**
- ✅ **Zentral verwaltet**: Ein Ort für alle Links
- ✅ **Type-Safe**: TypeScript-Unterstützung
- ✅ **Testbar**: Unit Tests für Link-Validierung
- ✅ **Konsistent**: Gleiche Texte überall
- ✅ **Wartbar**: Einfache Updates in der Zukunft

## Troubleshooting

### **Link funktioniert nicht**
1. URL in `EXTERNAL_LINKS` prüfen
2. `validateExternalLink()` verwenden
3. Browser Developer Tools → Network Tab
4. HTTPS/CORS-Probleme ausschließen

### **Tests schlagen fehl**
```bash
# Tests im Detail ausführen
npm test -- constants --reporter=verbose

# Einzelnen Test ausführen
npm test -- --grep "should have valid GitHub"
```

### **Import-Fehler**
```typescript
// Relativer Pfad von Komponente zu constants.ts
import { EXTERNAL_LINKS } from '../lib/constants'  // ✅
import { EXTERNAL_LINKS } from './lib/constants'   // ❌
```
