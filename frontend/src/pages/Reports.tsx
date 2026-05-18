import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAchievementReport, getCompletionDashboard, getAuditTrail, exportCSV } from '../lib/api'
import { getScoreColor } from '../lib/scoring'
import { Download, Filter, Shield, TrendingUp, CheckSquare, Users } from 'lucide-react'

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

export default function Reports() {
  const [quarter, setQuarter] = useState('Q1')
  const [activeTab, setActiveTab] = useState<'achievement' | 'completion' | 'audit'>('achievement')

  const { data: report = [], isLoading: reportLoading } = useQuery({
    queryKey: ['achievement-report', quarter],
    queryFn: () => getAchievementReport(quarter),
    enabled: activeTab === 'achievement',
  })

  const { data: completion = [], isLoading: compLoading } = useQuery({
    queryKey: ['completion', quarter],
    queryFn: () => getCompletionDashboard(quarter),
    enabled: activeTab === 'completion',
  })

  const { data: audit = [], isLoading: auditLoading } = useQuery({
    queryKey: ['audit'],
    queryFn: () => getAuditTrail(),
    enabled: activeTab === 'audit',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 26, marginBottom: 4 }}>Reports & Governance</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Achievement data, completion rates, and full audit trail</p>
        </div>
        <button
          className="btn-secondary"
          onClick={() => exportCSV(quarter)}
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Quarter filter */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Filter size={14} color="var(--text-muted)" />
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Quarter:</span>
        {QUARTERS.map(q => (
          <button key={q} onClick={() => setQuarter(q)} className={quarter === q ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}>
            {q}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-default)', paddingBottom: 0 }}>
        {[
          { id: 'achievement', label: 'Achievement Report', icon: TrendingUp },
          { id: 'completion', label: 'Completion Dashboard', icon: CheckSquare },
          { id: 'audit', label: 'Audit Trail', icon: Shield },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            style={{
              padding: '10px 18px',
              background: 'none', border: 'none',
              borderBottom: `2px solid ${activeTab === id ? 'var(--accent-primary)' : 'transparent'}`,
              color: activeTab === id ? 'var(--text-accent)' : 'var(--text-muted)',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'color 0.15s',
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Achievement Report */}
      {activeTab === 'achievement' && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Planned vs Actual — {quarter}</h3>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{report.length} records</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Goal</th>
                  <th>Thrust Area</th>
                  <th>UoM</th>
                  <th>Target</th>
                  <th>Wt. (%)</th>
                  <th>Actual</th>
                  <th>Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {report.map((row: any, i: number) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{row.employee_name}</td>
                    <td>{row.department}</td>
                    <td style={{ maxWidth: 200 }}>
                      <span title={row.goal_title}>{row.goal_title.length > 35 ? row.goal_title.slice(0, 35) + '…' : row.goal_title}</span>
                    </td>
                    <td style={{ fontSize: 12 }}>{row.thrust_area}</td>
                    <td><span className="badge badge-submitted">{row.uom_type.toUpperCase()}</span></td>
                    <td>{row.target}</td>
                    <td><strong>{row.weightage}%</strong></td>
                    <td style={{ color: 'var(--text-primary)' }}>{row.actual ?? '—'}</td>
                    <td>
                      {row.score != null ? (
                        <span style={{ fontWeight: 700, color: getScoreColor(row.score) }}>
                          {row.score.toFixed(1)}%
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      {row.status && <span className={`badge badge-${row.status}`}>{row.status.replace('_', ' ')}</span>}
                    </td>
                  </tr>
                ))}
                {report.length === 0 && (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No data for {quarter}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Completion Dashboard */}
      {activeTab === 'completion' && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-default)' }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Check-in Completion — {quarter}</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Manager</th>
                <th>Department</th>
                <th>Total Goals</th>
                <th>Achievements Logged</th>
                <th>Achievement Rate</th>
                <th>Check-in Status</th>
              </tr>
            </thead>
            <tbody>
              {completion.map((row: any) => (
                <tr key={row.employee_id}>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{row.employee_name}</td>
                  <td>{row.manager_name || '—'}</td>
                  <td>{row.department}</td>
                  <td>{row.total_goals}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="progress-bar" style={{ width: 80 }}>
                        <div className="progress-bar-fill" style={{
                          width: `${row.achievement_rate}%`,
                          background: 'linear-gradient(90deg, #10b981, #06b6d4)',
                        }} />
                      </div>
                      <span style={{ fontSize: 12 }}>{row.achievements_logged}/{row.total_goals}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: getScoreColor(row.achievement_rate) }}>
                      {row.achievement_rate.toFixed(1)}%
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${row.checkin_complete ? 'badge-approved' : 'badge-not_started'}`}>
                      {row.checkin_complete ? '✓ Complete' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
              {completion.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Audit Trail */}
      {activeTab === 'audit' && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={16} color="#f59e0b" />
            <h3 style={{ margin: 0, fontSize: 15 }}>Audit Trail</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>All changes to goals after lock date</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Changed By</th>
                <th>Goal ID</th>
                <th>Field</th>
                <th>Old Value</th>
                <th>New Value</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((entry: any) => (
                <tr key={entry.id}>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {entry.changer ? entry.changer.name : entry.changed_by?.slice(0, 8) + '…'}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {entry.goal_id?.slice(0, 8)}…
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--text-accent)' }}>{entry.field}</span>
                  </td>
                  <td style={{ color: '#f43f5e', fontSize: 13 }}>{entry.old_val ?? '—'}</td>
                  <td style={{ color: '#10b981', fontSize: 13 }}>{entry.new_val ?? '—'}</td>
                  <td>
                    <span className={`badge ${entry.action === 'approve' ? 'badge-approved' : entry.action === 'return' ? 'badge-returned' : 'badge-submitted'}`}>
                      {entry.action}
                    </span>
                  </td>
                </tr>
              ))}
              {audit.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No audit entries yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
