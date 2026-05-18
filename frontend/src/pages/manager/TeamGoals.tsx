import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTeamGoals, reviewGoal, getTeam, unlockGoal } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import { Check, X, Edit3, Lock, Unlock, ChevronDown, ChevronRight, User, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'

function GoalReviewCard({ goals, employee }: { goals: any[]; employee: any }) {
  const qc = useQueryClient()
  const { isAdmin } = useAuth()
  const [expanded, setExpanded] = useState(true)
  const [editing, setEditing] = useState<{ [id: string]: { target?: string; weightage?: string } }>({})
  const [returnComment, setReturnComment] = useState<{ [id: string]: string }>({})
  const [showReturn, setShowReturn] = useState<{ [id: string]: boolean }>({})

  const totalWeight = goals.reduce((s, g) => s + Number(g.weightage), 0)

  const review = useMutation({
    mutationFn: ({ id, action, comment, target, weightage }: any) =>
      reviewGoal(id, { action, return_comment: comment, target, weightage }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['team-goals'] })
      toast.success(vars.action === 'approve' ? 'Goal approved and locked!' : 'Goal returned for revision')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Action failed'),
  })

  const unlock = useMutation({
    mutationFn: unlockGoal,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['team-goals'] }); toast.success('Goal unlocked') },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Unlock failed'),
  })

  const approveAll = async () => {
    if (Math.abs(totalWeight - 100) > 0.01) {
      toast.error(`Total weightage is ${totalWeight}%. Must be 100% before approving all.`)
      return
    }
    const submittedGoals = goals.filter(g => g.status === 'submitted')
    for (const g of submittedGoals) {
      await reviewGoal(g.id, { action: 'approve' })
    }
    qc.invalidateQueries({ queryKey: ['team-goals'] })
    toast.success(`Approved all ${submittedGoals.length} goals for ${employee.name}`)
  }

  const pendingCount = goals.filter(g => g.status === 'submitted').length

  return (
    <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}>
      {/* Employee header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '16px 20px',
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border-default)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 12,
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, color: 'white', flexShrink: 0,
        }}>
          {employee.name[0]}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{employee.name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {employee.department} · {goals.length} goals · {totalWeight.toFixed(0)}% total weightage
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {pendingCount > 0 && (
            <span className="badge badge-submitted">{pendingCount} pending</span>
          )}
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: Math.abs(totalWeight - 100) < 0.01 ? '#10b981' : '#f43f5e',
          }}>
            {Math.abs(totalWeight - 100) < 0.01 ? '✓ 100%' : `${totalWeight.toFixed(0)}% ≠ 100`}
          </span>
          {pendingCount > 0 && Math.abs(totalWeight - 100) < 0.01 && (
            <button
              className="btn-success btn-sm"
              onClick={e => { e.stopPropagation(); approveAll() }}
            >
              <Check size={13} /> Approve All
            </button>
          )}
          {expanded ? <ChevronDown size={18} color="var(--text-muted)" /> : <ChevronRight size={18} color="var(--text-muted)" />}
        </div>
      </div>

      {expanded && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Goal</th>
              <th>UoM</th>
              <th>Target</th>
              <th>Weightage</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {goals.map((g: any) => (
              <>
                <tr key={g.id}>
                  <td>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {g.locked && <Lock size={12} color="var(--text-muted)" />}
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{g.title}</span>
                        {g.is_shared && <span style={{ fontSize: 10, background: 'rgba(99,102,241,0.15)', color: '#818cf8', padding: '1px 6px', borderRadius: 4 }}>SHARED</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{g.thrust_area}</div>
                    </div>
                  </td>
                  <td><span className="badge badge-submitted">{g.uom_type.toUpperCase()}</span></td>
                  <td>
                    {g.status === 'submitted' ? (
                      <input
                        type="number"
                        className="form-input"
                        style={{ width: 100, padding: '4px 8px', fontSize: 13 }}
                        defaultValue={g.target}
                        onChange={e => setEditing(ed => ({ ...ed, [g.id]: { ...ed[g.id], target: e.target.value } }))}
                        step="any"
                      />
                    ) : g.target}
                  </td>
                  <td>
                    {g.status === 'submitted' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="number"
                          className="form-input"
                          style={{ width: 80, padding: '4px 8px', fontSize: 13 }}
                          defaultValue={g.weightage}
                          onChange={e => setEditing(ed => ({ ...ed, [g.id]: { ...ed[g.id], weightage: e.target.value } }))}
                          min={10} max={100}
                        />
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>%</span>
                      </div>
                    ) : <strong style={{ color: 'var(--text-primary)' }}>{g.weightage}%</strong>}
                  </td>
                  <td><span className={`badge badge-${g.status}`}>{g.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {g.status === 'submitted' && (
                        <>
                          <button
                            className="btn-success btn-xs"
                            title="Approve"
                            onClick={() => review.mutate({
                              id: g.id, action: 'approve',
                              target: editing[g.id]?.target ? Number(editing[g.id].target) : undefined,
                              weightage: editing[g.id]?.weightage ? Number(editing[g.id].weightage) : undefined,
                            })}
                            disabled={review.isPending}
                          >
                            <Check size={12} /> Approve
                          </button>
                          <button
                            className="btn-danger btn-xs"
                            title="Return"
                            onClick={() => setShowReturn(s => ({ ...s, [g.id]: !s[g.id] }))}
                          >
                            <X size={12} /> Return
                          </button>
                        </>
                      )}
                      {g.locked && isAdmin && (
                        <button className="btn-secondary btn-xs" onClick={() => unlock.mutate(g.id)} disabled={unlock.isPending}>
                          <Unlock size={12} /> Unlock
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {/* Return comment input */}
                {showReturn[g.id] && g.status === 'submitted' && (
                  <tr key={`${g.id}-return`}>
                    <td colSpan={6} style={{ background: 'rgba(244,63,94,0.04)', padding: '12px 20px' }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                          <label className="form-label" style={{ color: '#f43f5e' }}>Return Reason</label>
                          <textarea
                            className="form-textarea"
                            style={{ minHeight: 60 }}
                            placeholder="Explain why this goal needs revision..."
                            value={returnComment[g.id] || ''}
                            onChange={e => setReturnComment(c => ({ ...c, [g.id]: e.target.value }))}
                          />
                        </div>
                        <button
                          className="btn-danger"
                          onClick={() => review.mutate({ id: g.id, action: 'return', comment: returnComment[g.id] })}
                          disabled={review.isPending || !returnComment[g.id]}
                        >
                          <X size={14} /> Return Goal
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default function TeamGoals() {
  const { isAdmin } = useAuth()
  const [statusFilter, setStatusFilter] = useState('submitted')
  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['team-goals', statusFilter],
    queryFn: () => getTeamGoals({ status_filter: statusFilter || undefined }),
  })

  // Group goals by employee
  const byEmployee: { [id: string]: { employee: any; goals: any[] } } = {}
  goals.forEach((g: any) => {
    const empId = g.employee_id
    if (!byEmployee[empId]) byEmployee[empId] = { employee: g.employee, goals: [] }
    byEmployee[empId].goals.push(g)
  })

  const groups = Object.values(byEmployee)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 26, marginBottom: 4 }}>{isAdmin ? 'All Employee Goals' : 'Team Goal Review'}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Review, edit, approve or return team goals. Approved goals are locked automatically.
          </p>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8 }}>
        {['submitted', 'approved', 'returned', 'draft', ''].map(s => (
          <button
            key={s || 'all'}
            onClick={() => setStatusFilter(s)}
            className={statusFilter === s ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 120 }} />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="glass-card" style={{ padding: 60, textAlign: 'center' }}>
          <User size={40} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
          <h3 style={{ marginBottom: 8 }}>No {statusFilter} goals found</h3>
          <p style={{ color: 'var(--text-muted)' }}>Check back when team members submit their goals.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {groups.map(({ employee, goals: empGoals }) => (
            <GoalReviewCard key={employee?.id} employee={employee || { name: 'Unknown', department: '' }} goals={empGoals} />
          ))}
        </div>
      )}
    </div>
  )
}
