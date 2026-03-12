import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Mail, Lock, DollarSign } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { Input } from '../components/ui/Input'
import { GradientButton } from '../components/ui/GradientButton'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      addToast('Preencha todos os campos', 'warning')
      return
    }

    setLoading(true)
    try {
      await login(email, password)
      addToast('Login realizado com sucesso!', 'success')
      navigate(redirectTo || '/')
    } catch (err: any) {
      addToast(err.message || 'Erro ao fazer login', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      {/* Background glow effects */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-neon-blue/5 rounded-full blur-3xl" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-neon-purple/5 rounded-full blur-3xl" />

      <div className="glass w-full max-w-md animate-slide-up relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center pt-8 pb-2 px-8">
          <div className="w-14 h-14 rounded-glass bg-gradient-primary flex items-center justify-center mb-4 shadow-glow-blue">
            <DollarSign className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-heading font-bold gradient-text mb-1">
            DividaPaga
          </h1>
          <p className="text-sm text-slate-400">
            Entre na sua conta para continuar
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <Input
            label="Email"
            icon={Mail}
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
          />

          <Input
            label="Senha"
            icon={Lock}
            type="password"
            placeholder="Sua senha"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          <GradientButton type="submit" fullWidth loading={loading}>
            Entrar
          </GradientButton>

          <p className="text-center text-sm text-slate-400">
            Nao tem conta?{' '}
            <Link to={`/signup${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`} className="text-neon-purple hover:text-neon-blue transition-colors font-medium">
              Criar conta
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
