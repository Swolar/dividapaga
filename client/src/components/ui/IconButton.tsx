import type { ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  variant?: 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

export function IconButton({ icon: Icon, variant = 'ghost', size = 'md', className = '', ...props }: IconButtonProps) {
  const variants = {
    ghost: 'text-slate-400 hover:text-slate-200 hover:bg-white/10',
    danger: 'text-slate-400 hover:text-red-400 hover:bg-red-400/10',
  }

  const sizes = {
    sm: 'p-1.5',
    md: 'p-2',
  }

  return (
    <button
      className={`rounded-lg transition-all duration-200 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      <Icon className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} />
    </button>
  )
}
