import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingDown, TrendingUp, LayoutGrid, Plus } from 'lucide-react'
import { PageContainer } from '../components/layout/PageContainer'
import { Header } from '../components/layout/Header'
import { StatCard } from '../components/data/StatCard'
import { RoomCard } from '../components/room/RoomCard'
import { GlassCard } from '../components/ui/GlassCard'
import { GradientButton } from '../components/ui/GradientButton'
import { OutlineButton } from '../components/ui/OutlineButton'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { CardSkeleton } from '../components/ui/LoadingSkeleton'
import { AmountDisplay } from '../components/data/AmountDisplay'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { api } from '../services/api'
import { formatCurrency } from '../utils/currency'

interface DashboardData {
  total_owed: number
  total_receivable: number
  rooms: {
    id: string
    name: string
    category: string
    member_count: number
    status: string
    image_url?: string | null
    member_limit?: number
    owner_id?: string
  }[]
  recent_debts: {
    expense_id: string
    room_name: string
    description: string
    amount: number
    creditor_name: string
  }[]
  recent_credits: {
    expense_id: string
    room_name: string
    description: string
    amount: number
    debtor_name: string
  }[]
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [archiveModal, setArchiveModal] = useState<{ id: string; name: string } | null>(null)
  const [archiving, setArchiving] = useState(false)
  const { user } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const fetchDashboard = async () => {
    try {
      const res = await api<{ data: DashboardData }>('/dashboard')
      setData(res.data)
    } catch {
      setData({
        total_owed: 0,
        total_receivable: 0,
        rooms: [],
        recent_debts: [],
        recent_credits: [],
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  const handleArchiveRoom = (roomId: string) => {
    const room = data?.rooms.find(r => r.id === roomId)
    if (room) {
      setArchiveModal({ id: roomId, name: room.name })
    }
  }

  const confirmArchive = async () => {
    if (!archiveModal) return
    setArchiving(true)
    try {
      await api(`/rooms/${archiveModal.id}`, { method: 'DELETE' })
      addToast('Sala arquivada com sucesso!', 'success')
      setArchiveModal(null)
      fetchDashboard()
    } catch (err: any) {
      addToast(err.message || 'Erro ao arquivar sala', 'error')
    } finally {
      setArchiving(false)
    }
  }

  return (
    <PageContainer>
      <Header title="Dashboard" subtitle="Visao geral das suas contas" />

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      ) : data ? (
        <div className="space-y-8 animate-fade-in">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={TrendingDown}
              label="Voce deve"
              value={formatCurrency(data.total_owed)}
              color="red"
            />
            <StatCard
              icon={TrendingUp}
              label="Te devem"
              value={formatCurrency(data.total_receivable)}
              color="green"
            />
            <StatCard
              icon={LayoutGrid}
              label="Salas ativas"
              value={String(data.rooms.length)}
              color="purple"
            />
          </div>

          {/* Quick debts & credits */}
          {(data.recent_debts.length > 0 || data.recent_credits.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.recent_debts.length > 0 && (
                <GlassCard>
                  <h3 className="text-sm font-heading font-semibold text-slate-300 mb-4">
                    Dividas Pendentes
                  </h3>
                  <div className="space-y-3">
                    {data.recent_debts.map((d, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-200">{d.description}</p>
                          <p className="text-xs text-slate-500">{d.room_name} - {d.creditor_name}</p>
                        </div>
                        <AmountDisplay amount={-d.amount} size="sm" />
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}

              {data.recent_credits.length > 0 && (
                <GlassCard>
                  <h3 className="text-sm font-heading font-semibold text-slate-300 mb-4">
                    A Receber
                  </h3>
                  <div className="space-y-3">
                    {data.recent_credits.map((c, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-200">{c.description}</p>
                          <p className="text-xs text-slate-500">{c.room_name} - {c.debtor_name}</p>
                        </div>
                        <AmountDisplay amount={c.amount} size="sm" />
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}
            </div>
          )}

          {/* Rooms */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-heading font-semibold text-slate-200">
                Suas Salas
              </h2>
              <GradientButton size="sm" onClick={() => navigate('/rooms/new')}>
                <Plus className="w-4 h-4" />
                Nova Sala
              </GradientButton>
            </div>

            {data.rooms.length === 0 ? (
              <EmptyState
                icon={LayoutGrid}
                title="Nenhuma sala ainda"
                description="Crie sua primeira sala para comecar a dividir contas com seus amigos!"
                actionLabel="Criar Sala"
                onAction={() => navigate('/rooms/new')}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.rooms.map(room => (
                  <RoomCard
                    key={room.id}
                    id={room.id}
                    name={room.name}
                    category={room.category}
                    memberCount={room.member_count}
                    memberLimit={room.member_limit || 10}
                    status={room.status}
                    imageUrl={room.image_url}
                    isOwner={room.owner_id === user?.id}
                    onArchive={handleArchiveRoom}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Archive Confirmation Modal */}
      <Modal open={!!archiveModal} onClose={() => setArchiveModal(null)} title="Arquivar Sala">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Tem certeza que deseja arquivar a sala <strong className="text-slate-200">{archiveModal?.name}</strong>?
            A sala nao aparecera mais no dashboard, mas os dados serao mantidos.
          </p>
          <div className="flex gap-3">
            <OutlineButton size="sm" onClick={() => setArchiveModal(null)} className="flex-1">
              Cancelar
            </OutlineButton>
            <GradientButton
              size="sm"
              onClick={confirmArchive}
              loading={archiving}
              className="flex-1 !bg-gradient-to-r !from-red-500 !to-red-600"
            >
              Arquivar
            </GradientButton>
          </div>
        </div>
      </Modal>
    </PageContainer>
  )
}
