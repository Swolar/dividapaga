import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Receipt, Check, X, Upload, Clock, ThumbsUp, ThumbsDown } from 'lucide-react'
import { PageContainer } from '../components/layout/PageContainer'
import { GlassCard } from '../components/ui/GlassCard'
import { GradientButton } from '../components/ui/GradientButton'
import { OutlineButton } from '../components/ui/OutlineButton'
import { Badge } from '../components/ui/Badge'
import { MemberAvatar } from '../components/data/MemberAvatar'
import { AmountDisplay } from '../components/data/AmountDisplay'
import { EmptyState } from '../components/ui/EmptyState'
import { CardSkeleton } from '../components/ui/LoadingSkeleton'
import { Modal } from '../components/ui/Modal'
import { FileUpload } from '../components/ui/FileUpload'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { api, apiUpload } from '../services/api'
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

interface PaymentRequest {
  id: string
  split_id: string
  expense_id: string
  requester_id: string
  proof_url: string
  status: string
  created_at: string
  profiles: { display_name: string; avatar_url: string | null }
  expense_splits: {
    amount: number
    expenses: { description: string; created_by: string }
  }
}

export function RoomExpensesPage() {
  const { id } = useParams<{ id: string }>()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [proofModal, setProofModal] = useState<{ expenseId: string; splitId: string } | null>(null)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [submittingProof, setSubmittingProof] = useState(false)
  const { user } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const fetchExpenses = async () => {
    try {
      const [expRes, reqRes] = await Promise.all([
        api<{ data: Expense[] }>(`/rooms/${id}/expenses`),
        api<{ data: PaymentRequest[] }>(`/rooms/${id}/payment-requests`),
      ])
      setExpenses(expRes.data)
      setPaymentRequests(reqRes.data || [])
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

  const handleSubmitProof = async () => {
    if (!proofFile || !proofModal) return

    setSubmittingProof(true)
    try {
      // Upload do comprovante
      const formData = new FormData()
      formData.append('receipt', proofFile)
      const uploadRes = await apiUpload<{ data: { path: string } }>('/upload/receipt', formData)

      // Enviar solicitacao
      await api(`/rooms/${id}/expenses/${proofModal.expenseId}/payment-requests`, {
        method: 'POST',
        body: {
          split_id: proofModal.splitId,
          proof_url: uploadRes.data.path,
        },
      })

      addToast('Comprovante enviado! Aguardando aprovacao.', 'success')
      setProofModal(null)
      setProofFile(null)
      fetchExpenses()
    } catch (err: any) {
      addToast(err.message || 'Erro ao enviar comprovante', 'error')
    } finally {
      setSubmittingProof(false)
    }
  }

  const handleReviewRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      await api(`/rooms/${id}/payment-requests/${requestId}`, {
        method: 'PATCH',
        body: { status },
      })
      addToast(status === 'approved' ? 'Pagamento aprovado!' : 'Pagamento rejeitado', 'success')
      fetchExpenses()
    } catch (err: any) {
      addToast(err.message || 'Erro ao processar solicitacao', 'error')
    }
  }

  // Verificar se existe request pendente para este split
  const hasPendingRequest = (splitId: string) => {
    return paymentRequests.some(r => r.split_id === splitId && r.status === 'pending')
  }

  // Requests pendentes que o usuario logado pode aprovar (ele e o criador da despesa)
  const myPendingApprovals = paymentRequests.filter(r => {
    const expenseCreator = (r.expense_splits as any)?.expenses?.created_by
    return expenseCreator === user?.id && r.status === 'pending'
  })

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

      {/* Solicitacoes pendentes para o criador da despesa */}
      {myPendingApprovals.length > 0 && (
        <div className="mb-6">
          <GlassCard glow="accent">
            <h3 className="text-sm font-heading font-semibold text-amber-400 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Solicitacoes de Pagamento ({myPendingApprovals.length})
            </h3>
            <div className="space-y-3">
              {myPendingApprovals.map(req => (
                <div key={req.id} className="flex items-center justify-between py-2 border-b border-border-glass last:border-0">
                  <div className="flex items-center gap-3">
                    <MemberAvatar name={req.profiles?.display_name || ''} url={req.profiles?.avatar_url} size="sm" />
                    <div>
                      <p className="text-sm text-slate-200">{req.profiles?.display_name}</p>
                      <p className="text-xs text-slate-500">
                        {(req.expense_splits as any)?.expenses?.description} - {formatCurrency((req.expense_splits as any)?.amount || 0)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReviewRequest(req.id, 'approved')}
                      className="w-8 h-8 rounded-lg bg-green-500/15 text-green-400 flex items-center justify-center hover:bg-green-500/25 transition-colors"
                      title="Aprovar"
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleReviewRequest(req.id, 'rejected')}
                      className="w-8 h-8 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center hover:bg-red-500/25 transition-colors"
                      title="Rejeitar"
                    >
                      <ThumbsDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

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
          {expenses.map(exp => {
            const isExpenseCreator = exp.created_by === user?.id

            return (
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
                  {exp.expense_splits.map(split => {
                    const isMySplit = split.user_id === user?.id
                    const pending = hasPendingRequest(split.id)

                    return (
                      <div key={split.id} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          <MemberAvatar name={split.profiles.display_name} url={split.profiles.avatar_url} size="sm" />
                          <span className="text-sm text-slate-300">{split.profiles.display_name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <AmountDisplay amount={-split.amount} size="sm" />

                          {split.is_paid ? (
                            // Pago - criador pode desmarcar
                            isExpenseCreator ? (
                              <button
                                onClick={() => handleTogglePaid(exp.id, split.id, true)}
                                className="w-7 h-7 rounded-lg bg-green-500/15 text-green-400 flex items-center justify-center hover:bg-green-500/25 transition-colors"
                                title="Desmarcar pagamento"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-green-500/15 text-green-400 flex items-center justify-center">
                                <Check className="w-4 h-4" />
                              </div>
                            )
                          ) : pending ? (
                            // Pendente de aprovacao
                            <div className="flex items-center gap-1">
                              <Badge variant="warning">Aguardando</Badge>
                            </div>
                          ) : isExpenseCreator ? (
                            // Criador da despesa pode marcar como pago
                            <button
                              onClick={() => handleTogglePaid(exp.id, split.id, false)}
                              className="w-7 h-7 rounded-lg bg-white/5 text-slate-500 flex items-center justify-center hover:bg-neon-purple/10 hover:text-neon-purple transition-colors"
                              title="Marcar como pago"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          ) : isMySplit ? (
                            // Minha divida - posso enviar comprovante
                            <button
                              onClick={() => setProofModal({ expenseId: exp.id, splitId: split.id })}
                              className="w-7 h-7 rounded-lg bg-neon-blue/10 text-neon-blue flex items-center justify-center hover:bg-neon-blue/20 transition-colors"
                              title="Enviar comprovante"
                            >
                              <Upload className="w-4 h-4" />
                            </button>
                          ) : (
                            // Divida de outro - nao pode fazer nada
                            <div className="w-7 h-7 rounded-lg bg-white/5 text-slate-600 flex items-center justify-center">
                              <X className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}

      {/* Modal enviar comprovante */}
      <Modal
        open={!!proofModal}
        onClose={() => { setProofModal(null); setProofFile(null) }}
        title="Enviar Comprovante de Pagamento"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Envie o comprovante de pagamento para o criador da despesa aprovar.
          </p>
          <FileUpload
            label="Comprovante"
            accept="image/jpeg,image/png,application/pdf"
            onFileSelect={setProofFile}
          />
          <div className="flex gap-3">
            <OutlineButton
              size="sm"
              onClick={() => { setProofModal(null); setProofFile(null) }}
              className="flex-1"
            >
              Cancelar
            </OutlineButton>
            <GradientButton
              size="sm"
              onClick={handleSubmitProof}
              loading={submittingProof}
              disabled={!proofFile}
              className="flex-1"
            >
              Enviar
            </GradientButton>
          </div>
        </div>
      </Modal>
    </PageContainer>
  )
}
