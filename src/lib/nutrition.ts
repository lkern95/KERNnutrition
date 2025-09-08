export type Sex = 'M' | 'F';

export interface CalcInput {
  weightKg: number;     // A1
  heightCm: number;     // A2
  age: number;          // A3
  sex: Sex;             // A4
  activityFactor: number; // A5 (1.2–1.9, nach 2 Wochen anpassen)
  kcalAdjust: number;     // A6 (+Bulk / -Diät)
  proteinPerKg: number;   // A7 (1.8–2.5)
  fatPerKg: number;       // A8 (0.8–1.2, mind. ~20–25% kcal)
}

export interface MacroResult {
  bmr: number;
  tdee: number;
  targetKcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

export interface ValidationWarning {
  type: 'fat_too_low' | 'protein_out_of_range' | 'fat_out_of_range' | 'activity_factor_extreme';
  message: string;
}

export interface CalcResult {
  result: MacroResult;
  warnings: ValidationWarning[];
}

/**
 * Berechnet den Grundumsatz (BMR) nach der Mifflin-St Jeor Formel
 * 
 * @param weightKg Körpergewicht in kg
 * @param heightCm Körpergröße in cm  
 * @param age Alter in Jahren
 * @param sex Geschlecht ('M' für männlich, 'F' für weiblich)
 * @returns BMR in kcal/Tag
 */
export function mifflinStJeor(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  // Validierung der Eingabewerte
  if (weightKg <= 0 || heightCm <= 0 || age <= 0) {
    throw new Error('Gewicht, Größe und Alter müssen positive Werte sein');
  }
  
  if (sex !== 'M' && sex !== 'F') {
    throw new Error('Geschlecht muss "M" oder "F" sein');
  }

  const baseBMR = 10 * weightKg + 6.25 * heightCm - 5 * age;
  
  if (sex === 'M') {
    return Math.round(baseBMR + 5);
  } else {
    return Math.round(baseBMR - 161);
  }
}

/**
 * Berechnet den Gesamtenergieumsatz (TDEE)
 * 
 * @param bmr Grundumsatz in kcal
 * @param activityFactor Aktivitätsfaktor (1.2 - 1.9)
 * @returns TDEE in kcal/Tag
 */
export function tdee(bmr: number, activityFactor: number): number {
  if (bmr <= 0) {
    throw new Error('BMR muss ein positiver Wert sein');
  }
  
  if (activityFactor < 1.0 || activityFactor > 2.0) {
    throw new Error('Aktivitätsfaktor sollte zwischen 1.0 und 2.0 liegen');
  }

  return Math.round(bmr * activityFactor);
}

/**
 * Berechnet die Zielkalorien basierend auf TDEE und Anpassung
 * 
 * @param tdee Gesamtenergieumsatz in kcal
 * @param adjust Anpassung in kcal (+/- für Bulk/Diät)
 * @returns Zielkalorien in kcal/Tag
 */
export function targetCalories(tdee: number, adjust: number): number {
  if (tdee <= 0) {
    throw new Error('TDEE muss ein positiver Wert sein');
  }

  const target = tdee + adjust;
  
  if (target <= 0) {
    throw new Error('Zielkalorien müssen positiv sein (TDEE + Anpassung zu niedrig)');
  }

  return Math.round(target);
}

/**
 * Validiert die Eingabeparameter und gibt Warnungen zurück
 * 
 * @param input Eingabeparameter
 * @returns Array von Validierungswarnungen
 */
export function validateInput(input: CalcInput): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // Protein-Bereich prüfen (1.8-2.5 g/kg)
  if (input.proteinPerKg < 1.8 || input.proteinPerKg > 2.5) {
    warnings.push({
      type: 'protein_out_of_range',
      message: `Protein sollte zwischen 1.8-2.5 g/kg liegen (aktuell: ${input.proteinPerKg.toFixed(1)} g/kg)`
    });
  }

  // Fett-Bereich prüfen (0.8-1.2 g/kg)
  if (input.fatPerKg < 0.8 || input.fatPerKg > 1.2) {
    warnings.push({
      type: 'fat_out_of_range',
      message: `Fett sollte zwischen 0.8-1.2 g/kg liegen (aktuell: ${input.fatPerKg.toFixed(1)} g/kg)`
    });
  }

  // Aktivitätsfaktor prüfen (1.2-1.9)
  if (input.activityFactor < 1.2 || input.activityFactor > 1.9) {
    warnings.push({
      type: 'activity_factor_extreme',
      message: `Aktivitätsfaktor außerhalb des typischen Bereichs 1.2-1.9 (aktuell: ${input.activityFactor.toFixed(1)})`
    });
  }

  return warnings;
}

/**
 * Prüft, ob der Fettanteil mindestens 20% der Gesamtkalorien beträgt
 * 
 * @param fatG Fett in Gramm
 * @param targetKcal Zielkalorien
 * @returns Warnung, falls Fettanteil zu niedrig
 */
export function validateFatPercentage(fatG: number, targetKcal: number): ValidationWarning | null {
  const fatKcal = fatG * 9;
  const fatPercentage = (fatKcal / targetKcal) * 100;
  
  if (fatPercentage < 20) {
    return {
      type: 'fat_too_low',
      message: `Fettanteil liegt bei ${fatPercentage.toFixed(1)}% (empfohlen: mindestens 20%)`
    };
  }

  return null;
}

/**
 * Berechnet die komplette Makronährstoffverteilung
 * 
 * @param input Eingabeparameter
 * @returns Berechnungsergebnis mit Warnungen
 */
export function macrosFromTargets(input: CalcInput): CalcResult {
  // Eingabevalidierung
  const inputWarnings = validateInput(input);

  // BMR berechnen
  const bmr = mifflinStJeor(input.weightKg, input.heightCm, input.age, input.sex);
  
  // TDEE berechnen
  const tdeeValue = tdee(bmr, input.activityFactor);
  
  // Zielkalorien berechnen
  const targetKcal = targetCalories(tdeeValue, input.kcalAdjust);

  // Protein berechnen (in Gramm, gerundet)
  const proteinG = Math.round(input.weightKg * input.proteinPerKg);
  const proteinKcal = proteinG * 4;

  // Fett berechnen (in Gramm, gerundet)
  const fatG = Math.round(input.weightKg * input.fatPerKg);
  const fatKcal = fatG * 9;

  // Kohlenhydrate aus verbleibenden Kalorien berechnen
  const remainingKcal = targetKcal - proteinKcal - fatKcal;
  const carbsG = Math.round(Math.max(0, remainingKcal) / 4);

  // Fettanteil validieren
  const fatWarning = validateFatPercentage(fatG, targetKcal);
  const warnings = [...inputWarnings];
  if (fatWarning) {
    warnings.push(fatWarning);
  }

  // Warnung bei negativen Kohlenhydraten
  if (remainingKcal < 0) {
    warnings.push({
      type: 'fat_too_low',
      message: `Protein und Fett übersteigen die Zielkalorien. Reduziere Protein/Fett oder erhöhe die Zielkalorien.`
    });
  }

  const result: MacroResult = {
    bmr,
    tdee: tdeeValue,
    targetKcal,
    proteinG,
    fatG,
    carbsG
  };

  return {
    result,
    warnings
  };
}

/**
 * Hilfsfunktion: Berechnet die prozentuale Verteilung der Makronährstoffe
 * 
 * @param result Makronährstoff-Ergebnis
 * @returns Prozentuale Verteilung
 */
export function getMacroPercentages(result: MacroResult) {
  const proteinKcal = result.proteinG * 4;
  const fatKcal = result.fatG * 9;
  const carbsKcal = result.carbsG * 4;

  return {
    protein: Math.round((proteinKcal / result.targetKcal) * 100),
    fat: Math.round((fatKcal / result.targetKcal) * 100),
    carbs: Math.round((carbsKcal / result.targetKcal) * 100)
  };
}
