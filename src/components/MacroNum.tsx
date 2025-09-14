import React from 'react';
type Macro = 'protein' | 'carb' | 'fat';

export function MacroNum({ macro, value, unit = 'g', className = '' }:{
  macro: Macro; value: number | string; unit?: string; className?: string;
}) {
  // Nur Textfarbe, kein Hintergrund
  const cls =
    macro === 'fat'     ? 'text-[color:var(--macro-fat)]' :
    macro === 'carb'    ? 'text-[color:var(--macro-carb)]' :
                          'text-[color:var(--macro-protein)]';
  return <span className={`font-mono tabular-nums text-base font-bold ${cls} ${className}`}>{value}{unit ? ` ${unit}` : ''}</span>;
}
