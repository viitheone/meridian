import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTeamGoals, getGoalAchievements, getGoalCheckins, addCheckin } from '../../lib/api'
import { getScoreColor } from '../../lib/scoring'
import { MessageSquare, TrendingUp, Send, ChevronDown, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

function EmployeeCheckinCard({ employee, goals }: { employee: any; goals: any[] }) {
  const qc = useQueryClient()
  const [activeQ, setActiveQ] = useState('Q1')
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}>
      {/* Employee header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '16px 20px', background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border-default)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, color: 'white',
        }}>
          {employee?.name?.[0] || '?'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{employee?.name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{employee?.department} · {goals.length} approved goals</div>
        </div>
        {/* Quarter tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          {QUARTERS.map(q => (
            <button
              key={q}
              onClick={e => { e.stopPropagation(); setActiveQ(q) }}
              className={activeQ === q ? 'btn-primary btn-xs' : 'btn-secondary btn-xs'}
            >
              {q}
            </button>
          ))}
        </div>
        {expanded ? <ChevronDown size={18} color="var(--text-muted)" /> : <ChevronRight size={18} color="var(--text-muted)" />}
      </div>

      {expanded && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {goals.map((goal: any) => (
            <GoalCheckinRow key={goal.id} goal={goal} quarter={activeQ} />
          ))}
        </div>
      )}
    </div>
  )
}

function GoalCheckinRow({ goal, quarter }: { goal: any; quarter: string }) {
  const qc = useQueryClient()
  const { data: achievements = [] } = useQuery({
    queryKey: ['achievements', goal.id],
    queryFn: () => getGoalAchievements(goal.id),
  })
  const { data: checkins = [] } = useQuery({
    queryKey: ['checkins', goal.id, quarter],
    queryFn: () => getGoalCheckins(goal.id, quarter),
  })

  const [comment, setComment] = useState('')
  const [showCommentBox, setShowCommentBox] = useState(false)

  const ach = achievements.find((a: any) => a.quarter === quarter)
  const existingCheckin = checkins[0]

  const save = useMutation({
    mutationFn: () => addCheckin({ goal_id: goal.id, quarter, comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checkins', goal.id, quarter] })
      toast.success('Check-in comment saved!')
      setComment('')
      setShowCommentBox(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Save failed'),
  })

  return (
    <div style={{
      padding: '14px 16px', borderRadius: 'var(--radius-md)',
      background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
    }}>
      {/* Goal title + planned vs actual */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, marginBottom: 4 }}>{goal.title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{goal.thrust_area} · <span className="badge badge-submitted">{goal.uom_type.toUpperCase()}</span></div>
        </div>
        <div style={{ display: 'flex', gap: 16, textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>TARGET</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>
              {goal.uom_type === 'zero' ? 0 : goal.target || '—'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>ACTUAL ({quarter})</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: ach ? getScoreColor(ach.score || 0) : 'var(--text-muted)', fontFamily: 'Space Grotesk' }}>
              {ach ? ach.actual : '—'}
            </div>
          </div>
          {ach && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>SCORE</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: getScoreColor(ach.score || 0), fontFamily: 'Space Grotesk' }}>
                {ach.score?.toFixed(1)}%
              </div>
            </div>
          )}
          {ach && (
            <div style={{ alignSelf: 'center' }}>
              <span className={`badge badge-${ach.status}`}>{ach.status.replace('_', ' ')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {ach && goal.uom_type !== 'timeline' && goal.uom_type !== 'zero' && (
        <div className="progress-bar" style={{ marginBottom: 12 }}>
          <div className="progress-bar-fill" style={{
            width: `${Math.min((Number(ach.actual) / Number(goal.target)) * 100, 100)}%`,
            background: `linear-gradient(90deg, ${getScoreColor(ach.score || 0)}, ${getScoreColor(ach.score || 0)}88)`,
          }} />
        </div>
      )}

      {/* Existing comment */}
      {existingCheckin && (
        <div style={{
          padding: '10px 12px', borderRadius: 'var(--radius-md)',
          background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
          marginBottom: 8, fontSize: 13, color: 'var(--text-secondary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <MessageSquare size={12} color="#818cf8" />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#818cf8' }}>Your check-in note</span>
          </div>
          {existingCheckin.comment}
        </div>
      )}

      {/* Add comment */}
      {!showCommentBox ? (
        <button
          className="btn-secondary btn-xs"
          onClick={() => setShowCommentBox(true)}
          style={{ fontSize: 12 }}
        >
          <MessageSquare size={12} />
          {existingCheckin ? 'Update Note' : 'Add Check-in Note'}
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <textarea
              className="form-textarea"
              style={{ minHeight: 60, fontSize: 13 }}
              placeholder="Add your check-in comment — progress observations, risks, next steps..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              className="btn-primary btn-sm"
              onClick={() => save.mutate()}
              disabled={save.isPending || !comment.trim()}
            >
              {save.isPending ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <Send size={13} />}
              Save
            </button>
            <button className="btn-secondary btn-sm" onClick={() => { setShowCommentBox(false); setComment('') }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CheckIn() {
  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['team-goals', 'approved'],
    queryFn: () => getTeamGoals({ status_filter: 'approved' }),
  })

  // Group by employee
  const byEmployee: { [id: string]: { employee: any; goals: any[] } } = {}
  goals.forEach((g: any) => {
    const empId = g.employee_id
    if (!byEmployee[empId]) byEmployee[empId] = { employee: g.employee, goals: [] }
    byEmployee[empId].goals.push(g)
  })
  const groups = Object.values(byEmployee)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 26, marginBottom: 4 }}>Quarterly Check-ins</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Review planned vs actual achievement for each team member and add structured check-in notes.
        </p>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 200 }} />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="glass-card" style={{ padding: 60, textAlign: 'center' }}>
          <TrendingUp size={40} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
          <h3 style={{ marginBottom: 8 }}>No approved goals yet</h3>
          <p style={{ color: 'var(--text-muted)' }}>Check-ins are available once team goals are approved.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {groups.map(({ employee, goals: empGoals }) => (
            <EmployeeCheckinCard key={employee?.id} employee={employee} goals={empGoals} />
          ))}
        </div>
      )}
    </div>
  )
}
