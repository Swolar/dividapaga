import type { ReactNode, ButtonHTMLAttributes } from 'react'

interface OutlineButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

export function OutlineButton({
  children,
  size = 'md',
  fullWidth = false,
  className = '',
  ...props
}: OutlineButtonProps) {
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  }

  return (
    <button
      className={`
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        btn-outline flex items-center justify-center gap-2
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  )
}
