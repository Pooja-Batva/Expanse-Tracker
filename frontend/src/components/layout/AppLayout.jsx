import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const pageMeta = {
  '/dashboard':    { title: 'Dashboard',    subtitle: "Your financial overview" },
  '/transactions': { title: 'Transactions', subtitle: 'Track every rupee' },
  '/categories':   { title: 'Categories',   subtitle: 'Organise your finances' },
  '/budgets':      { title: 'Budgets',      subtitle: 'Stay on target' },
  '/analytics':    { title: 'Analytics',    subtitle: 'Deep insights into your money' },
  '/settings':     { title: 'Settings',     subtitle: 'Manage your account' },
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  const meta = pageMeta[pathname] || { title: 'FinVault', subtitle: '' }

  return (
    <div className="app-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar
          title={meta.title}
          subtitle={meta.subtitle}
          onMenuClick={() => setSidebarOpen((o) => !o)}
        />
        <main className="page-body">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
