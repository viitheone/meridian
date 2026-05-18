import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { getMyGoals, getStats, getCompletionDashboard } from '../lib/api'
import { Target, CheckSquare, TrendingUp, Clock, AlertCircle, ChevronRight, Lock, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

function StatCard({ label, value, sub, color, icon: Icon }: any) {
  return (
    <div className="stat-card" style={{ flex: 1, minWidth: 180 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${color}20`, border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} color={color} />
        </div>
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, fontFamily: 'Space Grotesk', color: 'var(--text-primary)', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function EmployeeDashboard() {
  const { user } = useAuth()
  const { data: goals = [] } = useQuery({ queryKey: ['my-goals'], queryFn: () => getMyGoals() })

  const totalWeight = goals.reduce((s: number, g: any) => s + Number(g.weightage), 0)
  const approved = goals.filter((g: any) => g.status === 'approved').length
  const pending = goals.filter((g: any) => g.status === 'submitted').length
  const returned = goals.filter((g: any) => g.status === 'returned').length
  const draft = goals.filter((g: any) => g.status === 'draft').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Welcome */}
      <div>
        <h1 style={{ fontSize: 28, marginBottom: 6 }}>
          Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>FY2026 Goal Setting Portal · {user?.department}</p>
      </div>

      {/* Alerts */}
      {returned > 0 && (
        <div style={{
          padding: '14px 18px', borderRadius: 'var(--radius-md)',
          background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)',
          display: 'flex', alignItems: 'center', gap: 12, color: '#f43f5e',
        }}>
          <AlertCircle size={18} />
          <span style={{ fontWeight: 600 }}>{returned} goal(s) returned for revision.</span>
          <Link to="/goals" className="btn-danger btn-sm" style={{ marginLeft: 'auto', textDecoration: 'none' }}>
            Review Now <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <StatCard label="Total Goals" value={goals.length} sub={`Max 8 · ${8 - goals.length} slots left`} color="#6366f1" icon={Target} />
        <StatCard label="Approved" value={approved} sub="Locked goals" color="#10b981" icon={CheckSquare} />
        <StatCard label="Pending Review" value={pending} sub="Awaiting manager" color="#f59e0b" icon={Clock} />
        <StatCard label="Weightage Used" value={`${totalWeight.toFixed(0)}%`} sub={totalWeight === 100 ? '✓ Ready to submit' : `${(100 - totalWeight).toFixed(0)}% remaining`} color={totalWeight === 100 ? '#10b981' : '#6366f1'} icon={TrendingUp} />
      </div>

      {/* Recent Goals */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 16, margin: 0 }}>My Goals</h3>
          <Link to="/goals" style={{ fontSize: 13, color: 'var(--accent-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            Manage <ChevronRight size={14} />
          </Link>
        </div>
        {goals.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Target size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <div style={{ fontSize: 15, marginBottom: 8 }}>No goals yet</div>
            <Link to="/goals" className="btn-primary btn-sm" style={{ textDecoration: 'none', display: 'inline-flex' }}>
              Create Your First Goal
            </Link>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Goal</th>
                <th>Thrust Area</th>
                <th>UoM</th>
                <th>Target</th>
                <th>Weightage</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {goals.slice(0, 6).map((g: any) => (
                <tr key={g.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {g.locked && <Lock size={12} color="var(--text-muted)" />}
                      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{g.title}</span>
                    </div>
                  </td>
                  <td>{g.thrust_area}</td>
                  <td><span className="badge badge-submitted">{g.uom_type.toUpperCase()}</span></td>
                  <td>{g.target}</td>
                  <td><strong style={{ color: 'var(--text-primary)' }}>{g.weightage}%</strong></td>
                  <td><span className={`badge badge-${g.status}`}>{g.status.replace('_', ' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick links */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Link to="/goals" className="btn-primary" style={{ textDecoration: 'none' }}>
          <Target size={16} /> Manage Goals
        </Link>
        {approved > 0 && (
          <Link to="/achievements" className="btn-secondary" style={{ textDecoration: 'none' }}>
            <CheckSquare size={16} /> Log Achievements
          </Link>
        )}
      </div>
    </div>
  )
}

function ManagerDashboard() {
  const { user } = useAuth()
  const { data: stats } = useQuery<any>({ queryKey: ['stats'], queryFn: getStats })
  const { data: completion = [] } = useQuery({ queryKey: ['completion', 'Q1'], queryFn: () => getCompletionDashboard('Q1') })

  const pendingApproval = stats?.goals_pending || 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <h1 style={{ fontSize: 28, marginBottom: 6 }}>
          Manager Dashboard, <span className="gradient-text">{user?.name?.split(' ')[0]}</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>Team performance · {user?.department}</p>
      </div>

      {pendingApproval > 0 && (
        <div style={{
          padding: '14px 18px', borderRadius: 'var(--radius-md)',
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
          display: 'flex', alignItems: 'center', gap: 12, color: '#f59e0b',
        }}>
          <AlertCircle size={18} />
          <span style={{ fontWeight: 600 }}>{pendingApproval} goal sheet(s) awaiting your approval.</span>
          <Link to="/team-goals" className="btn-sm" style={{ marginLeft: 'auto', textDecoration: 'none', padding: '6px 12px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            Review Now <ArrowRight size={12} />
          </Link>
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <StatCard label="Team Members" value={stats?.total_employees || 0} color="#6366f1" icon={Target} />
        <StatCard label="Goals Approved" value={stats?.goals_approved || 0} color="#10b981" icon={CheckSquare} />
        <StatCard label="Pending Approval" value={stats?.goals_pending || 0} color="#f59e0b" icon={Clock} />
        <StatCard label="Check-ins Done" value={stats?.checkins_completed || 0} sub="Q1 so far" color="#06b6d4" icon={TrendingUp} />
      </div>

      {/* Q1 Completion */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 16, margin: 0 }}>Q1 Check-in Completion</h3>
          <Link to="/check-in" style={{ fontSize: 13, color: 'var(--accent-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            View All <ChevronRight size={14} />
          </Link>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Goals</th>
              <th>Achievements Logged</th>
              <th>Check-in Status</th>
            </tr>
          </thead>
          <tbody>
            {completion.map((row: any) => (
              <tr key={row.employee_id}>
                <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{row.employee_name}</td>
                <td>{row.department}</td>
                <td>{row.total_goals}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="progress-bar" style={{ width: 80 }}>
                      <div className="progress-bar-fill" style={{
                        width: `${row.total_goals ? (row.achievements_logged / row.total_goals) * 100 : 0}%`,
                        background: 'linear-gradient(90deg, #10b981, #06b6d4)',
                      }} />
                    </div>
                    <span style={{ fontSize: 12 }}>{row.achievements_logged}/{row.total_goals}</span>
                  </div>
                </td>
                <td>
                  <span className={`badge ${row.checkin_complete ? 'badge-approved' : 'badge-not_started'}`}>
                    {row.checkin_complete ? '✓ Done' : 'Pending'}
                  </span>
                </td>
              </tr>
            ))}
            {completion.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No team data yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AdminDashboard() {
  const { user } = useAuth()
  const { data: stats } = useQuery<any>({ queryKey: ['stats'], queryFn: getStats })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <h1 style={{ fontSize: 28, marginBottom: 6 }}>
          Admin Dashboard, <span className="gradient-text">{user?.name?.split(' ')[0]}</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>Organization-wide goal oversight</p>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <StatCard label="Total Employees" value={stats?.total_employees || 0} color="#6366f1" icon={Target} />
        <StatCard label="Goals Approved" value={stats?.goals_approved || 0} color="#10b981" icon={CheckSquare} />
        <StatCard label="Pending Approval" value={stats?.goals_pending || 0} color="#f59e0b" icon={Clock} />
        <StatCard label="Completion Rate" value={`${stats?.avg_completion_rate || 0}%`} color="#06b6d4" icon={TrendingUp} />
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Link to="/team-goals" className="btn-primary" style={{ textDecoration: 'none' }}>
          <Target size={16} /> All Goals
        </Link>
        <Link to="/reports" className="btn-secondary" style={{ textDecoration: 'none' }}>
          <TrendingUp size={16} /> Reports
        </Link>
        <Link to="/cycles" className="btn-secondary" style={{ textDecoration: 'none' }}>
          <Clock size={16} /> Manage Cycles
        </Link>
        <Link to="/audit" className="btn-secondary" style={{ textDecoration: 'none' }}>
          <CheckSquare size={16} /> Audit Trail
        </Link>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { isEmployee, isManager, isAdmin } = useAuth()
  if (isAdmin) return <AdminDashboard />
  if (isManager) return <ManagerDashboard />
  return <EmployeeDashboard />
}
