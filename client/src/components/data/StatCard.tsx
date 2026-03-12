import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string
  color?: 'blue' | 'purple' | 'green' | 'red' | 'amber'
}

const colorMap = {
  blue: { bg: 'bg-neon-blue/10', text: 'text-neon-blue', icon: 'text-neon-blue' },
  purple: { bg: 'bg-neon-purple/10', text: 'text-neon-purple', icon: 'text-neon-purple' },
  green: { bg: 'bg-green-500/10', text: 'text-green-400', icon: 'text-green-400' },
  red: { bg: 'bg-red-500/10', text: 'text-red-400', icon: 'text-red-400' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: 'text-amber-400' },
}

export function StatCard({ icon: Icon, label, value, color = 'blue' }: StatCardProps) {
  const c = colorMap[color]

  return (
    <div className="glass p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-card ${c.bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
      </div>
      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-display font-bold ${c.text}`}>{value}</p>
    </div>
  )
}
