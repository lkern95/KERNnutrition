# KERNbalance Regel-Engine für Adaptive Empfehlungen

Die Regel-Engine (`src/lib/adjust.ts`) implementiert intelligente Anpassungsempfehlungen basierend auf Check-in Daten, Trendanalysen und wissenschaftlichen Prinzipien.

## Überblick

Die Engine analysiert automatisch:
- **Fortschritt vs. Zielbereich** (2+ Wochen Trend)
- **Schlaf- und Stress-Level** (Lebensqualität)
- **Trainings-Konsistenz** (Aktivitätsmuster)
- **Gewichtsstagnation** (Plateaus erkennen)
- **Spezielle Situationen** (Events, Verletzungen, Reisen)

## Regelwerk

### 1. Fortschritt-basierte Anpassungen

#### Unter Zielbereich (2+ Wochen)
- **<50% des Zielbereichs**: +100-150 kcal
- **Starke Abweichung**: +200 kcal
- **Priorität**: Medium → High (nach 3+ Wochen)

#### Über Zielbereich (2+ Wochen)
- **Moderate Abweichung**: -150-200 kcal
- **Starke Abweichung**: -300 kcal
- **Priorität**: High (sofort)

### 2. Lifestyle-Faktoren

#### Schlechter Schlaf (≤2.5/5) oder hoher Stress (≥3.5/5)
- **Empfehlung**: Erhaltungskalorien (+100 kcal)
- **Trainingsvolumen**: -20-30%
- **Priorität**: High
- **Dauer**: 1-2 Wochen

#### Niedrige Trainingsfrequenz (≤2 Tage/Woche)
- **Aktivitätsfaktor**: -0.1
- **Alternativ**: -200 kcal/Tag
- **Dauer**: Bis Training normalisiert

#### Energie/Leistungsabfall (viel Training + wenig Schlaf)
- **Kohlenhydrate**: +75g (+300 kcal)
- **Gesamtkalorien**: +150 kcal empfohlen
- **Fokus**: Post-Workout Carbs

### 3. Stagnations-Erkennung

#### Gewichtsstillstand (2+ Wochen, <0.1% Änderung/Woche)
- **Erste Maßnahme**: -175 kcal
- **Mögliche Ursachen**: Hidden Calories, NEAT-Drop
- **Follow-up**: Bei anhaltender Stagnation weitere -100 kcal

### 4. Spezielle Situationen

#### Events/Wochenenden
```typescript
// Beispiel: Event mit 3500 kcal (Ziel: 2800 kcal/Tag)
const surplus = 3500 - 2800 // = +700 kcal
const dailyReduction = 700 / 6 // = 117 kcal/Tag (6 andere Tage)

Empfehlung: "Reduziere 6 Tage um je 117 kcal oder akzeptiere Woche als Überschuss"
```

#### Verletzung/Trainingspause
- **Kalorien**: -200 kcal (Erhaltung/leichtes Defizit)
- **Kohlenhydrate**: -20-30%
- **Protein**: Erhöhen (1.6-2.2g/kg)
- **Fokus**: Heilung und Muskelerhalt

#### Reisen/weniger Bewegung
- **Aktivitätsfaktor**: -0.05 bis -0.15
- **Alternativ**: -100-300 kcal/Tag
- **Hinweis**: Restaurant-Kalorien +20% einrechnen

## Prioritätssystem

### Critical (Rot)
- Extreme Abweichungen (>1% Gewichtsänderung/Woche)
- Gesundheitsgefährdende Trends

### High (Orange)
- Schlechter Schlaf/hoher Stress
- Gewichtsverlust zu schnell/langsam
- 3+ Wochen außerhalb Zielbereich

### Medium (Blau)
- 2 Wochen außerhalb Zielbereich
- Stagnation erkannt
- Trainingsanpassungen nötig

### Low (Grau)
- Optimierungsvorschläge
- Präventive Maßnahmen
- Lifestyle-Tipps

## API-Nutzung

### Hauptfunktion
```typescript
import { generateAdjustmentRecommendations } from './lib/adjust'

const recommendations = generateAdjustmentRecommendations(
  checkins: CheckinData[],
  userProfile: UserProfile,
  trendData: TrendData
)
```

### Event-Planung
```typescript
import { generateEventRecommendations } from './lib/adjust'

const eventRec = generateEventRecommendations(
  eventCalories: 3500,
  weeklyTarget: 19600 // 2800 × 7
)
```

### Verletzungs-Anpassungen
```typescript
import { generateInjuryRecommendations } from './lib/adjust'

const injuryRecs = generateInjuryRecommendations(
  currentCalories: 2800,
  estimatedDuration: "4-6 Wochen"
)
```

### Kalorien-Berechnung
```typescript
import { calculateNewTargetCalories } from './lib/adjust'

const newCalories = calculateNewTargetCalories(
  currentCalories: 2800,
  recommendation: adjustmentRecommendation
)
```

## Integration in CheckinPage

Die Regel-Engine ist vollständig in die `CheckinPage` integriert:

1. **Automatische Analyse**: Nach jedem Check-in
2. **Intelligente Empfehlungen**: Basierend auf Trends
3. **Priorisierte Darstellung**: Nach Wichtigkeit sortiert
4. **Actionable Insights**: Konkrete kcal/AF-Anpassungen

## Testing

Die Engine verfügt über 19 umfassende Tests:

```bash
npm run test -- adjust.test.ts
```

**Test-Abdeckung:**
- ✅ Fortschritt-Analyse (unter/über Ziel)
- ✅ Lifestyle-Faktoren (Schlaf, Stress, Training)
- ✅ Stagnations-Erkennung
- ✅ Spezielle Situationen (Events, Verletzungen)
- ✅ Verschiedene Zieltypen (Bulk, Cut, Maintain)
- ✅ Edge Cases und extreme Abweichungen
- ✅ Prioritäts-System
- ✅ Kalorien- und AF-Berechnungen

## Wissenschaftliche Basis

### Gewichtsänderung-Zielbereiche
- **Lean Bulk**: +0.25-0.5% KG/Woche (optimal für Muskelaufbau)
- **Aggressiver Aufbau**: +0.5-0.75% KG/Woche (Anfänger)
- **Diät**: -0.5-1% KG/Woche (nachhaltiger Fettabbau)
- **Erhaltung**: ±0.25% KG/Woche (Gewichtsstabilität)

### Anpassungsgrößen
- **Konservativ**: ±100-150 kcal (erste Anpassung)
- **Moderat**: ±200 kcal (standard Anpassung)
- **Aggressiv**: ±300 kcal (starke Abweichung)

### Stagnations-Schwellenwerte
- **Zeitraum**: 2+ Wochen ohne Fortschritt
- **Schwellenwert**: <0.1% Gewichtsänderung/Woche
- **Erste Maßnahme**: -175 kcal + Tracking-Überprüfung

## Erweiterungsmöglichkeiten

1. **Machine Learning**: Personalisierte Anpassungsgrößen
2. **Hormonelle Faktoren**: Menstruationszyklus berücksichtigen
3. **Aktivitäts-Tracking**: Integration von Schritt-/Kalorienverbrauch
4. **Biomarker**: Körperfettanteil, Umfangsmessungen
5. **Erweiterte Analytics**: Langzeit-Trend-Analysen

Die Regel-Engine bildet das Herzstück des intelligenten Coaching-Systems von KERNbalance und ermöglicht datengesteuerte, wissenschaftlich fundierte Anpassungsempfehlungen.
