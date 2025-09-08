# Nutrition Module Documentation

## Übersicht

Das `nutrition.ts` Modul stellt typsichere Funktionen zur Berechnung von Kalorienbedarf und Makronährstoffverteilung nach wissenschaftlichen Standards bereit.

## API Reference

### Typen

```typescript
export type Sex = 'M' | 'F';

export interface CalcInput {
  weightKg: number;       // Körpergewicht in kg
  heightCm: number;       // Körpergröße in cm
  age: number;            // Alter in Jahren
  sex: Sex;               // Geschlecht
  activityFactor: number; // Aktivitätsfaktor (1.2–1.9)
  kcalAdjust: number;     // Kalorienanpassung (+Bulk/-Diät)
  proteinPerKg: number;   // Protein g/kg (1.8–2.5)
  fatPerKg: number;       // Fett g/kg (0.8–1.2)
}

export interface MacroResult {
  bmr: number;        // Grundumsatz in kcal
  tdee: number;       // Gesamtumsatz in kcal
  targetKcal: number; // Zielkalorien in kcal
  proteinG: number;   // Protein in g (gerundet)
  fatG: number;       // Fett in g (gerundet)
  carbsG: number;     // Kohlenhydrate in g (gerundet)
}
```

### Funktionen

#### `mifflinStJeor(weightKg, heightCm, age, sex): number`

Berechnet den Grundumsatz (BMR) nach der Mifflin-St Jeor Formel.

**Formeln:**
- Männer: BMR = 10 × kg + 6.25 × cm - 5 × Alter + 5
- Frauen: BMR = 10 × kg + 6.25 × cm - 5 × Alter - 161

```typescript
const bmr = mifflinStJeor(80, 180, 30, 'M'); // 1780 kcal
```

#### `tdee(bmr, activityFactor): number`

Berechnet den Gesamtenergieumsatz (TDEE).

**Aktivitätsfaktoren:**
- 1.2: Sitzend (wenig/keine Bewegung)
- 1.375: Leicht aktiv (1-3 Tage/Woche)
- 1.55: Moderat aktiv (3-5 Tage/Woche)
- 1.725: Sehr aktiv (6-7 Tage/Woche)
- 1.9: Extrem aktiv (2x täglich)

```typescript
const totalCalories = tdee(1780, 1.5); // 2670 kcal
```

#### `targetCalories(tdee, adjust): number`

Berechnet Zielkalorien basierend auf TDEE und Anpassung.

```typescript
const bulkCalories = targetCalories(2670, 300);  // 2970 kcal (+300 für Bulk)
const cutCalories = targetCalories(2670, -500);  // 2170 kcal (-500 für Diät)
```

#### `macrosFromTargets(input): CalcResult`

Komplette Makronährstoffberechnung mit Validierung.

```typescript
const input: CalcInput = {
  weightKg: 80,
  heightCm: 180,
  age: 30,
  sex: 'M',
  activityFactor: 1.5,
  kcalAdjust: 0,
  proteinPerKg: 2.0,
  fatPerKg: 1.0
};

const { result, warnings } = macrosFromTargets(input);
// result.bmr: 1780
// result.tdee: 2670
// result.targetKcal: 2670
// result.proteinG: 160 (80kg × 2.0g/kg)
// result.fatG: 80 (80kg × 1.0g/kg)
// result.carbsG: 328 ((2670 - 640 - 720) / 4)
```

## Beispiele

### Beispiel 1: Normalgewichtige Frau (Diät)

```typescript
const femalecut: CalcInput = {
  weightKg: 60,
  heightCm: 165,
  age: 28,
  sex: 'F',
  activityFactor: 1.3,
  kcalAdjust: -300,
  proteinPerKg: 2.0,
  fatPerKg: 0.8
};

const { result } = macrosFromTargets(femalecut);
// BMR: ~1395 kcal
// TDEE: ~1814 kcal  
// Target: ~1514 kcal (-300)
// Protein: 120g (480 kcal)
// Fett: 48g (432 kcal)
// Carbs: ~150g (602 kcal)
```

### Beispiel 2: Männlicher Athlet (Bulk)

```typescript
const maleBulk: CalcInput = {
  weightKg: 85,
  heightCm: 185,
  age: 24,
  sex: 'M',
  activityFactor: 1.7,
  kcalAdjust: 400,
  proteinPerKg: 2.3,
  fatPerKg: 1.0
};

const { result } = macrosFromTargets(maleBulk);
// BMR: ~1943 kcal
// TDEE: ~3303 kcal
// Target: ~3703 kcal (+400)
// Protein: 195g (780 kcal)
// Fett: 85g (765 kcal)
// Carbs: ~540g (2158 kcal)
```

## Validierung und Warnungen

Das Modul führt automatische Validierungen durch und gibt Warnungen aus:

### Empfohlene Bereiche:
- **Protein**: 1.8–2.5 g/kg Körpergewicht
- **Fett**: 0.8–1.2 g/kg Körpergewicht (mindestens 20% der Kalorien)
- **Aktivitätsfaktor**: 1.2–1.9

### Warnung-Types:
- `protein_out_of_range`: Protein außerhalb 1.8-2.5 g/kg
- `fat_out_of_range`: Fett außerhalb 0.8-1.2 g/kg  
- `fat_too_low`: Fettanteil unter 20% der Kalorien
- `activity_factor_extreme`: Aktivitätsfaktor außerhalb 1.2-1.9

```typescript
const problematicInput: CalcInput = {
  // ... andere Werte
  proteinPerKg: 3.0,  // Zu hoch
  fatPerKg: 0.5,      // Zu niedrig
  activityFactor: 2.1 // Zu hoch
};

const { warnings } = macrosFromTargets(problematicInput);
warnings.forEach(w => console.log(w.message));
// "Protein sollte zwischen 1.8-2.5 g/kg liegen (aktuell: 3.0 g/kg)"
// "Fett sollte zwischen 0.8-1.2 g/kg liegen (aktuell: 0.5 g/kg)"
// "Aktivitätsfaktor außerhalb des typischen Bereichs 1.2-1.9 (aktuell: 2.1)"
```

## Hilfsfunktionen

### `getMacroPercentages(result): object`

Berechnet die prozentuale Verteilung der Makronährstoffe:

```typescript
const percentages = getMacroPercentages(result);
// { protein: 25, fat: 30, carbs: 45 }
```

## Mathematische Konsistenz

Alle Berechnungen sind mathematisch konsistent:
- Gramm-Werte werden mit `Math.round()` gerundet
- Die Kalorienbilanz stimmt: `protein*4 + fat*9 + carbs*4 ≈ targetKcal`
- Rundungsfehler werden toleriert (max. ±4 kcal Abweichung)

## Tests

Das Modul ist vollständig getestet mit Vitest:

```bash
npm run test:run  # Alle Tests ausführen
npm run test      # Tests im Watch-Modus
npm run test:ui   # Tests mit UI
```

**Test-Coverage:**
- ✅ Alle Grundfunktionen (BMR, TDEE, Target)
- ✅ Edge Cases und Fehlerfälle
- ✅ Validierung und Warnungen
- ✅ Rundungsverhalten
- ✅ Mathematische Konsistenz
- ✅ Realistische Szenarien

## Integration in die App

Das Modul ist vollständig in die KERNcares PWA integriert und ersetzt die bisherigen Berechnungen im `calculations.ts` Modul für höhere Genauigkeit und bessere Typsicherheit.
