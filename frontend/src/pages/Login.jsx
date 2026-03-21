import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../utils/helpers'
import OtpInput from '../components/ui/OtpInput'
import { Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [step, setStep]         = useState(1)
  const [loading, setLoading]   = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [otp, setOtp]           = useState('')
  const [email, setEmail]       = useState('')
  const [form, setForm]         = useState({ email: '', password: '' })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authAPI.loginRequest(form)
      setEmail(form.email)
      toast.success('OTP sent to your email!')
      setStep(2)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally { setLoading(false) }
  }

  const handleVerify = async () => {
    if (otp.length < 6) return toast.error('Enter the 6-digit OTP')
    setLoading(true)
    try {
      const { data } = await authAPI.loginVerify({ email, otp })
      login(data.data.accessToken, data.data.user)
      toast.success(`Welcome back, ${data.data.user.name}!`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally { setLoading(false) }
  }

  const resend = async () => {
    try {
      await authAPI.resendOtp({ email, type: 'login' })
      toast.success('OTP resent!')
    } catch (err) { toast.error(getErrorMessage(err)) }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-orb orb1" />
      <div className="auth-bg-orb orb2" />

      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">💰</div>
          <span className="auth-logo-text">FinVault</span>
        </div>

        {step === 1 ? (
          <>
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-sub">Sign in to your account</p>
            <form className="auth-form" onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="you@email.com" value={form.email} onChange={set('email')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Your password"
                    value={form.password}
                    onChange={set('password')}
                    required
                    style={{ paddingRight: 42 }}
                  />
                  <button type="button" onClick={() => setShowPass((s) => !s)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div style={{ textAlign: 'right', marginTop: -8 }}>
                <Link to="/forgot-password" style={{ fontSize: 13, color: 'var(--accent)' }}>Forgot password?</Link>
              </div>
              <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading}>
                {loading ? <span className="loading-spinner" /> : 'Continue with OTP →'}
              </button>
            </form>
            <div className="auth-footer">
              No account? <Link to="/register">Create one</Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="auth-title">Check your inbox</h1>
            <p className="auth-sub">OTP sent to <strong>{email}</strong></p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
              <OtpInput value={otp} onChange={setOtp} />
              <button className="btn btn-primary btn-lg w-full" onClick={handleVerify} disabled={loading}>
                {loading ? <span className="loading-spinner" /> : 'Sign In'}
              </button>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                Didn't get it?{' '}
                <button onClick={resend} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
                  Resend OTP
                </button>
                {' · '}
                <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Go back
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
