import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Plus,
  User,
  LogOut,
  DollarSign,
  Shield,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/rooms/new', icon: Plus, label: 'Nova Sala' },
  { to: '/profile', icon: User, label: 'Perfil' },
]

export function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const allItems = user?.is_admin
    ? [...navItems, { to: '/admin', icon: Shield, label: 'Admin' }]
    : navItems

  return (
    <aside className="hidden md:flex flex-col w-20 lg:w-64 h-screen fixed left-0 top-0 bg-bg-secondary border-r border-border-glass z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-6 border-b border-border-glass">
        <div className="w-10 h-10 rounded-card bg-gradient-primary flex items-center justify-center flex-shrink-0">
          <DollarSign className="w-5 h-5 text-white" />
        </div>
        <span className="hidden lg:block font-heading font-bold text-lg gradient-text">
          DividaPaga
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
        {allItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 rounded-card transition-all duration-200 group ${
                isActive
                  ? to === '/admin'
                    ? 'bg-amber-500/10 text-amber-400 shadow-glow-purple'
                    : 'bg-neon-purple/10 text-neon-purple shadow-glow-purple'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span className="hidden lg:block text-sm font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-border-glass">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-3 rounded-card w-full text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className="hidden lg:block text-sm font-medium">Sair</span>
        </button>
      </div>
    </aside>
  )
}
