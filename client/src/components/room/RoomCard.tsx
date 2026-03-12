import { useNavigate } from 'react-router-dom'
import { Users, UtensilsCrossed, Music, ShoppingCart, Plane, MoreHorizontal } from 'lucide-react'
import { GlassCard } from '../ui/GlassCard'
import { Badge } from '../ui/Badge'

const categoryIcons: Record<string, typeof UtensilsCrossed> = {
  jantar: UtensilsCrossed,
  balada: Music,
  mercado: ShoppingCart,
  viagem: Plane,
  outro: MoreHorizontal,
}

const categoryLabels: Record<string, string> = {
  jantar: 'Jantar',
  balada: 'Balada',
  mercado: 'Mercado',
  viagem: 'Viagem',
  outro: 'Outro',
}

interface RoomCardProps {
  id: string
  name: string
  category: string
  memberCount: number
  memberLimit: number
  status: string
}

export function RoomCard({ id, name, category, memberCount, memberLimit, status }: RoomCardProps) {
  const navigate = useNavigate()
  const Icon = categoryIcons[category] || MoreHorizontal

  return (
    <GlassCard
      hover
      glow="purple"
      onClick={() => navigate(`/rooms/${id}`)}
      className="animate-fade-in"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-card bg-gradient-primary flex items-center justify-center">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <Badge variant={status === 'active' ? 'success' : 'neutral'}>
          {status === 'active' ? 'Ativa' : 'Arquivada'}
        </Badge>
      </div>

      <h3 className="text-base font-heading font-semibold text-slate-100 mb-1 truncate">
        {name}
      </h3>
      <p className="text-xs text-slate-400 mb-4">
        {categoryLabels[category] || category}
      </p>

      <div className="flex items-center gap-2 text-slate-500">
        <Users className="w-4 h-4" />
        <span className="text-xs">
          {memberCount}/{memberLimit} membros
        </span>
      </div>
    </GlassCard>
  )
}
