import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Users, DollarSign } from 'lucide-react'
import { GradientButton } from '../components/ui/GradientButton'
import { OutlineButton } from '../components/ui/OutlineButton'
import { Spinner } from '../components/ui/Spinner'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { api } from '../services/api'

interface InviteInfo {
  room_name: string
  room_category: string
  member_count: number
  member_limit: number
  is_valid: boolean
  reason?: string
}

export function JoinRoomPage() {
  const { token } = useParams<{ token: string }>()
  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const { user } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await api<{ data: InviteInfo }>(`/invites/${token}`)
        setInfo(res.data)
      } catch {
        setInfo({ room_name: '', room_category: '', member_count: 0, member_limit: 0, is_valid: false, reason: 'Convite nao encontrado' })
      } finally {
        setLoading(false)
      }
    }
    fetchInfo()
  }, [token])

  const handleJoin = async () => {
    if (!user) {
      navigate(`/login?redirect=/join/${token}`)
      return
    }

    setJoining(true)
    try {
      const res = await api<{ data: { room_id: string }; message: string }>(`/invites/${token}/join`, {
        method: 'POST',
      })
      addToast(res.message || 'Voce entrou na sala!', 'success')
      navigate(`/rooms/${res.data.room_id}`)
    } catch (err: any) {
      addToast(err.message || 'Erro ao entrar na sala', 'error')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="fixed top-0 left-1/3 w-96 h-96 bg-neon-purple/5 rounded-full blur-3xl" />
      <div className="fixed bottom-0 right-1/3 w-96 h-96 bg-neon-blue/5 rounded-full blur-3xl" />

      <div className="glass w-full max-w-sm text-center animate-slide-up relative z-10 p-8">
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : info?.is_valid ? (
          <>
            <div className="w-14 h-14 rounded-glass bg-gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow-blue">
              <DollarSign className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-heading font-bold text-slate-100 mb-2">
              {info.room_name}
            </h2>
            <div className="flex items-center justify-center gap-2 text-slate-400 mb-6">
              <Users className="w-4 h-4" />
              <span className="text-sm">{info.member_count}/{info.member_limit} membros</span>
            </div>
            <p className="text-sm text-slate-400 mb-6">
              Voce foi convidado para esta sala de divisao de contas.
            </p>
            <GradientButton fullWidth loading={joining} onClick={handleJoin}>
              Entrar na Sala
            </GradientButton>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-glass bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">!</span>
            </div>
            <h2 className="text-xl font-heading font-bold text-slate-100 mb-2">
              Convite Invalido
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              {info?.reason || 'Este convite nao e mais valido.'}
            </p>
            <Link to="/">
              <OutlineButton fullWidth>Ir para Dashboard</OutlineButton>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
