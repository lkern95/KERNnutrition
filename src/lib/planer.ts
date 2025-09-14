


// ---- Hilfsfunktionen: Rundung bei erhaltener Summe ----
export function roundKeepSum(values: number[], target: number, step = 5, locked?: boolean[]) {
  // locked: Einträge, die NICHT angepasst werden dürfen (z. B. feste Caps/Floors; hier selten nötig)
  const n = values.length;
  const L = locked ?? Array(n).fill(false);

  // Roh -> Schritte
  const rawSteps = values.map(v => v / step);
  const floors = rawSteps.map(x => Math.floor(x));
  const frac = rawSteps.map((x, i) => ({ i, r: x - floors[i] }));

  let sumFloors = floors.reduce((a, b) => a + b, 0);
  const need = Math.round(target / step) - sumFloors;

  if (need > 0) {
    // Verteile +1 Schritt an die größten Bruchteile (ohne gesperrte)
    const order = frac
      .filter(f => !L[f.i])
      .sort((a, b) => b.r - a.r || a.i - b.i)
      .map(x => x.i);
    for (let k = 0; k < need; k++) floors[order[k % order.length]] += 1;
  } else if (need < 0) {
    // Nimm -1 bei den kleinsten Bruchteilen (ohne gesperrte)
    const order = frac
      .filter(f => !L[f.i])
      .sort((a, b) => a.r - b.r || b.i - a.i)
      .map(x => x.i);
    for (let k = 0; k < -need; k++) floors[order[k % order.length]] -= 1;
  }

  return floors.map(x => x * step);
}

export function distributeWithFloors(total: number, floors: number[], weights?: number[]) {
  // floors = Mindestgramm je Slot (kann 0 sein)
  const n = floors.length;
  const baseSum = floors.reduce((a, b) => a + b, 0);
  const rest = Math.max(0, total - baseSum);
  const w = weights && weights.some(x => x > 0) ? weights : Array(n).fill(1);
  const wSum = w.reduce((a, b) => a + b, 0);
  return floors.map((f, i) => f + (w[i] / wSum) * rest);
}

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


  // --- Neue Makro-Berechnung mit Hilfsfunktionen ---
  // Protein: konstant, auf 5g gerundet
  const proteinG = roundKeepSum([
    profile.weight * proteinPerKg,
    profile.weight * proteinPerKg
  ], 2 * profile.weight * proteinPerKg, 5)[0];

  // Fett: wie bisher, aber auf 5g gerundet
  let fatTrain: number, fatRest: number;
  if (!fatSplitMode) {
    fatTrain = fatRest = roundKeepSum([
      profile.weight * fatPerKg,
      profile.weight * fatPerKg
    ], 2 * profile.weight * fatPerKg, 5)[0];
  } else {
    const baseFat = profile.weight * fatPerKg;
    const fatDiff = (kcalTrain - kcalRest) * 0.2 / 9;
    [fatTrain, fatRest] = roundKeepSum([
      baseFat + fatDiff,
      baseFat
    ], 2 * baseFat + fatDiff, 5);
  }

  // Carbs: Rest aus kcal, auf 5g gerundet, Summe stimmt exakt
  const carbsTrainRaw = (kcalTrain - (proteinG * 4 + fatTrain * 9)) / 4;
  const carbsRestRaw = (kcalRest - (proteinG * 4 + fatRest * 9)) / 4;
  const [cTrain, cRest] = roundKeepSum([
    carbsTrainRaw,
    carbsRestRaw
  ], carbsTrainRaw + carbsRestRaw, 5);

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
