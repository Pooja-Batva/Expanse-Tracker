import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'
import { getErrorMessage } from '../utils/helpers'
import OtpInput from '../components/ui/OtpInput'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep]       = useState(1)
  const [loading, setLoading] = useState(false)
  const [email, setEmail]     = useState('')
  const [otp, setOtp]         = useState('')
  const [newPass, setNewPass] = useState('')

  const handleForgot = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authAPI.forgotPassword({ email })
      toast.success('If that email is registered, an OTP was sent.')
      setStep(2)
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setLoading(false) }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (otp.length < 6) return toast.error('Enter the 6-digit OTP')
    if (newPass.length < 8) return toast.error('Password must be at least 8 characters')
    setLoading(true)
    try {
      await authAPI.resetPassword({ email, otp, newPassword: newPass })
      toast.success('Password reset! Please log in.')
      navigate('/login')
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setLoading(false) }
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
            <h1 className="auth-title">Reset password</h1>
            <p className="auth-sub">Enter your email and we'll send an OTP</p>
            <form className="auth-form" onSubmit={handleForgot}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading}>
                {loading ? <span className="loading-spinner" /> : 'Send Reset OTP'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="auth-title">Create new password</h1>
            <p className="auth-sub">Enter the OTP sent to <strong>{email}</strong></p>
            <form className="auth-form" onSubmit={handleReset}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <OtpInput value={otp} onChange={setOtp} />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" placeholder="Min 8 chars, 1 uppercase, 1 number"
                  value={newPass} onChange={e => setNewPass(e.target.value)} required />
              </div>
              <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading}>
                {loading ? <span className="loading-spinner" /> : 'Reset Password'}
              </button>
            </form>
          </>
        )}

        <div className="auth-footer">
          <Link to="/login">← Back to login</Link>
        </div>
      </div>
    </div>
  )
}
