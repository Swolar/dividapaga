import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, Users, Home, Receipt, DollarSign, Wifi, WifiOff,
  Trash2, RotateCcw, ChevronDown, ChevronUp, ArrowLeft, Crown,
} from 'lucide-react'
import { PageContainer } from '../components/layout/PageContainer'
import { GlassCard } from '../components/ui/GlassCard'
import { GradientButton } from '../components/ui/GradientButton'
import { OutlineButton } from '../components/ui/OutlineButton'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { MemberAvatar } from '../components/data/MemberAvatar'
import { CardSkeleton } from '../components/ui/LoadingSkeleton'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { api } from '../services/api'
import { formatCurrency } from '../utils/currency'
import { getSocket } from '../services/socket'

interface AdminStats {
  total_users: number
  online_users: number
  online_user_ids: string[]
  total_rooms: number
  active_rooms: number
  total_expenses: number
  unpaid_splits: number
  total_pending: number
}

interface AdminUser {
  id: string
  email: string
  display_name: string
  avatar_url: string | null
  pix_key: string | null
  is_admin: boolean
  is_online: boolean
  room_count: number
  expense_count: number
  total_owed: number
  created_at: string
}

interface AdminRoom {
  id: string
  name: string
  category: string
  status: string
  owner_id: string
  member_limit: number
  image_url: string | null
  created_at: string
  profiles: { display_name: string; email: string }
  member_count: number
  expense_count: number
}

type Tab = 'stats' | 'users' | 'rooms'

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('stats')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [rooms, setRooms] = useState<AdminRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{
    type: 'archive' | 'delete' | 'reset' | 'admin'
    id: string
    name: string
    extra?: boolean
  } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const { user } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  // Real-time online count
  useEffect(() => {
    const socket = getSocket()
    socket.emit('join_admin')

    const handleOnlineCount = (data: { count: number }) => {
      setStats(prev => prev ? { ...prev, online_users: data.count } : prev)
    }

    socket.on('online_count', handleOnlineCount)
    return () => { socket.off('online_count', handleOnlineCount) }
  }, [])

  const fetchStats = async () => {
    try {
      const res = await api<{ data: AdminStats }>('/admin/stats')
      setStats(res.data)
    } catch {
      addToast('Erro ao carregar estatisticas', 'error')
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await api<{ data: AdminUser[] }>('/admin/users')
      setUsers(res.data)
    } catch {
      addToast('Erro ao carregar usuarios', 'error')
    }
  }

  const fetchRooms = async () => {
    try {
      const res = await api<{ data: AdminRoom[] }>('/admin/rooms')
      setRooms(res.data)
    } catch {
      addToast('Erro ao carregar salas', 'error')
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchStats(), fetchUsers(), fetchRooms()])
      setLoading(false)
    }
    load()
  }, [])

  const handleAction = async () => {
    if (!confirmModal) return
    setActionLoading(true)
    try {
      switch (confirmModal.type) {
        case 'archive':
          await api(`/admin/rooms/${confirmModal.id}`, { method: 'DELETE' })
          addToast('Sala arquivada!', 'success')
          fetchRooms()
          fetchStats()
          break
        case 'delete':
          await api(`/admin/rooms/${confirmModal.id}/permanent`, { method: 'DELETE' })
          addToast('Sala deletada permanentemente!', 'success')
          fetchRooms()
          fetchStats()
          break
        case 'reset':
          await api(`/admin/users/${confirmModal.id}/reset-balance`, { method: 'POST' })
          addToast('Saldos zerados!', 'success')
          fetchUsers()
          fetchStats()
          break
        case 'admin':
          await api(`/admin/users/${confirmModal.id}/admin`, {
            method: 'PATCH',
            body: { is_admin: confirmModal.extra },
          })
          addToast(confirmModal.extra ? 'Promovido a admin!' : 'Admin removido!', 'success')
          fetchUsers()
          break
      }
    } catch (err: any) {
      addToast(err.message || 'Erro ao executar acao', 'error')
    } finally {
      setActionLoading(false)
      setConfirmModal(null)
    }
  }

  if (!user?.is_admin) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20">
          <Shield className="w-16 h-16 text-slate-600 mb-4" />
          <h2 className="text-xl font-heading font-bold text-slate-300">Acesso Restrito</h2>
          <p className="text-sm text-slate-500 mt-2">Apenas administradores podem acessar esta pagina.</p>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/')}
          className="text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-card bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-slate-100">Painel Admin</h1>
            <p className="text-xs text-slate-400">Gerenciamento da plataforma</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {([
          { key: 'stats' as Tab, label: 'Estatisticas', icon: Receipt },
          { key: 'users' as Tab, label: 'Usuarios', icon: Users },
          { key: 'rooms' as Tab, label: 'Salas', icon: Home },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-card text-sm font-medium transition-all whitespace-nowrap ${
              tab === t.key
                ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30'
                : 'bg-white/[0.03] text-slate-400 border border-border-glass hover:text-slate-200'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <>
          {/* Stats Tab */}
          {tab === 'stats' && stats && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <GlassCard className="text-center">
                  <Users className="w-6 h-6 text-neon-blue mx-auto mb-2" />
                  <p className="text-2xl font-display font-bold text-slate-100">{stats.total_users}</p>
                  <p className="text-xs text-slate-400">Usuarios Cadastrados</p>
                </GlassCard>
                <GlassCard className="text-center">
                  <Wifi className="w-6 h-6 text-green-400 mx-auto mb-2" />
                  <p className="text-2xl font-display font-bold text-green-400">{stats.online_users}</p>
                  <p className="text-xs text-slate-400">Online Agora</p>
                </GlassCard>
                <GlassCard className="text-center">
                  <Home className="w-6 h-6 text-neon-purple mx-auto mb-2" />
                  <p className="text-2xl font-display font-bold text-slate-100">{stats.active_rooms}</p>
                  <p className="text-xs text-slate-500">de {stats.total_rooms} total</p>
                  <p className="text-xs text-slate-400">Salas Ativas</p>
                </GlassCard>
                <GlassCard className="text-center">
                  <Receipt className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                  <p className="text-2xl font-display font-bold text-slate-100">{stats.total_expenses}</p>
                  <p className="text-xs text-slate-400">Despesas Criadas</p>
                </GlassCard>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <GlassCard glow="accent">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="w-5 h-5 text-red-400" />
                    <h3 className="text-sm font-heading font-semibold text-slate-300">Pendente na Plataforma</h3>
                  </div>
                  <p className="text-3xl font-display font-bold text-red-400">
                    {formatCurrency(stats.total_pending)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {stats.unpaid_splits} splits nao pagos
                  </p>
                </GlassCard>
                <GlassCard>
                  <div className="flex items-center gap-3 mb-2">
                    <Wifi className="w-5 h-5 text-green-400" />
                    <h3 className="text-sm font-heading font-semibold text-slate-300">Usuarios Online</h3>
                  </div>
                  {users.filter(u => u.is_online).length === 0 ? (
                    <p className="text-sm text-slate-500">Nenhum usuario online no momento</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {users.filter(u => u.is_online).map(u => (
                        <div key={u.id} className="flex items-center gap-2 bg-green-500/10 rounded-full px-3 py-1">
                          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                          <span className="text-xs text-green-300">{u.display_name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {tab === 'users' && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-xs text-slate-500 mb-2">{users.length} usuarios cadastrados</p>
              {users.map(u => (
                <GlassCard key={u.id} className="!p-0">
                  <button
                    onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                    className="w-full flex items-center gap-3 p-4"
                  >
                    <div className="relative">
                      <MemberAvatar name={u.display_name} url={u.avatar_url} size="sm" />
                      {u.is_online && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-bg-primary" />
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-200 truncate">{u.display_name}</p>
                        {u.is_admin && <Badge variant="warning">Admin</Badge>}
                        {u.is_online ? (
                          <Wifi className="w-3 h-3 text-green-400 flex-shrink-0" />
                        ) : (
                          <WifiOff className="w-3 h-3 text-slate-600 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{u.email}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-medium text-red-400">
                        {u.total_owed > 0 ? `-${formatCurrency(u.total_owed)}` : formatCurrency(0)}
                      </p>
                      <p className="text-xs text-slate-500">{u.room_count} salas</p>
                    </div>
                    {expandedUser === u.id ? (
                      <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    )}
                  </button>

                  {expandedUser === u.id && (
                    <div className="px-4 pb-4 pt-0 border-t border-border-glass">
                      <div className="grid grid-cols-3 gap-3 py-3 text-center">
                        <div>
                          <p className="text-lg font-display font-bold text-slate-200">{u.room_count}</p>
                          <p className="text-xs text-slate-500">Salas</p>
                        </div>
                        <div>
                          <p className="text-lg font-display font-bold text-slate-200">{u.expense_count}</p>
                          <p className="text-xs text-slate-500">Despesas</p>
                        </div>
                        <div>
                          <p className="text-lg font-display font-bold text-red-400">
                            {formatCurrency(u.total_owed)}
                          </p>
                          <p className="text-xs text-slate-500">Deve</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {u.total_owed > 0 && (
                          <OutlineButton
                            size="sm"
                            onClick={() => setConfirmModal({ type: 'reset', id: u.id, name: u.display_name })}
                          >
                            <RotateCcw className="w-3 h-3" /> Zerar Saldos
                          </OutlineButton>
                        )}
                        {u.id !== user?.id && (
                          <OutlineButton
                            size="sm"
                            onClick={() => setConfirmModal({
                              type: 'admin',
                              id: u.id,
                              name: u.display_name,
                              extra: !u.is_admin,
                            })}
                            className={u.is_admin ? '!border-red-500/30 !text-red-400' : '!border-amber-500/30 !text-amber-400'}
                          >
                            <Crown className="w-3 h-3" />
                            {u.is_admin ? 'Remover Admin' : 'Promover Admin'}
                          </OutlineButton>
                        )}
                      </div>
                      {u.pix_key && (
                        <p className="text-xs text-slate-500 mt-2">
                          Pix: <span className="text-slate-400">{u.pix_key}</span>
                        </p>
                      )}
                    </div>
                  )}
                </GlassCard>
              ))}
            </div>
          )}

          {/* Rooms Tab */}
          {tab === 'rooms' && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-xs text-slate-500 mb-2">{rooms.length} salas criadas</p>
              {rooms.map(room => (
                <GlassCard key={room.id} className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-200 truncate">{room.name}</h3>
                      <Badge variant={room.status === 'active' ? 'success' : 'neutral'}>
                        {room.status === 'active' ? 'Ativa' : 'Arquivada'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Dono: {room.profiles?.display_name || 'N/A'} | {room.member_count}/{room.member_limit} membros | {room.expense_count} despesas
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {room.status === 'active' && (
                      <button
                        onClick={() => setConfirmModal({ type: 'archive', id: room.id, name: room.name })}
                        className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center hover:bg-amber-500/20 transition-colors"
                        title="Arquivar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmModal({ type: 'delete', id: room.id, name: room.name })}
                      className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                      title="Deletar permanentemente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </>
      )}

      {/* Confirm Modal */}
      <Modal
        open={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title={
          confirmModal?.type === 'archive' ? 'Arquivar Sala' :
          confirmModal?.type === 'delete' ? 'Deletar Sala Permanentemente' :
          confirmModal?.type === 'reset' ? 'Zerar Saldos' :
          confirmModal?.extra ? 'Promover a Admin' : 'Remover Admin'
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            {confirmModal?.type === 'archive' && (
              <>Tem certeza que deseja arquivar a sala <strong className="text-slate-200">{confirmModal.name}</strong>?</>
            )}
            {confirmModal?.type === 'delete' && (
              <>
                <span className="text-red-400 font-semibold">ATENCAO:</span> Esta acao ira deletar permanentemente a sala <strong className="text-slate-200">{confirmModal.name}</strong> e todas as despesas associadas. Esta acao NAO pode ser desfeita.
              </>
            )}
            {confirmModal?.type === 'reset' && (
              <>Tem certeza que deseja zerar todos os saldos de <strong className="text-slate-200">{confirmModal.name}</strong>? Todas as dividas e creditos serao marcados como pagos.</>
            )}
            {confirmModal?.type === 'admin' && (
              confirmModal.extra
                ? <>Promover <strong className="text-slate-200">{confirmModal.name}</strong> a administrador?</>
                : <>Remover permissao de admin de <strong className="text-slate-200">{confirmModal.name}</strong>?</>
            )}
          </p>
          <div className="flex gap-3">
            <OutlineButton size="sm" onClick={() => setConfirmModal(null)} className="flex-1">
              Cancelar
            </OutlineButton>
            <GradientButton
              size="sm"
              onClick={handleAction}
              loading={actionLoading}
              className={`flex-1 ${confirmModal?.type === 'delete' ? '!bg-gradient-to-r !from-red-500 !to-red-600' : ''}`}
            >
              Confirmar
            </GradientButton>
          </div>
        </div>
      </Modal>
    </PageContainer>
  )
}
