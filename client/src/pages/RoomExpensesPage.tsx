import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Receipt, Check, X } from 'lucide-react'
import { PageContainer } from '../components/layout/PageContainer'
import { GlassCard } from '../components/ui/GlassCard'
import { GradientButton } from '../components/ui/GradientButton'
import { Badge } from '../components/ui/Badge'
import { MemberAvatar } from '../components/data/MemberAvatar'
import { AmountDisplay } from '../components/data/AmountDisplay'
import { EmptyState } from '../components/ui/EmptyState'
import { CardSkeleton } from '../components/ui/LoadingSkeleton'
import { useToast } from '../contexts/ToastContext'
import { api } from '../services/api'
import { formatCurrency } from '../utils/currency'
import { timeAgo } from '../utils/date'

interface Expense {
  id: string
  description: string
  total_amount: number
  split_type: string
  created_at: string
  created_by: string
  profiles: { display_name: string; avatar_url: string | null }
  expense_splits: {
    id: string
    user_id: string
    amount: number
    is_paid: boolean
    profiles: { display_name: string; avatar_url: string | null }
  }[]
}

export function RoomExpensesPage() {
  const { id } = useParams<{ id: string }>()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const { addToast } = useToast()
  const navigate = useNavigate()

  const fetchExpenses = async () => {
    try {
      const res = await api<{ data: Expense[] }>(`/rooms/${id}/expenses`)
      setExpenses(res.data)
    } catch {
      addToast('Erro ao carregar despesas', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExpenses()
  }, [id])

  const handleTogglePaid = async (expenseId: string, splitId: string, currentPaid: boolean) => {
    try {
      await api(`/rooms/${id}/expenses/${expenseId}/splits/${splitId}`, {
        method: 'PATCH',
        body: { is_paid: !currentPaid },
      })
      addToast(currentPaid ? 'Pagamento desmarcado' : 'Pagamento confirmado!', 'success')
      fetchExpenses()
    } catch (err: any) {
      addToast(err.message || 'Erro ao atualizar pagamento', 'error')
    }
  }

  return (
    <PageContainer>
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(`/rooms/${id}`)}
          className="text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-heading font-bold text-slate-100 flex-1">Despesas</h1>
        <GradientButton size="sm" onClick={() => navigate(`/rooms/${id}/expenses/new`)}>
          <Plus className="w-4 h-4" /> Adicionar
        </GradientButton>
      </div>

      {loading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nenhuma despesa"
          description="Adicione a primeira despesa desta sala."
          actionLabel="Adicionar Despesa"
          onAction={() => navigate(`/rooms/${id}/expenses/new`)}
        />
      ) : (
        <div className="space-y-4">
          {expenses.map(exp => (
            <GlassCard key={exp.id} className="animate-fade-in">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-100">{exp.description}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <MemberAvatar name={exp.profiles.display_name} url={exp.profiles.avatar_url} size="sm" />
                    <span className="text-xs text-slate-400">
                      {exp.profiles.display_name} - {timeAgo(exp.created_at)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-display font-bold text-slate-100">
                    {formatCurrency(exp.total_amount)}
                  </p>
                  <Badge variant="info">
                    {exp.split_type === 'equal' ? 'Igual' : exp.split_type === 'by_item' ? 'Por Item' : 'Manual'}
                  </Badge>
                </div>
              </div>

              {/* Splits */}
              <div className="border-t border-border-glass pt-3 space-y-2">
                {exp.expense_splits.map(split => (
                  <div key={split.id} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <MemberAvatar name={split.profiles.display_name} url={split.profiles.avatar_url} size="sm" />
                      <span className="text-sm text-slate-300">{split.profiles.display_name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <AmountDisplay amount={-split.amount} size="sm" />
                      {split.is_paid ? (
                        <button
                          onClick={() => handleTogglePaid(exp.id, split.id, true)}
                          className="w-7 h-7 rounded-lg bg-green-500/15 text-green-400 flex items-center justify-center hover:bg-green-500/25 transition-colors"
                          title="Desmarcar pagamento"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleTogglePaid(exp.id, split.id, false)}
                          className="w-7 h-7 rounded-lg bg-white/5 text-slate-500 flex items-center justify-center hover:bg-neon-purple/10 hover:text-neon-purple transition-colors"
                          title="Marcar como pago"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </PageContainer>
  )
}
