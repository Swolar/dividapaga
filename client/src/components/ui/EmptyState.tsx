import type { LucideIcon } from 'lucide-react'
import { GradientButton } from './GradientButton'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-neon-purple/10 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-neon-purple" />
      </div>
      <h3 className="text-lg font-heading font-semibold text-slate-200 mb-2">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <GradientButton onClick={onAction}>{actionLabel}</GradientButton>
      )}
    </div>
  )
}
