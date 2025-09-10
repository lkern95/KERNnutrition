import React from 'react'

interface SliderProps {
  label?: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  showValue?: boolean
  className?: string
  disabled?: boolean
}

export function Slider({ 
  label, 
  value, 
  onChange, 
  min = 0, 
  max = 100, 
  step = 1, 
  unit = '',
  showValue = true,
  className = '',
  disabled = false
}: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100
  const sliderId = `slider-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between items-center mb-3">
          <label 
            htmlFor={sliderId}
            className="text-sm font-medium text-text"
          >
            {label}
          </label>
          {showValue && (
            <span className="text-sm font-mono text-accent">
              {value}{unit}
            </span>
          )}
        </div>
      )}

      <div className="relative flex items-center">
        <input
          id={sliderId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className={`
            w-full h-2 bg-text/20 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer
            focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70
            disabled:opacity-50 disabled:cursor-not-allowed
            slider
          `}
          style={{
            background: `linear-gradient(to right, 
              #FFDF00 0%, 
              #FFDF00 ${percentage}%, 
              rgba(236,236,236,0.2) ${percentage}%, 
              rgba(236,236,236,0.2) 100%
            )`
          }}
        />
        {/* Value Badge/Tooltip am Thumb */}
        {showValue && (
          <span
            className="pointer-events-none absolute top-1/2 left-0 transform -translate-y-1/2"
            style={{ left: `calc(${percentage}% - 1.5rem)` }}
          >
            <span
              className="select-none text-xs px-2 py-0.5 rounded-full font-mono bg-accent text-black dark:text-zinc-900 shadow border border-accent/60"
              style={{ minWidth: '2.2rem', textAlign: 'center', transition: 'left 0.1s linear' }}
            >
              {value}{unit}
            </span>
          </span>
        )}
        <style>{`
          input[type='range'].slider::-webkit-slider-thumb {
            appearance: none;
            width: 1.5rem;
            height: 1.5rem;
            border-radius: 9999px;
            background: #FFDF00;
            border: 2px solid #222;
            box-shadow: 0 2px 8px 0 rgba(0,0,0,0.10);
            transition: box-shadow 0.15s;
          }
          input[type='range'].slider:focus::-webkit-slider-thumb {
            outline: 3px solid #facc15;
            outline-offset: 2px;
            box-shadow: 0 0 0 4px #fde04755;
          }
          input[type='range'].slider:active::-webkit-slider-thumb {
            box-shadow: 0 0 0 6px #fde04755;
          }
          input[type='range'].slider:disabled::-webkit-slider-thumb {
            background: #e5e7eb;
            border-color: #aaa;
          }
          @media (prefers-color-scheme: dark) {
            input[type='range'].slider::-webkit-slider-thumb {
              background: #fde047;
              border: 2px solid #18181b;
            }
            input[type='range'].slider:disabled::-webkit-slider-thumb {
              background: #27272a;
              border-color: #444;
            }
          }
          input[type='range'].slider::-moz-range-thumb {
            width: 1.5rem;
            height: 1.5rem;
            border-radius: 9999px;
            background: #FFDF00;
            border: 2px solid #222;
            box-shadow: 0 2px 8px 0 rgba(0,0,0,0.10);
            transition: box-shadow 0.15s;
          }
          input[type='range'].slider:focus::-moz-range-thumb {
            outline: 3px solid #facc15;
            outline-offset: 2px;
            box-shadow: 0 0 0 4px #fde04755;
          }
          input[type='range'].slider:active::-moz-range-thumb {
            box-shadow: 0 0 0 6px #fde04755;
          }
          input[type='range'].slider:disabled::-moz-range-thumb {
            background: #e5e7eb;
            border-color: #aaa;
          }
          @media (prefers-color-scheme: dark) {
            input[type='range'].slider::-moz-range-thumb {
              background: #fde047;
              border: 2px solid #18181b;
            }
            input[type='range'].slider:disabled::-moz-range-thumb {
              background: #27272a;
              border-color: #444;
            }
          }
          input[type='range'].slider::-ms-thumb {
            width: 1.5rem;
            height: 1.5rem;
            border-radius: 9999px;
            background: #FFDF00;
            border: 2px solid #222;
            box-shadow: 0 2px 8px 0 rgba(0,0,0,0.10);
            transition: box-shadow 0.15s;
          }
          input[type='range'].slider:focus::-ms-thumb {
            outline: 3px solid #facc15;
            outline-offset: 2px;
            box-shadow: 0 0 0 4px #fde04755;
          }
          input[type='range'].slider:active::-ms-thumb {
            box-shadow: 0 0 0 6px #fde04755;
          }
          input[type='range'].slider:disabled::-ms-thumb {
            background: #e5e7eb;
            border-color: #aaa;
          }
          @media (prefers-color-scheme: dark) {
            input[type='range'].slider::-ms-thumb {
              background: #fde047;
              border: 2px solid #18181b;
            }
            input[type='range'].slider:disabled::-ms-thumb {
              background: #27272a;
              border-color: #444;
            }
          }
        `}</style>
      </div>

      <div className="flex justify-between text-xs text-text/50 mt-1">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}
