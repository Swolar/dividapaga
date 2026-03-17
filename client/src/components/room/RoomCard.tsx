import { useNavigate } from 'react-router-dom'
import { Users, Trash2, UtensilsCrossed, Music, ShoppingCart, Plane, MoreHorizontal } from 'lucide-react'
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
  imageUrl?: string | null
  isOwner?: boolean
  onArchive?: (roomId: string) => void
}

export function RoomCard({ id, name, category, memberCount, memberLimit, status, imageUrl, isOwner, onArchive }: RoomCardProps) {
  const navigate = useNavigate()
  const Icon = categoryIcons[category] || MoreHorizontal

  return (
    <GlassCard
      hover
      glow="purple"
      onClick={() => navigate(`/rooms/${id}`)}
      className="animate-fade-in overflow-hidden"
    >
      {imageUrl && (
        <div className="-mx-6 -mt-6 mb-4 h-32 overflow-hidden">
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-card bg-gradient-primary flex items-center justify-center">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex items-center gap-2">
          {isOwner && onArchive && status === 'active' && (
            <button
              onClick={(e) => { e.stopPropagation(); onArchive(id) }}
              className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-colors"
              title="Arquivar sala"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <Badge variant={status === 'active' ? 'success' : 'neutral'}>
            {status === 'active' ? 'Ativa' : 'Arquivada'}
          </Badge>
        </div>
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
