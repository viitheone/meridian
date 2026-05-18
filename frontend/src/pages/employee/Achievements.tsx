import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMyGoals, getGoalAchievements, logAchievement, updateAchievement } from '../../lib/api'
import { computeScore, scoreToPercent, getScoreColor, getUoMLabel } from '../../lib/scoring'
import { CheckCircle, Clock, AlertCircle, Save, TrendingUp, Info } from 'lucide-react'
import toast from 'react-hot-toast'

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

function ScoreRing({ score }: { score: number }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const pct = Math.min(score, 150)
  const dash = (pct / 150) * circ
  const color = getScoreColor(score)

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={70} height={70} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={35} cy={35} r={r} fill="none" stroke="var(--bg-surface)" strokeWidth={5} />
        <circle
          cx={35} cy={35} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color, lineHeight: 1 }}>{score.toFixed(0)}%</div>
      </div>
    </div>
  )
}

function GoalAchievementCard({ goal }: { goal: any }) {
  const qc = useQueryClient()
  const { data: achievements = [] } = useQuery({
    queryKey: ['achievements', goal.id],
    queryFn: () => getGoalAchievements(goal.id),
  })

  const [activeQ, setActiveQ] = useState('Q1')
  const [form, setForm] = useState({ actual: '', status: 'on_track', completion_date: '' })

  const currentAch = achievements.find((a: any) => a.quarter === activeQ)

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        actual: Number(form.actual),
        status: form.status,
        completion_date: form.completion_date || null,
        quarter: activeQ,
      }
      if (currentAch) return updateAchievement(goal.id, activeQ, payload)
      return logAchievement(goal.id, payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['achievements', goal.id] })
      toast.success(`${activeQ} achievement saved!`)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Save failed'),
  })

  // Populate form when switching quarter
  const handleQSwitch = (q: string) => {
    setActiveQ(q)
    const ach = achievements.find((a: any) => a.quarter === q)
    if (ach) {
      setForm({ actual: String(ach.actual), status: ach.status, completion_date: ach.completion_date || '' })
    } else {
      setForm({ actual: '', status: 'on_track', completion_date: '' })
    }
  }

  const previewScore = form.actual !== ''
    ? scoreToPercent(computeScore(goal.uom_type, Number(goal.target), Number(form.actual),
        form.completion_date || null,
        goal.uom_type === 'timeline' ? String(goal.target) : null))
    : null

  return (
    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Goal Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        background: 'var(--bg-elevated)',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{goal.title}</span>
            <span className="badge badge-submitted">{goal.uom_type.toUpperCase()}</span>
            <span className="badge badge-approved">{goal.weightage}%</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {goal.thrust_area} · Target: {goal.uom_type === 'timeline' ? goal.target || 'N/A' : goal.target}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {achievements.map((a: any) => (
            <div key={a.quarter} style={{ textAlign: 'center' }}>
              <ScoreRing score={a.score || 0} />
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{a.quarter}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quarter tabs + form */}
      <div style={{ padding: '16px 20px' }}>
        {/* Quarter selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {QUARTERS.map(q => {
            const has = achievements.find((a: any) => a.quarter === q)
            return (
              <button
                key={q}
                onClick={() => handleQSwitch(q)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${activeQ === q ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                  background: activeQ === q ? 'rgba(99,102,241,0.15)' : 'var(--bg-elevated)',
                  color: activeQ === q ? '#818cf8' : 'var(--text-secondary)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                {q}
                {has && <CheckCircle size={12} color="#10b981" />}
              </button>
            )
          })}
        </div>

        {/* Achievement form */}
        <div style={{ display: 'grid', gridTemplateColumns: goal.uom_type === 'timeline' ? '1fr 1fr 1fr auto' : '1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
          <div>
            <label className="form-label">
              {goal.uom_type === 'zero' ? 'Incidents (0 = 100%)' :
               goal.uom_type === 'timeline' ? 'Completion Date' :
               'Actual Achievement'}
            </label>
            {goal.uom_type === 'timeline' ? (
              <input
                type="date"
                className="form-input"
                value={form.completion_date}
                onChange={e => setForm(f => ({ ...f, completion_date: e.target.value }))}
              />
            ) : (
              <input
                type="number"
                className="form-input"
                value={form.actual}
                onChange={e => setForm(f => ({ ...f, actual: e.target.value }))}
                placeholder={`Target: ${goal.target}`}
                step="any"
              />
            )}
          </div>

          <div>
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            >
              <option value="not_started">Not Started</option>
              <option value="on_track">On Track</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Preview score */}
          {previewScore !== null && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Preview Score</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: getScoreColor(previewScore), fontFamily: 'Space Grotesk' }}>
                {previewScore.toFixed(1)}%
              </div>
            </div>
          )}

          <button
            className="btn-primary btn-sm"
            onClick={() => save.mutate()}
            disabled={save.isPending || (!form.actual && !form.completion_date)}
            style={{ height: 40, alignSelf: 'flex-end' }}
          >
            {save.isPending ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Save size={14} />}
            Save
          </button>
        </div>

        {currentAch && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Info size={14} color="var(--text-muted)" />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Saved: <strong style={{ color: 'var(--text-primary)' }}>{currentAch.actual}</strong> · 
              Score: <strong style={{ color: getScoreColor(currentAch.score || 0) }}>{currentAch.score?.toFixed(1)}%</strong> · 
              Status: <span className={`badge badge-${currentAch.status}`}>{currentAch.status.replace('_', ' ')}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Achievements() {
  const { data: goals = [], isLoading } = useQuery<any[]>({
    queryKey: ['my-goals'],
    queryFn: () => getMyGoals(),
  })

  const approvedGoals = goals.filter((g: any) => g.status === 'approved')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 26, marginBottom: 4 }}>Quarterly Check-ins</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Log your actual achievements for each quarter. Scores are computed automatically based on your UoM type.
        </p>
      </div>

      {/* UoM formula legend */}
      <div className="glass-card" style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>Score Formula Reference</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {([
            { type: 'min', formula: 'Achievement ÷ Target', example: 'Sales, Revenue' },
            { type: 'max', formula: 'Target ÷ Achievement', example: 'TAT, Cost' },
            { type: 'timeline', formula: 'On-time = 100%', example: 'Projects, Milestones' },
            { type: 'zero', formula: '0 = 100%, else 0%', example: 'Safety Incidents' },
          ] as any[]).map(({ type, formula, example }) => (
            <div key={type} style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <span className="badge badge-submitted" style={{ marginBottom: 6, display: 'inline-block' }}>{type.toUpperCase()}</span>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{formula}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{example}</div>
            </div>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 160 }} />)}
        </div>
      ) : approvedGoals.length === 0 ? (
        <div className="glass-card" style={{ padding: 60, textAlign: 'center' }}>
          <TrendingUp size={40} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
          <h3 style={{ marginBottom: 8 }}>No approved goals yet</h3>
          <p style={{ color: 'var(--text-muted)' }}>Check-ins are available only for goals approved by your manager.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {approvedGoals.map((goal: any) => (
            <GoalAchievementCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  )
}
