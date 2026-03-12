import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'
import { GradientButton } from '../components/ui/GradientButton'

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="text-center animate-slide-up">
        <h1 className="text-7xl font-display font-bold gradient-text mb-4">404</h1>
        <p className="text-lg text-slate-400 mb-8">Pagina nao encontrada</p>
        <Link to="/">
          <GradientButton>
            <Home className="w-4 h-4" /> Voltar ao Dashboard
          </GradientButton>
        </Link>
      </div>
    </div>
  )
}
