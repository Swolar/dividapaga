import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
          <div className="glass-card p-8 max-w-md w-full text-center space-y-4">
            <h2 className="text-xl font-heading font-bold text-slate-100">
              Algo deu errado
            </h2>
            <p className="text-sm text-slate-400">
              {this.state.error?.message || 'Erro inesperado'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.href = '/'
              }}
              className="px-6 py-2 rounded-lg bg-gradient-primary text-white font-semibold text-sm"
            >
              Voltar ao inicio
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
