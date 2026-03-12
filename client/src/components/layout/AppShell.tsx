import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { ToastContainer } from '../ui/Toast'

export function AppShell() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <Sidebar />
      <main className="md:ml-20 lg:ml-64 min-h-screen">
        <Outlet />
      </main>
      <BottomNav />
      <ToastContainer />
    </div>
  )
}
