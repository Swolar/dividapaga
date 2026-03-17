import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, UserPlus, X } from 'lucide-react'
import { PageContainer } from '../components/layout/PageContainer'
import { GlassCard } from '../components/ui/GlassCard'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { CurrencyInput } from '../components/ui/CurrencyInput'
import { FileUpload } from '../components/ui/FileUpload'
import { GradientButton } from '../components/ui/GradientButton'
import { MemberAvatar } from '../components/data/MemberAvatar'
import { useToast } from '../contexts/ToastContext'
import { api, apiUpload } from '../services/api'
import { parseCurrencyInput } from '../utils/currency'

interface Member {
  user_id: string
  profiles: { display_name: string; avatar_url: string | null }
}

export function NewExpensePage() {
  const { id: roomId } = useParams<{ id: string }>()
  const [members, setMembers] = useState<Member[]>([])
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [splitType, setSplitType] = useState('equal')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [guestNames, setGuestNames] = useState<string[]>([])
  const [guestInput, setGuestInput] = useState('')
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await api<{ data: Member[] }>(`/rooms/${roomId}/members`)
        setMembers(res.data)
        setSelectedMembers(new Set(res.data.map(m => m.user_id)))
      } catch {
        addToast('Erro ao carregar membros', 'error')
      }
    }
    fetchMembers()
  }, [roomId, addToast])

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const addGuest = () => {
    const name = guestInput.trim()
    if (!name) return
    if (guestNames.includes(name)) {
      addToast('Esse nome ja foi adicionado', 'warning')
      return
    }
    setGuestNames(prev => [...prev, name])
    setGuestInput('')
  }

  const removeGuest = (name: string) => {
    setGuestNames(prev => prev.filter(n => n !== name))
  }

  const totalParticipants = selectedMembers.size + guestNames.length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!description.trim()) { addToast('Descricao e obrigatoria', 'warning'); return }
    if (!amount) { addToast('Valor e obrigatorio', 'warning'); return }
    if (!receiptFile) { addToast('Comprovante e obrigatorio', 'warning'); return }
    if (totalParticipants === 0) { addToast('Selecione ao menos 1 participante', 'warning'); return }

    setLoading(true)
    try {
      // 1. Upload receipt
      const formData = new FormData()
      formData.append('receipt', receiptFile)
      const uploadRes = await apiUpload<{ data: { path: string } }>('/upload/receipt', formData)

      // 2. Create expense
      await api(`/rooms/${roomId}/expenses`, {
        method: 'POST',
        body: {
          description: description.trim(),
          total_amount: parseCurrencyInput(amount),
          split_type: splitType,
          receipt_url: uploadRes.data.path,
          participants: Array.from(selectedMembers),
          guest_names: guestNames.length > 0 ? guestNames : undefined,
        },
      })

      addToast('Despesa criada com sucesso!', 'success')
      navigate(`/rooms/${roomId}/expenses`)
    } catch (err: any) {
      addToast(err.message || 'Erro ao criar despesa', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageContainer>
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(`/rooms/${roomId}/expenses`)}
          className="text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-heading font-bold text-slate-100">Nova Despesa</h1>
      </div>

      <div className="max-w-lg mx-auto">
        <GlassCard>
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Descricao"
              placeholder="Ex: Conta do restaurante"
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={200}
            />

            <CurrencyInput
              label="Valor Total"
              value={amount}
              onChange={setAmount}
            />

            <Select
              label="Tipo de Divisao"
              options={[
                { value: 'equal', label: 'Dividir igualmente' },
                { value: 'by_item', label: 'Por item (em breve)' },
                { value: 'manual', label: 'Manual (em breve)' },
              ]}
              value={splitType}
              onChange={e => setSplitType(e.target.value)}
            />

            <FileUpload
              label="Comprovante (obrigatorio)"
              onFileSelect={setReceiptFile}
            />

            {/* Member selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Participantes ({totalParticipants} selecionados)
              </label>
              <div className="space-y-2">
                {members.map(m => (
                  <label
                    key={m.user_id}
                    className={`flex items-center gap-3 p-3 rounded-card cursor-pointer transition-all duration-200 ${
                      selectedMembers.has(m.user_id)
                        ? 'bg-neon-purple/10 border border-neon-purple/30'
                        : 'bg-white/[0.02] border border-border-glass hover:border-border-glass/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.has(m.user_id)}
                      onChange={() => toggleMember(m.user_id)}
                      className="sr-only"
                    />
                    <MemberAvatar
                      name={m.profiles?.display_name || 'Usuário'}
                      url={m.profiles?.avatar_url}
                      size="sm"
                    />
                    <span className="text-sm text-slate-200">
                      {m.profiles?.display_name || 'Usuário'}
                    </span>
                    {selectedMembers.has(m.user_id) && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-neon-purple flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Guest participants */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                <UserPlus className="w-4 h-4 inline mr-1" />
                Participantes externos
              </label>

              {/* Guest chips */}
              {guestNames.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {guestNames.map(name => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 text-amber-300 text-xs font-medium"
                    >
                      {name}
                      <button
                        type="button"
                        onClick={() => removeGuest(name)}
                        className="hover:text-amber-100 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Add guest input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={guestInput}
                  onChange={e => setGuestInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGuest() } }}
                  placeholder="Nome da pessoa externa"
                  maxLength={100}
                  className="flex-1 glass-input px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={addGuest}
                  disabled={!guestInput.trim()}
                  className="px-4 py-2.5 rounded-card bg-amber-500/15 text-amber-300 text-sm font-medium hover:bg-amber-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Adicionar
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                Pessoas que nao estao na sala mas participaram do racha.
              </p>
            </div>

            <GradientButton type="submit" fullWidth loading={loading}>
              Criar Despesa
            </GradientButton>
          </form>
        </GlassCard>
      </div>
    </PageContainer>
  )
}
