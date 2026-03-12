import { forwardRef, type InputHTMLAttributes } from 'react'

interface CurrencyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ label, value, onChange, error, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value.replace(/[^\d]/g, '')
      if (!raw) {
        onChange('')
        return
      }

      const cents = parseInt(raw, 10)
      const formatted = (cents / 100).toFixed(2).replace('.', ',')
      onChange(formatted)
    }

    return (
      <div className="w-full">
        <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium">
            R$
          </span>
          <input
            ref={ref}
            type="text"
            inputMode="numeric"
            value={value}
            onChange={handleChange}
            className={`
              w-full glass-input pl-10 pr-4 py-3 text-sm text-slate-100 font-display font-semibold
              placeholder:text-slate-500
              focus:outline-none focus:border-neon-purple/50 focus:ring-1 focus:ring-neon-purple/30
              transition-all duration-200
              ${error ? 'border-red-500/50' : ''}
            `}
            placeholder="0,00"
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)

CurrencyInput.displayName = 'CurrencyInput'
