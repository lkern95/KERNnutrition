import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  return (
    <div className={`
      bg-background 
      border border-accent/20 
      rounded-xl 
      shadow-soft
      ${paddingClasses[padding]}
      ${className}
    `}>
      {children}
    </div>
  )
}
