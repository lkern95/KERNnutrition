import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: React.ReactNode
  className?: string
}

export function Input({ 
  label, 
  error, 
  hint, 
  icon, 
  className = '', 
  id,
  ...props 
}: InputProps) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
  
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-text mb-2"
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text/50">
            {icon}
          </div>
        )}
        
        <input
          id={inputId}
          className={`
            w-full px-4 py-3 
            ${icon ? 'pl-10' : ''}
            bg-background 
            border rounded-lg
            text-text placeholder-text/50
            focus:ring-2 focus:ring-accent/50 focus:outline-none
            transition-all duration-200
            min-h-[3rem]
            ${error 
              ? 'border-red-500 focus:border-red-500' 
              : 'border-accent/20 focus:border-accent/50'
            }
          `}
          {...props}
        />
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
      
      {hint && !error && (
        <p className="mt-1 text-sm text-text/60">
          {hint}
        </p>
      )}
    </div>
  )
}
