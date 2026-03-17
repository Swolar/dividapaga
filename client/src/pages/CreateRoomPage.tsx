import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImagePlus, X } from 'lucide-react'
import { PageContainer } from '../components/layout/PageContainer'
import { Header } from '../components/layout/Header'
import { GlassCard } from '../components/ui/GlassCard'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { GradientButton } from '../components/ui/GradientButton'
import { useToast } from '../contexts/ToastContext'
import { api, apiUpload } from '../services/api'

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
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('image', file)

      const res = await apiUpload<{ data: { url: string } }>('/upload/room-image', formData)
      setImageUrl(res.data.url)
    } catch (err: any) {
      addToast(err.message || 'Erro ao enviar imagem', 'error')
      setImagePreview(null)
    } finally {
      setUploadingImage(false)
    }
  }

  const clearImage = () => {
    setImageUrl(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

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
          image_url: imageUrl || undefined,
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
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Imagem da Sala (opcional)
              </label>
              {imagePreview ? (
                <div className="relative w-full h-40 rounded-card overflow-hidden">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500/80 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 rounded-card border-2 border-dashed border-border-glass hover:border-neon-purple/30 flex flex-col items-center justify-center gap-2 transition-colors"
                >
                  <ImagePlus className="w-6 h-6 text-slate-500" />
                  <span className="text-xs text-slate-500">Clique para adicionar uma imagem</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

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
