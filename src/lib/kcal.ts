// Einheitliche kcal-Berechnung (Quelle der Wahrheit)
export const KCAL_P = 4;
export const KCAL_C = 4;
export const KCAL_F = 9;
export function kcalOf(p: number, c: number, f: number): number {
  return p * KCAL_P + c * KCAL_C + f * KCAL_F;
}