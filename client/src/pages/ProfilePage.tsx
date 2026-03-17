import { useState, useRef } from 'react'
import { User, Key, Camera } from 'lucide-react'
import { PageContainer } from '../components/layout/PageContainer'
import { Header } from '../components/layout/Header'
import { GlassCard } from '../components/ui/GlassCard'
import { Input } from '../components/ui/Input'
import { GradientButton } from '../components/ui/GradientButton'
import { MemberAvatar } from '../components/data/MemberAvatar'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { api, apiUpload } from '../services/api'

export function ProfilePage() {
  const { user, refreshProfile } = useAuth()
  const { addToast } = useToast()
  const [displayName, setDisplayName] = useState(user?.display_name || '')
  const [pixKey, setPixKey] = useState(user?.pix_key || '')
  const [loading, setLoading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      addToast('Apenas imagens sao permitidas', 'warning')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast('Imagem deve ter no maximo 5MB', 'warning')
      return
    }

    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const res = await apiUpload<{ data: { url: string } }>('/upload/avatar', formData)
      setAvatarUrl(res.data.url)
      await refreshProfile()
      addToast('Foto atualizada!', 'success')
    } catch (err: any) {
      addToast(err.message || 'Erro ao enviar foto', 'error')
    } finally {
      setUploadingAvatar(false)
    }
  }

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
      await refreshProfile()
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
            <div className="relative group">
              <MemberAvatar name={user.display_name} url={avatarUrl || user.avatar_url} size="lg" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {uploadingAvatar ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <p className="mt-3 text-sm text-slate-400">{user.email}</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 text-xs text-neon-purple hover:text-neon-blue transition-colors"
            >
              Alterar foto
            </button>
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
