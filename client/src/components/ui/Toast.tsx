import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
}

const colorMap = {
  success: 'border-green-500/30 bg-green-500/10',
  error: 'border-red-500/30 bg-red-500/10',
  info: 'border-neon-blue/30 bg-neon-blue/10',
  warning: 'border-amber-500/30 bg-amber-500/10',
}

const iconColorMap = {
  success: 'text-green-400',
  error: 'text-red-400',
  info: 'text-neon-blue',
  warning: 'text-amber-400',
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => {
        const Icon = iconMap[toast.type]
        return (
          <div
            key={toast.id}
            className={`
              glass-sm flex items-center gap-3 px-4 py-3 border
              animate-slide-up
              ${colorMap[toast.type]}
            `}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 ${iconColorMap[toast.type]}`} />
            <p className="text-sm text-slate-200 flex-1">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
