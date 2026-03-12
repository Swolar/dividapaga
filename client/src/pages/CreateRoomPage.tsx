import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageContainer } from '../components/layout/PageContainer'
import { Header } from '../components/layout/Header'
import { GlassCard } from '../components/ui/GlassCard'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { GradientButton } from '../components/ui/GradientButton'
import { useToast } from '../contexts/ToastContext'
import { api } from '../services/api'

const categoryOptions = [
  { value: 'jantar', label: 'Jantar' },
  { value: 'balada', label: 'Balada' },
  { value: 'mercado', label: 'Mercado' },
  { value: 'viagem', label: 'Viagem' },
  { value: 'outro', label: 'Outro' },
]

export function CreateRoomPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('jantar')
  const [memberLimit, setMemberLimit] = useState('10')
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      addToast('Nome da sala e obrigatorio', 'warning')
      return
    }

    setLoading(true)
    try {
      const res = await api<{ data: { id: string } }>('/rooms', {
        method: 'POST',
        body: {
          name: name.trim(),
          description: description.trim() || undefined,
          category,
          member_limit: parseInt(memberLimit, 10),
        },
      })
      addToast('Sala criada com sucesso!', 'success')
      navigate(`/rooms/${res.data.id}`)
    } catch (err: any) {
      addToast(err.message || 'Erro ao criar sala', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageContainer>
      <Header title="Nova Sala" subtitle="Configure sua sala de divisao de contas" />

      <div className="max-w-lg mx-auto">
        <GlassCard>
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Nome da Sala"
              placeholder="Ex: Churrasco do Sabado"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100}
            />

            <Input
              label="Descricao (opcional)"
              placeholder="Detalhes sobre o evento"
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={500}
            />

            <Select
              label="Categoria"
              options={categoryOptions}
              value={category}
              onChange={e => setCategory(e.target.value)}
            />

            <Input
              label="Limite de Membros"
              type="number"
              min={2}
              max={50}
              value={memberLimit}
              onChange={e => setMemberLimit(e.target.value)}
            />

            <GradientButton type="submit" fullWidth loading={loading}>
              Criar Sala
            </GradientButton>
          </form>
        </GlassCard>
      </div>
    </PageContainer>
  )
}
