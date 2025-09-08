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
      
      <div className="relative">
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
            w-full h-2 bg-text/20 rounded-lg appearance-none cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-accent/50
            disabled:opacity-50 disabled:cursor-not-allowed
            slider
          `}
          style={{
            background: `linear-gradient(to right, 
              #FFDF00 0%, 
              #FFDF00 ${percentage}%, 
              rgba(236, 236, 236, 0.2) ${percentage}%, 
              rgba(236, 236, 236, 0.2) 100%
            )`
          }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-text/50 mt-1">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}
