import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Target, Eye, EyeOff, ArrowRight, Shield, Briefcase, User } from 'lucide-react'
import toast from 'react-hot-toast'

const DEMO_USERS = [
  { label: 'Employee', email: 'alice@meridian.demo', role: 'employee', icon: User, color: '#06b6d4' },
  { label: 'Employee 2', email: 'bob@meridian.demo', role: 'employee', icon: User, color: '#06b6d4' },
  { label: 'Manager', email: 'carol@meridian.demo', role: 'manager', icon: Briefcase, color: '#8b5cf6' },
  { label: 'Admin / HR', email: 'admin@meridian.demo', role: 'admin', icon: Shield, color: '#f59e0b' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Welcome to Meridian!')
      navigate('/dashboard')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = async (demoEmail: string) => {
    setLoading(true)
    try {
      await login(demoEmail, 'demo1234')
      toast.success('Logged in as demo user!')
      navigate('/dashboard')
    } catch (err: any) {
      toast.error('Could not log in. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--bg-base)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: '-200px', left: '-200px',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-200px', right: '-200px',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px 60px',
        borderRight: '1px solid var(--border-default)',
        background: 'var(--bg-surface)',
      }}>
        <div style={{ maxWidth: 480 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
            }}>
              <Target size={26} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: 28, margin: 0 }} className="gradient-text">Meridian</h1>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Goal Setting & Tracking Portal
              </p>
            </div>
          </div>

          <h2 style={{ fontSize: 36, marginBottom: 16, lineHeight: 1.15 }}>
            Align your team.<br />
            <span className="gradient-text">Track every win.</span>
          </h2>

          <p style={{ color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.7, marginBottom: 40 }}>
            The complete goal lifecycle portal — from creation and approval to quarterly check-ins and performance visibility. Built for clarity, accountability, and results.
          </p>

          {[
            '✓ Full goal lifecycle management',
            '✓ Real-time weightage validation',
            '✓ Manager approval workflow',
            '✓ Quarterly check-in tracking',
            '✓ Exportable achievement reports',
          ].map(f => (
            <div key={f} style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#10b981' }}>{f.slice(0, 1)}</span>{f.slice(1)}
            </div>
          ))}
        </div>
      </div>

      <div style={{
        width: 480,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 48px',
        flexShrink: 0,
      }}>
        <div className="animate-fade-in">
          <h3 style={{ fontSize: 24, marginBottom: 6 }}>Sign in</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 32 }}>
            Use your credentials or a demo account below
          </p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="form-label">Email</label>
              <input
                id="email"
                type="email"
                className="form-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@meridian.demo"
                required
              />
            </div>
            <div>
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              id="login-btn"
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ justifyContent: 'center', padding: '12px', fontSize: 15 }}
            >
              {loading ? <span className="spinner" /> : <><ArrowRight size={16} /> Sign In</>}
            </button>
          </form>

          <div style={{ margin: '28px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="divider" style={{ flex: 1 }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Demo Accounts</span>
            <div className="divider" style={{ flex: 1 }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DEMO_USERS.map(({ label, email: dEmail, role, icon: Icon, color }) => (
              <button
                key={dEmail}
                id={`demo-${role}`}
                onClick={() => quickLogin(dEmail)}
                disabled={loading}
                className="btn-secondary"
                style={{ justifyContent: 'flex-start', gap: 12, padding: '10px 14px' }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: `${color}20`, border: `1px solid ${color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={14} color={color} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{dEmail}</div>
                </div>
                <ArrowRight size={14} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
              </button>
            ))}
          </div>

          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 20 }}>
            Demo password: <code style={{ color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: '1px 6px', borderRadius: 4 }}>demo1234</code>
          </p>
        </div>
      </div>
    </div>
  )
}
