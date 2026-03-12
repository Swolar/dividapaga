import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Users, Receipt, Link2, Plus, ArrowLeft,
  UtensilsCrossed, Music, ShoppingCart, Plane, MoreHorizontal,
} from 'lucide-react'
import { PageContainer } from '../components/layout/PageContainer'
import { GlassCard } from '../components/ui/GlassCard'
import { GradientButton } from '../components/ui/GradientButton'
import { OutlineButton } from '../components/ui/OutlineButton'
import { Badge } from '../components/ui/Badge'
import { MemberAvatar } from '../components/data/MemberAvatar'
import { AmountDisplay } from '../components/data/AmountDisplay'
import { CardSkeleton } from '../components/ui/LoadingSkeleton'
import { Modal } from '../components/ui/Modal'
import { CopyButton } from '../components/ui/CopyButton'
import { useToast } from '../contexts/ToastContext'
import { api } from '../services/api'
import { getSocket } from '../services/socket'

const categoryIcons: Record<string, typeof UtensilsCrossed> = {
  jantar: UtensilsCrossed, balada: Music, mercado: ShoppingCart,
  viagem: Plane, outro: MoreHorizontal,
}

interface RoomData {
  id: string
  name: string
  description: string | null
  category: string
  owner_id: string
  member_limit: number
  status: string
  members: {
    user_id: string
    role: string
    profiles: { display_name: string; avatar_url: string | null; email: string }
  }[]
  member_count: number
}

interface BalanceData {
  user_id: string
  display_name: string
  avatar_url: string | null
  total_owed: number
  total_receivable: number
  net_balance: number
}

export function RoomOverviewPage() {
  const { id } = useParams<{ id: string }>()
  const [room, setRoom] = useState<RoomData | null>(null)
  const [balances, setBalances] = useState<BalanceData[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteModal, setInviteModal] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const { addToast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const [roomRes, balancesRes] = await Promise.all([
          api<{ data: RoomData }>(`/rooms/${id}`),
          api<{ data: BalanceData[] }>(`/rooms/${id}/balances`),
        ])
        setRoom(roomRes.data)
        setBalances(balancesRes.data)
      } catch {
        addToast('Erro ao carregar sala', 'error')
        navigate('/')
      } finally {
        setLoading(false)
      }
    }

    fetchRoom()

    // Join socket room
    const socket = getSocket()
    if (socket.connected) {
      socket.emit('join_room', { roomId: id })
    }

    socket.on('member_joined', () => fetchRoom())
    socket.on('expense_created', () => fetchRoom())
    socket.on('payment_updated', () => fetchRoom())

    return () => {
      socket.emit('leave_room', { roomId: id })
      socket.off('member_joined')
      socket.off('expense_created')
      socket.off('payment_updated')
    }
  }, [id, navigate, addToast])

  const handleGenerateInvite = async () => {
    setInviteLoading(true)
    try {
      const res = await api<{ data: { token: string } }>(`/rooms/${id}/invites`, {
        method: 'POST',
        body: { expires_hours: 72 },
      })
      const link = `${window.location.origin}/join/${res.data.token}`
      setInviteLink(link)
    } catch (err: any) {
      addToast(err.message || 'Erro ao gerar convite', 'error')
    } finally {
      setInviteLoading(false)
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </PageContainer>
    )
  }

  if (!room) return null

  const Icon = categoryIcons[room.category] || MoreHorizontal

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/')}
          className="text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-card bg-gradient-primary flex items-center justify-center">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold text-slate-100">{room.name}</h1>
              {room.description && (
                <p className="text-sm text-slate-400">{room.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <GradientButton size="sm" onClick={() => navigate(`/rooms/${id}/expenses/new`)}>
              <Plus className="w-4 h-4" /> Nova Despesa
            </GradientButton>
            <OutlineButton size="sm" onClick={() => { setInviteModal(true); handleGenerateInvite() }}>
              <Link2 className="w-4 h-4" /> Convidar
            </OutlineButton>
            <OutlineButton size="sm" onClick={() => navigate(`/rooms/${id}/expenses`)}>
              <Receipt className="w-4 h-4" /> Despesas
            </OutlineButton>
          </div>

          {/* Balances */}
          <GlassCard>
            <h3 className="text-sm font-heading font-semibold text-slate-300 mb-4">
              Balancos
            </h3>
            {balances.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma despesa registrada ainda.</p>
            ) : (
              <div className="space-y-3">
                {balances.map(b => (
                  <div key={b.user_id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <MemberAvatar name={b.display_name} url={b.avatar_url} size="sm" />
                      <span className="text-sm text-slate-200">{b.display_name}</span>
                    </div>
                    <AmountDisplay amount={b.net_balance} size="sm" showSign />
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Members Sidebar */}
        <div>
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-heading font-semibold text-slate-300">
                Membros ({room.member_count}/{room.member_limit})
              </h3>
              <Users className="w-4 h-4 text-slate-500" />
            </div>
            <div className="space-y-3">
              {room.members.map(m => (
                <div key={m.user_id} className="flex items-center gap-3">
                  <MemberAvatar
                    name={m.profiles.display_name}
                    url={m.profiles.avatar_url}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">
                      {m.profiles.display_name}
                    </p>
                  </div>
                  {m.role === 'owner' && <Badge variant="info">Criador</Badge>}
                  {m.role === 'admin' && <Badge variant="warning">Admin</Badge>}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Invite Modal */}
      <Modal open={inviteModal} onClose={() => setInviteModal(false)} title="Convidar Membros">
        {inviteLoading ? (
          <div className="flex justify-center py-4">
            <div className="skeleton h-10 w-full" />
          </div>
        ) : inviteLink ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Compartilhe este link para convidar pessoas:
            </p>
            <div className="glass-input px-4 py-3 text-sm text-slate-300 break-all">
              {inviteLink}
            </div>
            <CopyButton text={inviteLink} className="w-full justify-center" />
            <p className="text-xs text-slate-500">
              O link expira em 72 horas.
            </p>
          </div>
        ) : null}
      </Modal>
    </PageContainer>
  )
}
