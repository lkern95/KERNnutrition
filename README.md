# KERNcares 🥗

Eine minimalistische, offline-fähige Progressive Web App (PWA) für die Berechnung von Makronährstoffen und Kalorienbedarf.

## ✨ Features

- **🧮 Makronährstoff-Rechner**: Individueller Kalorienbedarf basierend auf wissenschaftlichen Formeln (Mifflin-St Jeor)
- **📱 Progressive Web App**: Installierbar auf allen Geräten (iOS/Android/Desktop)
- **🔒 100% Offline**: Alle Daten werden lokal gespeichert, keine externen Server
- **🎨 Modernes Design**: Tailwind CSS mit responsivem, barrierefreiem Design
- **⚡ Performance**: React + TypeScript + Vite für optimale Ladezeiten
- **🌐 Deutsch**: Komplett auf Deutsch lokalisiert

## 🛠 Tech Stack

- **Frontend**: React 19 + TypeScript
- **Styling**: Tailwind CSS mit Design Tokens
- **State Management**: Zustand mit localStorage Persistierung
- **Build Tool**: Vite 5
- **PWA**: vite-plugin-pwa mit Workbox
- **Icons**: Lucide React
- **Offline Storage**: IndexedDB via Zustand persist

## 🎨 Design System

Das Design basiert auf den folgenden Design Tokens:

```css
Hintergrund: #292c2f
Text: #ececec
Akzent (Golden Yellow): #FFDF00
Icon-Farbe: #32174d
```

- Runde Ecken und weiche Schatten
- Mobile-first Responsive Design
- Große Touch-Ziele (min. 44px)
- Hoher Kontrast für Barrierefreiheit

## 📁 Projektstruktur

```
src/
├── components/          # Wiederverwendbare UI-Komponenten
│   ├── BottomNavigation.tsx
│   └── InstallPrompt.tsx
├── pages/              # Seitenlevel Komponenten
│   ├── RechnerPage.tsx
│   ├── PlanerPage.tsx
│   ├── CheckinPage.tsx
│   ├── EinstellungenPage.tsx
│   └── InfoPage.tsx
├── store/              # Zustand State Management
│   └── appStore.ts
├── lib/                # Berechnungslogik
│   └── calculations.ts
├── styles/             # CSS Konfiguration
└── assets/             # Statische Assets
```

## 🚀 Installation & Development

### Voraussetzungen
- Node.js 18+ 
- npm oder yarn

### Setup
```bash
# Dependencies installieren
npm install

# Development Server starten
npm run dev

# Für Production bauen
npm run build

# Production Preview
npm run preview
```

### PWA Development
- Service Worker wird automatisch generiert
- Manifest ist für alle Plattformen optimiert
- Install Prompt wird automatisch angezeigt

## 📋 Features im Detail

### ✅ Phase 1 (Aktuell)
- [x] Kalorienbedarf-Rechner mit BMR/TDEE
- [x] Makronährstoff-Verteilung (Protein/Kohlenhydrate/Fett)
- [x] BMI-Berechnung und Kategorisierung
- [x] Wasserbedarf-Empfehlung
- [x] Responsive Navigation (5 Tabs)
- [x] PWA mit Offline-Fähigkeiten
- [x] Lokale Datenspeicherung

### 🔜 Phase 2 (Geplant)
- [ ] Wochenplaner für Mahlzeiten
- [ ] Fortschritts-Tracking
- [ ] Mahlzeiten-Logging
- [ ] Export/Import von Daten
- [ ] Detaillierte Statistiken

## 🔐 Datenschutz

- **Lokale Datenspeicherung**: Alle Daten bleiben auf dem Gerät
- **Keine Tracking-Tools**: Kein Analytics oder externe Services
- **Offline-First**: Funktioniert komplett ohne Internet
- **Open Source**: Transparenter, öffentlich einsehbarer Code

## 📊 Berechnungsgrundlagen

### Grundumsatz (BMR)
Verwendung der **Mifflin-St Jeor Formel**:
- Männer: BMR = 10 × Gewicht(kg) + 6.25 × Größe(cm) - 5 × Alter + 5
- Frauen: BMR = 10 × Gewicht(kg) + 6.25 × Größe(cm) - 5 × Alter - 161

### Gesamtumsatz (TDEE)
BMR multipliziert mit Aktivitätsfaktor:
- Sitzend: 1.2
- Leicht aktiv: 1.375
- Moderat aktiv: 1.55
- Sehr aktiv: 1.725
- Extrem aktiv: 1.9

### Makronährstoffe (Standard)
- **Protein**: 30% der Kalorien (4 kcal/g)
- **Kohlenhydrate**: 40% der Kalorien (4 kcal/g)
- **Fett**: 30% der Kalorien (9 kcal/g)

## 📱 PWA Installation

### iOS (Safari)
1. Website öffnen
2. Teilen-Button → "Zum Home-Bildschirm"

### Android (Chrome)
1. Website öffnen
2. Menü → "App installieren"

### Desktop
1. Chrome/Edge öffnen
2. Adressleiste → Install-Symbol

## 🤝 Contributing

Beiträge sind willkommen! Bitte erstelle ein Issue oder Pull Request.

## 📄 Lizenz

MIT License - siehe [LICENSE](LICENSE) für Details.

---

**Made with ❤️ für deine Gesundheit**

React + TypeScript + Tailwind CSS | © 2025 KERNcares

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
