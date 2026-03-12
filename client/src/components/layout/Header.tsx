import { useAuth } from '../../contexts/AuthContext'
import { MemberAvatar } from '../data/MemberAvatar'

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuth()

  return (
    <header className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-heading font-bold text-slate-100">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
        )}
      </div>
      {user && (
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-sm text-slate-300">
            {user.display_name}
          </span>
          <MemberAvatar name={user.display_name} url={user.avatar_url} size="md" />
        </div>
      )}
    </header>
  )
}
