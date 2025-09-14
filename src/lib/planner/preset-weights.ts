
// Preset-Gewichte jetzt role-basiert
type MealLike = { role?: 'wake'|'pre'|'post'|'sleep'|'neutral'|string };

function is(m: MealLike, r: string) { return (m?.role ?? 'neutral') === r; }

export function buildCarbPresetWeights(inputs: { preset?: string; isTrainingDay?: boolean }, meals: MealLike[]) {
  const n = meals?.length ?? 0;
  if (!n) return [];
  const preset = (inputs?.preset ?? 'standard') as string;

  // Basis: even
  let w = Array(n).fill(1);

  const preIdx  = meals.findIndex(m => is(m,'pre'));
  const postIdx = meals.findIndex(m => is(m,'post'));

  // Ruhetag-Mapping
  const isRest = inputs?.isTrainingDay === false;
  const eff = isRest
    ? (preset === 'amCarbs' ? 'restAM' : preset === 'pmCarbs' || preset === 'backload' || preset === 'standard' ? 'restEven' : preset)
    : preset;

  switch (eff) {
    case 'even': /* alles 1 */ break;
    case 'standard':
      if (preIdx  >= 0) w[preIdx]  = 3;
      if (postIdx >= 0) w[postIdx] = 4;
      // Hauptmahlzeiten leicht bevorzugen
      w = w.map((v, i) => v * ((meals[i]?.role ?? 'neutral') === 'neutral' ? 1.25 : 1));
      break;
    case 'amCarbs':
      w = w.map((v, i) => {
        const r = meals[i]?.role ?? 'neutral';
        if (r === 'wake') return v * 1.6;
        if (r === 'pre')  return v * 1.2;
        if (r === 'post') return v * 0.9;
        return v;
      });
      break;
    case 'pmCarbs':
      w = w.map((v, i) => {
        const r = meals[i]?.role ?? 'neutral';
        if (r === 'post')  return v * 1.7;
        if (r === 'sleep') return v * 1.25;
        if (r === 'wake')  return v * 0.8;
        return v;
      });
      break;
    case 'backload':
      if (postIdx >= 0) w[postIdx] *= 2.0;
      // letzte „neutral“-Meal extra betonen
      for (let i = n - 1; i >= 0; i--) { if ((meals[i]?.role ?? 'neutral') === 'neutral') { w[i] *= 2.0; break; } }
      w = w.map((v, i) => ((meals[i]?.role ?? 'neutral') === 'wake' ? v * 0.7 : v));
      break;
    case 'restEven':
      w = w.map((v, i) => {
        const r = meals[i]?.role ?? 'neutral';
        return (r === 'pre' || r === 'post') ? v * 0.6 : v;
      });
      break;
    case 'restAM':
      w = w.map((v, i) => {
        const r = meals[i]?.role ?? 'neutral';
        if (r === 'wake')  return v * 1.6;
        if (r === 'sleep') return v * 0.85;
        return v;
      });
      break;
    case 'leanPM':
      // Fett-Deckel-Thema, KH neutral
      break;
  }

  // Safety
  w = w.map(x => (Number.isFinite(x) && x > 0 ? x : 1));
  const sum = w.reduce((a,b)=>a+b,0);
  return sum > 0 ? w : Array(n).fill(1);
}
