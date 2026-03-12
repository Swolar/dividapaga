import { forwardRef, type SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: { value: string; label: string }[]
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          {label}
        </label>
        <select
          ref={ref}
          className={`
            w-full glass-input px-4 py-3 text-sm text-slate-100
            bg-bg-secondary
            focus:outline-none focus:border-neon-purple/50 focus:ring-1 focus:ring-neon-purple/30
            transition-all duration-200 appearance-none
            ${error ? 'border-red-500/50' : ''}
            ${className}
          `}
          {...props}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value} className="bg-bg-secondary">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'
