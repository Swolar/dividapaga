import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral'
}

const variants = {
  success: 'bg-green-500/15 text-green-400 border-green-500/20',
  danger: 'bg-red-500/15 text-red-400 border-red-500/20',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  info: 'bg-neon-blue/15 text-neon-blue border-neon-blue/20',
  neutral: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
}

export function Badge({ children, variant = 'neutral' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]}`}>
      {children}
    </span>
  )
}
