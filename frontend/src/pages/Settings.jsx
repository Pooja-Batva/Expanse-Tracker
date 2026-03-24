import { useNavigate } from 'react-router-dom'
import { User, Moon, Sun, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { SectionCard } from '../components/ui'

export default function Settings() {
  const { user, logout, theme, toggleTheme } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out!')
    navigate('/login')
  }

  return (
    <div className="section-gap animate-in" style={{ maxWidth: 640 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account and preferences</p>
        </div>
      </div>

      {/* Profile */}
      <SectionCard title="Profile">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 22, color: '#fff', flexShrink: 0
          }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>{user?.name}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{user?.email}</div>
          </div>
        </div>
      </SectionCard>

      {/* Appearance */}
      <SectionCard title="Appearance">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {theme === 'dark' ? <Moon size={18} style={{ color: 'var(--accent)' }} /> : <Sun size={18} style={{ color: 'var(--warning)' }} />}
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {theme === 'dark' ? 'Trust & Modernity theme active' : 'Minimal & Clean theme active'}
              </div>
            </div>
          </div>
          <label className="toggle-wrap" onClick={toggleTheme}>
            <div className={`toggle ${theme === 'light' ? 'on' : ''}`} />
          </label>
        </div>
      </SectionCard>

      {/* Danger zone */}
      <SectionCard title="Session">
        <button className="btn btn-danger" onClick={handleLogout}>
          <LogOut size={14} /> Log out
        </button>
      </SectionCard>
    </div>
  )
}
