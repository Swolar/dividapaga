import type { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  glow?: 'blue' | 'purple' | 'accent' | 'none'
  className?: string
  onClick?: () => void
  hover?: boolean
}

const glowMap = {
  blue: 'hover:shadow-glow-blue',
  purple: 'hover:shadow-glow-purple',
  accent: 'hover:shadow-glow-accent',
  none: '',
}

export function GlassCard({ children, glow = 'none', className = '', onClick, hover = false }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        glass p-6 transition-all duration-200
        ${hover ? 'hover:-translate-y-0.5 cursor-pointer' : ''}
        ${glowMap[glow]}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}
