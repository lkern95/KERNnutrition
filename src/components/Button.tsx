import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  className?: string
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className = '', 
  disabled,
  ...props 
}: ButtonProps) {
  const baseClasses = `
    font-semibold rounded-lg transition-all duration-200 
    focus:ring-2 focus:ring-accent/50 focus:outline-none
    disabled:opacity-50 disabled:cursor-not-allowed
    flex items-center justify-center gap-2
  `

  const variantClasses = {
    primary: `
      bg-accent text-icon 
      hover:bg-accent/90 active:bg-accent/80
      shadow-soft
    `,
    secondary: `
      bg-text/10 text-text 
      hover:bg-text/20 active:bg-text/30
    `,
    accent: `
      bg-accent/20 text-accent border border-accent/30
      hover:bg-accent/30 active:bg-accent/40
    `,
    outline: `
      border border-accent/30 text-text
      hover:bg-accent/10 active:bg-accent/20
    `
  }

  const sizeClasses = {
    sm: 'py-2 px-4 text-sm min-h-[2.5rem]',
    md: 'py-3 px-6 text-base min-h-[3rem]',
    lg: 'py-4 px-8 text-lg min-h-[3.5rem]'
  }

  return (
    <button
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
