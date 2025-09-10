import React from 'react';
type Macro = 'protein' | 'carb' | 'fat';

export function MacroNum({ macro, value, unit = 'g', className = '' }:{
  macro: Macro; value: number | string; unit?: string; className?: string;
}) {
  const cls =
    macro === 'fat'     ? 'text-macro-fat' :
    macro === 'carb'    ? 'text-macro-carb' :
                          'text-macro-protein';
  return <span className={`${cls} ${className}`}>{value}{unit ? ` ${unit}` : ''}</span>;
}
