import React from 'react';

export type MacroType = 'protein' | 'carbs' | 'fat';

interface MacroCircleIconProps {
  macro: MacroType;
  size?: number;
  className?: string;
}


// Use the same Tailwind CSS variable colors as the numbers (text-macro-*)
const macroColors: Record<MacroType, string> = {
  protein: 'var(--macro-protein, #10b981)', // fallback: emerald
  carbs: 'var(--macro-carb, #3b82f6)',      // fallback: blue
  fat: 'var(--macro-fat, #f59e42)',         // fallback: orange
};




const MacroCircleIcon: React.FC<MacroCircleIconProps> = ({ macro, size = 32, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block' }}
    >
      <circle
        cx="16"
        cy="16"
        r="16"
        fill={macroColors[macro]}
      />
    </svg>
  );
};

export default MacroCircleIcon;
