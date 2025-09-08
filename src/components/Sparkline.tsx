import React, { useRef, useEffect } from 'react'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  strokeWidth?: number
  className?: string
  showDots?: boolean
}

export function Sparkline({ 
  data, 
  width = 100, 
  height = 40, 
  color = '#FFDF00', 
  strokeWidth = 2,
  className = '',
  showDots = false
}: SparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length < 2) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Set up scaling
    const minValue = Math.min(...data)
    const maxValue = Math.max(...data)
    const valueRange = maxValue - minValue || 1 // Avoid division by zero
    
    const padding = 4
    const drawWidth = width - 2 * padding
    const drawHeight = height - 2 * padding
    
    const stepX = drawWidth / (data.length - 1)

    // Draw line
    ctx.strokeStyle = color
    ctx.lineWidth = strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    ctx.beginPath()
    
    data.forEach((value, index) => {
      const x = padding + index * stepX
      const y = padding + drawHeight - ((value - minValue) / valueRange) * drawHeight
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    
    ctx.stroke()

    // Draw dots if enabled
    if (showDots) {
      ctx.fillStyle = color
      
      data.forEach((value, index) => {
        const x = padding + index * stepX
        const y = padding + drawHeight - ((value - minValue) / valueRange) * drawHeight
        
        ctx.beginPath()
        ctx.arc(x, y, strokeWidth + 1, 0, 2 * Math.PI)
        ctx.fill()
      })
    }
  }, [data, width, height, color, strokeWidth, showDots])

  if (data.length < 2) {
    return (
      <div 
        className={`flex items-center justify-center text-text/50 text-xs ${className}`}
        style={{ width, height }}
      >
        Nicht genügend Daten
      </div>
    )
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`${className}`}
      style={{ width, height }}
    />
  )
}
