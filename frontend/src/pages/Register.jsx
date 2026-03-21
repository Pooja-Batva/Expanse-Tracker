import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'
import { getErrorMessage } from '../utils/helpers'
import OtpInput from '../components/ui/OtpInput'
import { Eye, EyeOff } from 'lucide-react'

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep]         = useState(1) // 1=form, 2=otp
  const [loading, setLoading]   = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [otp, setOtp]           = useState('')
  const [email, setEmail]       = useState('')
  const [form, setForm]         = useState({ name: '', email: '', password: '' })

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authAPI.register(form)
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
      await authAPI.verifyEmail({ email, otp })
      toast.success('Email verified! You can now log in.')
      navigate('/login')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally { setLoading(false) }
  }

  const resend = async () => {
    try {
      await authAPI.resendOtp({ email, type: 'verify' })
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
            <h1 className="auth-title">Create account</h1>
            <p className="auth-sub">Start tracking your finances today</p>

            <form className="auth-form" onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" placeholder="John Doe" value={form.name} onChange={set('name')} required />
              </div>
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
                    placeholder="Min 8 chars, 1 uppercase, 1 number"
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
              <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading}>
                {loading ? <span className="loading-spinner" /> : 'Create Account'}
              </button>
            </form>

            <div className="auth-footer">
              Already have an account? <Link to="/login">Sign in</Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="auth-title">Verify your email</h1>
            <p className="auth-sub">Enter the 6-digit OTP sent to <strong>{email}</strong></p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
              <OtpInput value={otp} onChange={setOtp} />
              <button className="btn btn-primary btn-lg w-full" onClick={handleVerify} disabled={loading}>
                {loading ? <span className="loading-spinner" /> : 'Verify Email'}
              </button>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                Didn't get it?{' '}
                <button onClick={resend} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
                  Resend OTP
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
