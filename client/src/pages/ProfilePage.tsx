import { useState } from 'react'
import { User, Key } from 'lucide-react'
import { PageContainer } from '../components/layout/PageContainer'
import { Header } from '../components/layout/Header'
import { GlassCard } from '../components/ui/GlassCard'
import { Input } from '../components/ui/Input'
import { GradientButton } from '../components/ui/GradientButton'
import { MemberAvatar } from '../components/data/MemberAvatar'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { api } from '../services/api'

export function ProfilePage() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [displayName, setDisplayName] = useState(user?.display_name || '')
  const [pixKey, setPixKey] = useState(user?.pix_key || '')
  const [loading, setLoading] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) {
      addToast('Nome e obrigatorio', 'warning')
      return
    }

    setLoading(true)
    try {
      await api('/profiles/me', {
        method: 'PATCH',
        body: {
          display_name: displayName.trim(),
          pix_key: pixKey.trim() || null,
        },
      })
      addToast('Perfil atualizado!', 'success')
    } catch (err: any) {
      addToast(err.message || 'Erro ao atualizar perfil', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <PageContainer>
      <Header title="Perfil" subtitle="Gerencie suas informacoes" />

      <div className="max-w-lg mx-auto">
        <GlassCard>
          <div className="flex flex-col items-center mb-6">
            <MemberAvatar name={user.display_name} url={user.avatar_url} size="lg" />
            <p className="mt-3 text-sm text-slate-400">{user.email}</p>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <Input
              label="Nome de Exibicao"
              icon={User}
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={100}
            />

            <Input
              label="Chave Pix (opcional)"
              icon={Key}
              placeholder="CPF, email, telefone ou chave aleatoria"
              value={pixKey}
              onChange={e => setPixKey(e.target.value)}
            />

            <GradientButton type="submit" fullWidth loading={loading}>
              Salvar Alteracoes
            </GradientButton>
          </form>
        </GlassCard>
      </div>
    </PageContainer>
  )
}
