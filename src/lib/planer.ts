

import type { UserProfile } from '../store/appStore'
import { calculateBMR } from './nutrition'

export interface PlanerMacroResult {
  protein: number;
  fat: number;
  carbs: number;
}

export interface PlanerResult {
  kcalTrain: number;
  kcalRest: number;
  weeklyAverage: number;
  weeklyDeviation: number;
  formulaBlock: string;
  warnings: string[];
  macrosTrain: PlanerMacroResult;
  macrosRest: PlanerMacroResult;
  macrosAvg: PlanerMacroResult;
}


/**
 * Erweiterte Planer-Berechnung inkl. Makros für Trainingstag/Ruhetag/Wochenmittel.
 * @param dailyTarget kcal-Ziel (Basis)
 * @param nTrainDays Anzahl Trainingstage
 * @param offset kcal-Offset für Trainingstage
 * @param profile UserProfile (für Gewicht)
 * @param proteinPerKg Protein in g/kg (default 2.0)
 * @param fatPerKg Fett in g/kg (default 1.0)
 * @param fatSplitMode Wenn true: 20% der Kalorien-Differenz werden auf Fett verteilt, 80% auf Carbs
 */
export function calculatePlaner(
  dailyTarget: number,
  nTrainDays: number,
  offset: number,
  profile?: UserProfile,
  proteinPerKg: number = 2.0,
  fatPerKg: number = 1.0,
  fatSplitMode: boolean = false
): PlanerResult {
  const warnings: string[] = [];
  if (nTrainDays < 0 || nTrainDays > 6) throw new Error('Anzahl Trainingstage muss zwischen 0 und 6 liegen');
  if (7 - nTrainDays === 0) throw new Error('Bei 7 Trainingstagen gibt es keine Ruhetage');
  if (!isFinite(dailyTarget) || dailyTarget <= 0) throw new Error('Tagesziel muss positiv sein');
  if (!isFinite(offset)) throw new Error('Offset muss eine Zahl sein');
  if (!profile || !profile.weight) throw new Error('User-Gewicht erforderlich für Makro-Berechnung');

  // kcal
  const kcalTrain = dailyTarget + offset;
  const kcalRest = (7 * dailyTarget - nTrainDays * kcalTrain) / (7 - nTrainDays);
  const weeklyAverage = (nTrainDays * kcalTrain + (7 - nTrainDays) * kcalRest) / 7;
  const weeklyDeviation = Math.round(weeklyAverage - dailyTarget);

  // Protein konstant (g)
  const proteinG = Math.round(profile.weight * proteinPerKg);

  // Fett
  let fatTrain: number, fatRest: number;
  if (!fatSplitMode) {
    // Fett konstant
    fatTrain = fatRest = Math.round(profile.weight * fatPerKg);
  } else {
    // 20% der kcal-Differenz auf Fett, 80% auf Carbs
    const baseFat = profile.weight * fatPerKg;
    const fatDiff = (kcalTrain - kcalRest) * 0.2 / 9;
    fatTrain = Math.round(baseFat + fatDiff);
    fatRest = Math.round(baseFat);
  }

  // Carbs
  let carbsTrain = (kcalTrain - (proteinG * 4 + fatTrain * 9)) / 4;
  let carbsRest = (kcalRest - (proteinG * 4 + fatRest * 9)) / 4;

  // Runden auf ganze g, letzten Makro zum Ausgleich anpassen
  let cTrain = Math.round(carbsTrain);
  let cRest = Math.round(carbsRest);
  // Ausgleich: Carbs als Rest, Protein und Fett bleiben exakt
  cTrain = Math.round((kcalTrain - (proteinG * 4 + fatTrain * 9)) / 4);
  cRest = Math.round((kcalRest - (proteinG * 4 + fatRest * 9)) / 4);

  // Wochenmittel
  const avg = (nTrainDays: number, valTrain: number, valRest: number) =>
    (nTrainDays * valTrain + (7 - nTrainDays) * valRest) / 7;
  const macrosTrain = { protein: proteinG, fat: fatTrain, carbs: cTrain };
  const macrosRest = { protein: proteinG, fat: fatRest, carbs: cRest };
  const macrosAvg = {
    protein: Math.round(avg(nTrainDays, proteinG, proteinG)),
    fat: Math.round(avg(nTrainDays, fatTrain, fatRest)),
    carbs: Math.round(avg(nTrainDays, cTrain, cRest)),
  };

  // BMR-Warnung
  if (profile) {
    try {
      const bmr = calculateBMR(profile);
      if (kcalRest < 0.8 * bmr) {
        warnings.push('Ruhetag-Kalorien liegen unter 80% des Grundumsatzes – prüfe, ob das sinnvoll ist.');
      }
    } catch {}
  }

  // Formelblock
  const formulaBlock =
    `kcal_train = daily_target + offset = ${dailyTarget} + ${offset} = ${kcalTrain}\n` +
    `kcal_rest = (7 * daily_target - n * kcal_train) / (7 - n) = (7 * ${dailyTarget} - ${nTrainDays} * ${kcalTrain}) / (7 - ${nTrainDays}) = ${kcalRest.toFixed(2)}\n` +
    `Protein (g): ${proteinG}\nFett (g): Trainingstag ${fatTrain}, Ruhetag ${fatRest}\nCarbs (g): Trainingstag ${cTrain}, Ruhetag ${cRest}\n` +
    `Carbs_train = (kcal_train - (P*4 + F*9)) / 4 = (${kcalTrain} - (${proteinG}*4 + ${fatTrain}*9)) / 4 = ${cTrain}\n` +
    `Carbs_rest  = (kcal_rest  - (P*4 + F*9)) / 4 = (${kcalRest.toFixed(2)} - (${proteinG}*4 + ${fatRest}*9)) / 4 = ${cRest}\n` +
    `Wochenmittel = (n * kcal_train + (7-n) * kcal_rest) / 7 = (${nTrainDays} * ${kcalTrain} + ${7-nTrainDays} * ${kcalRest.toFixed(2)}) / 7 = ${weeklyAverage.toFixed(2)}\n` +
    `Abweichung = Wochenmittel - Tagesziel = ${weeklyAverage.toFixed(2)} - ${dailyTarget} = ${weeklyDeviation}`;

  return {
    kcalTrain: Math.round(kcalTrain),
    kcalRest: Math.round(kcalRest),
    weeklyAverage: Math.round(weeklyAverage),
    weeklyDeviation,
    formulaBlock,
    warnings,
    macrosTrain,
    macrosRest,
    macrosAvg,
  };
}
