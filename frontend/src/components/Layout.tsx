import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  Target, LayoutDashboard, CheckSquare, Users, BarChart3,
  Settings, LogOut, ChevronRight, Bell, Shield, Briefcase
} from 'lucide-react'

const employeeNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/goals', label: 'My Goals', icon: Target },
  { to: '/achievements', label: 'Check-ins', icon: CheckSquare },
]

const managerNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/team-goals', label: 'Team Goals', icon: Target },
  { to: '/check-in', label: 'Check-ins', icon: CheckSquare },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
]

const adminNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/team-goals', label: 'All Goals', icon: Target },
  { to: '/cycles', label: 'Cycles', icon: Settings },
  { to: '/shared-goals', label: 'Shared Goals', icon: Users },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/audit', label: 'Audit Trail', icon: Shield },
]

function getRoleIcon(role: string) {
  if (role === 'admin') return <Shield size={14} className="role-admin" />
  if (role === 'manager') return <Briefcase size={14} className="role-manager" />
  return <Target size={14} className="role-employee" />
}

function getRoleBadgeClass(role: string) {
  if (role === 'admin') return 'badge-on_track'
  if (role === 'manager') return 'badge-submitted'
  return 'badge-approved'
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isEmployee, isManager, isAdmin } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const nav = isAdmin ? adminNav : isManager ? managerNav : employeeNav

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside className="sidebar" style={{ position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px', marginBottom: 4 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
            }}>
              <Target size={18} color="white" />
            </div>
            <div>
              <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>
                Meridian
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Goal Portal
              </div>
            </div>
          </div>
        </div>

        {/* User Profile */}
        {user && (
          <div style={{
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            marginBottom: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: 'white', flexShrink: 0,
              }}>
                {user.name[0].toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  {getRoleIcon(user.role)}
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user.role}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0 12px', marginBottom: 6 }}>
            Navigation
          </div>
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`nav-item ${location.pathname === to || location.pathname.startsWith(to + '/') ? 'active' : ''}`}
            >
              <Icon size={16} />
              {label}
              {(location.pathname === to || location.pathname.startsWith(to + '/')) && (
                <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.6 }} />
              )}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
          <button
            className="nav-item btn-secondary"
            onClick={handleLogout}
            style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg-base)' }}>
        {/* Top Bar */}
        <header style={{
          padding: '16px 32px',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 40,
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              {nav.find(n => location.pathname === n.to || location.pathname.startsWith(n.to + '/'))?.label || 'Meridian'}
            </h2>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              FY2026 · Goal Setting & Tracking
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className={`badge ${getRoleBadgeClass(user?.role || '')}`}>
              {user?.role?.toUpperCase()}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{user?.department}</span>
          </div>
        </header>

        {/* Page Content */}
        <div style={{ padding: 32, maxWidth: 1400, margin: '0 auto' }} className="animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
