import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Plus, User } from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/rooms/new', icon: Plus, label: 'Nova Sala' },
  { to: '/profile', icon: User, label: 'Perfil' },
]

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-secondary border-t border-border-glass backdrop-blur-lg">
      <div className="flex justify-around items-center py-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-4 py-2 rounded-card transition-all duration-200 ${
                isActive
                  ? 'text-neon-purple'
                  : 'text-slate-500'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
