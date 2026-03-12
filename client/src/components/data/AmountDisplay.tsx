import { formatCurrency } from '../../utils/currency'

interface AmountDisplayProps {
  amount: number
  size?: 'sm' | 'md' | 'lg'
  showSign?: boolean
}

const sizes = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
}

export function AmountDisplay({ amount, size = 'md', showSign = false }: AmountDisplayProps) {
  const color = amount > 0 ? 'text-green-400' : amount < 0 ? 'text-red-400' : 'text-slate-400'
  const sign = showSign && amount > 0 ? '+' : ''

  return (
    <span className={`${sizes[size]} font-display font-semibold ${color}`}>
      {sign}{formatCurrency(Math.abs(amount))}
    </span>
  )
}
