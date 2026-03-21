import { Menu, Sun, Moon, Bell } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Topbar({ title, subtitle, onMenuClick }) {
  const { theme, toggleTheme } = useAuth()

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="hamburger btn-icon" onClick={onMenuClick} aria-label="Toggle menu">
          <Menu size={20} />
        </button>
        <div>
          <div className="topbar-title">{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{subtitle}</div>}
        </div>
      </div>

      <div className="topbar-right">
        <button
          className="btn-icon"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  )
}
