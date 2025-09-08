import React from 'react'
import { Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

interface BannerProps {
  type: 'info' | 'warning' | 'success' | 'error'
  title?: string
  children: React.ReactNode
  onDismiss?: () => void
  className?: string
}

export function InfoBanner({ 
  type, 
  title, 
  children, 
  onDismiss, 
  className = '' 
}: BannerProps) {
  const config = {
    info: {
      icon: Info,
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      iconColor: 'text-blue-400',
      textColor: 'text-text'
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
      iconColor: 'text-yellow-400',
      textColor: 'text-text'
    },
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
      iconColor: 'text-green-400',
      textColor: 'text-text'
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      iconColor: 'text-red-400',
      textColor: 'text-text'
    }
  }

  const { icon: Icon, bgColor, borderColor, iconColor, textColor } = config[type]

  return (
    <div className={`
      ${bgColor} ${borderColor} ${textColor}
      border rounded-lg p-4 
      ${className}
    `}>
      <div className="flex items-start gap-3">
        <div className={`
          flex-shrink-0 w-8 h-8 rounded-lg bg-accent/20 
          flex items-center justify-center
        `}>
          <Icon size={18} className={`${iconColor}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="font-semibold text-sm mb-1">
              {title}
            </h3>
          )}
          
          <div className="text-sm leading-relaxed">
            {children}
          </div>
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`
              flex-shrink-0 p-1 rounded hover:bg-black/10 
              transition-colors ${iconColor}
            `}
            aria-label="Banner schließen"
          >
            <XCircle size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

export function WarningBanner(props: Omit<BannerProps, 'type'>) {
  return <InfoBanner {...props} type="warning" />
}
