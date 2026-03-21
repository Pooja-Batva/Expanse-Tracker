import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Lock, Moon, Sun, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../utils/helpers'
import { SectionCard } from '../components/ui'

export default function Settings() {
  const { user, logout, theme, toggleTheme } = useAuth()
  const navigate = useNavigate()
  const [pwForm, setPwForm]   = useState({ otp: '', newPassword: '', confirm: '' })
  const [saving, setSaving]   = useState(false)
  const [step, setStep]       = useState(0) // 0=idle, 1=otp sent, 2=done
  const [sendingOtp, setSendingOtp] = useState(false)

  const sendResetOtp = async () => {
    setSendingOtp(true)
    try {
      await authAPI.forgotPassword({ email: user.email })
      toast.success('OTP sent to your email!')
      setStep(1)
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setSendingOtp(false) }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirm) return toast.error('Passwords do not match')
    if (pwForm.newPassword.length < 8) return toast.error('Password must be at least 8 characters')
    setSaving(true)
    try {
      await authAPI.resetPassword({ email: user.email, otp: pwForm.otp, newPassword: pwForm.newPassword })
      toast.success('Password changed! Please log in again.')
      await logout()
      navigate('/login')
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setSaving(false) }
  }

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
            <div style={{ marginTop: 4 }}>
              <span className="badge badge-accent">Verified ✓</span>
            </div>
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

      {/* Change Password */}
      <SectionCard title="Change Password">
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              We'll send an OTP to <strong>{user?.email}</strong> to verify your identity before changing your password.
            </p>
            <button className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={sendResetOtp} disabled={sendingOtp}>
              <Lock size={14} />
              {sendingOtp ? <span className="loading-spinner" /> : 'Send Reset OTP'}
            </button>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">OTP (sent to your email)</label>
              <input className="form-input" placeholder="6-digit OTP" maxLength={6}
                value={pwForm.otp} onChange={e => setPwForm(f => ({ ...f, otp: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-input" type="password" placeholder="Min 8 chars, 1 uppercase, 1 number"
                value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input className="form-input" type="password" placeholder="Repeat new password"
                value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} required />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(0)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="loading-spinner" /> : 'Change Password'}
              </button>
            </div>
          </form>
        )}
      </SectionCard>

      {/* Monthly Reports info */}
      <SectionCard title="Monthly Reports">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ fontSize: 28 }}>📧</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Automatic Email Reports</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              On the <strong>1st of every month</strong>, you'll receive a detailed income & expense analysis for the previous month at <strong>{user?.email}</strong>.
              Reports include total income, total expenses, net savings, and top spending categories.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Danger zone */}
      <SectionCard title="Session">
        <button className="btn btn-danger" onClick={handleLogout}>
          <LogOut size={14} /> Log out of all devices
        </button>
      </SectionCard>
    </div>
  )
}
