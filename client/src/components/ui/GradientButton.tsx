import type { ReactNode, ButtonHTMLAttributes } from 'react'
import { Spinner } from './Spinner'

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  loading?: boolean
  variant?: 'primary' | 'accent'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

export function GradientButton({
  children,
  loading = false,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled,
  className = '',
  ...props
}: GradientButtonProps) {
  const gradients = {
    primary: 'bg-gradient-primary hover:shadow-glow-blue',
    accent: 'bg-gradient-accent hover:shadow-glow-accent',
  }

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  }

  return (
    <button
      disabled={disabled || loading}
      className={`
        ${gradients[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        text-white font-semibold rounded-[12px]
        transition-all duration-200
        hover:-translate-y-0.5 active:translate-y-0
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
        flex items-center justify-center gap-2
        ${className}
      `}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
