import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMyGoals, createGoal, updateGoal, deleteGoal, submitGoals, getActiveCycle } from '../../lib/api'
import { WeightageBar } from '../../components/WeightageBar'
import { getUoMLabel, getUoMDescription } from '../../lib/scoring'
import { Plus, Trash2, Edit3, Send, Lock, AlertCircle, X, Save, Info } from 'lucide-react'
import toast from 'react-hot-toast'

const THRUST_AREAS = [
  'Revenue Growth', 'Customer Experience', 'Process Excellence',
  'Digital Transformation', 'People Development', 'Safety & Compliance',
  'Innovation', 'Market Expansion', 'Cost Optimization', 'Quality Management',
]

const UOM_TYPES = ['min', 'max', 'timeline', 'zero'] as const

interface GoalFormData {
  thrust_area: string
  title: string
  description: string
  uom_type: 'min' | 'max' | 'timeline' | 'zero'
  target: string
  weightage: string
}

const EMPTY_FORM: GoalFormData = {
  thrust_area: THRUST_AREAS[0],
  title: '',
  description: '',
  uom_type: 'min',
  target: '',
  weightage: '',
}

function GoalFormModal({ onClose, editGoal, cycleId, existingWeight }: {
  onClose: () => void
  editGoal?: any
  cycleId?: string
  existingWeight: number
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<GoalFormData>(editGoal ? {
    thrust_area: editGoal.thrust_area,
    title: editGoal.title,
    description: editGoal.description || '',
    uom_type: editGoal.uom_type,
    target: String(editGoal.target),
    weightage: String(editGoal.weightage),
  } : EMPTY_FORM)

  const isShared = editGoal?.is_shared
  const otherWeight = existingWeight - (editGoal ? Number(editGoal.weightage) : 0)
  const newTotal = otherWeight + Number(form.weightage || 0)

  const create = useMutation({
    mutationFn: (data: any) => createGoal({ ...data, cycle_id: cycleId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-goals'] }); toast.success('Goal created!'); onClose() },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to create goal'),
  })

  const update = useMutation({
    mutationFn: (data: any) => updateGoal(editGoal.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-goals'] }); toast.success('Goal updated!'); onClose() },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to update goal'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...form,
      target: Number(form.target),
      weightage: Number(form.weightage),
    }
    if (editGoal) update.mutate(payload)
    else create.mutate(payload)
  }

  const isLoading = create.isPending || update.isPending

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>{editGoal ? 'Edit Goal' : 'Create New Goal'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Live weightage indicator */}
          <WeightageBar used={newTotal} />

          {/* Thrust Area */}
          <div>
            <label className="form-label">Thrust Area</label>
            <select
              className="form-select"
              value={form.thrust_area}
              onChange={e => setForm(f => ({ ...f, thrust_area: e.target.value }))}
              disabled={isShared}
              required
            >
              {THRUST_AREAS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="form-label">Goal Title</label>
            <input
              className="form-input"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g., Increase Q2 Sales Revenue"
              disabled={isShared}
              required
              maxLength={200}
            />
            {isShared && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Info size={11} /> Shared goal — title is read-only
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe the goal, success criteria, context..."
              disabled={isShared}
            />
          </div>

          {/* UoM + Target */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="form-label">Unit of Measurement</label>
              <select
                className="form-select"
                value={form.uom_type}
                onChange={e => setForm(f => ({ ...f, uom_type: e.target.value as any }))}
                disabled={isShared}
                required
              >
                {UOM_TYPES.map(t => (
                  <option key={t} value={t}>{getUoMLabel(t)}</option>
                ))}
              </select>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                {getUoMDescription(form.uom_type)}
              </div>
            </div>
            <div>
              <label className="form-label">
                {form.uom_type === 'timeline' ? 'Deadline (YYYY-MM-DD)' : 'Target Value'}
              </label>
              <input
                className="form-input"
                type={form.uom_type === 'timeline' ? 'date' : 'number'}
                value={form.target}
                onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                placeholder={form.uom_type === 'zero' ? '0' : 'e.g., 50'}
                disabled={isShared || form.uom_type === 'zero'}
                step="any"
              />
              {form.uom_type === 'zero' && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Target is always 0 for zero-based goals
                </div>
              )}
            </div>
          </div>

          {/* Weightage */}
          <div>
            <label className="form-label">
              Weightage (%) <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>— min 10%, must total 100%</span>
            </label>
            <input
              className="form-input"
              type="number"
              value={form.weightage}
              onChange={e => setForm(f => ({ ...f, weightage: e.target.value }))}
              placeholder="e.g., 25"
              min={10}
              max={100}
              step={5}
              required
              style={{
                borderColor: Number(form.weightage) < 10 && form.weightage ? 'var(--accent-rose)' :
                  newTotal > 100 ? 'var(--accent-rose)' : undefined,
              }}
            />
            {Number(form.weightage) < 10 && form.weightage && (
              <div style={{ fontSize: 12, color: '#f43f5e', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle size={12} /> Minimum weightage is 10%
              </div>
            )}
            {newTotal > 100 && (
              <div style={{ fontSize: 12, color: '#f43f5e', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle size={12} /> Total would exceed 100% ({newTotal.toFixed(0)}%)
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading || newTotal > 100 || Number(form.weightage) < 10}
            >
              {isLoading ? <span className="spinner" /> : <Save size={16} />}
              {editGoal ? 'Save Changes' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function GoalSheet() {
  const qc = useQueryClient()
  const { data: goals = [], isLoading } = useQuery<any[]>({ queryKey: ['my-goals'], queryFn: () => getMyGoals() })
  const { data: cycle } = useQuery<any>({ queryKey: ['active-cycle'], queryFn: () => getActiveCycle() })
  const [showForm, setShowForm] = useState(false)
  const [editGoal, setEditGoal] = useState<any>(null)

  const totalWeight = goals.reduce((s: number, g: any) => s + Number(g.weightage), 0)
  const canSubmit = goals.some((g: any) => g.status === 'draft')
  const canCreate = goals.length < 8

  const del = useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-goals'] }); toast.success('Goal deleted') },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Cannot delete'),
  })

  const submit = useMutation({
    mutationFn: () => submitGoals(cycle?.id),
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ['my-goals'] }); toast.success(data.message) },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Submission failed'),
  })

  const draftGoals = goals.filter((g: any) => g.status === 'draft')
  const submittedGoals = goals.filter((g: any) => g.status === 'submitted')
  const approvedGoals = goals.filter((g: any) => g.status === 'approved')
  const returnedGoals = goals.filter((g: any) => g.status === 'returned')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 26, marginBottom: 4 }}>My Goal Sheet</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {cycle ? `FY${cycle.year} · ${cycle.phase}` : 'FY2026'} · {goals.length}/8 goals · {totalWeight.toFixed(0)}% weightage used
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {canSubmit && Math.abs(totalWeight - 100) < 0.01 && (
            <button
              id="submit-goals-btn"
              className="btn-success"
              onClick={() => submit.mutate()}
              disabled={submit.isPending}
            >
              {submit.isPending ? <span className="spinner" /> : <Send size={16} />}
              Submit for Approval
            </button>
          )}
          {canCreate && (
            <button
              id="create-goal-btn"
              className="btn-primary"
              onClick={() => { setEditGoal(null); setShowForm(true) }}
            >
              <Plus size={16} /> Add Goal
            </button>
          )}
        </div>
      </div>

      {/* Weightage bar */}
      <WeightageBar used={totalWeight} />

      {!canCreate && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', fontSize: 13 }}>
          ⚠ You've reached the maximum of 8 goals. Delete a draft goal to add a new one.
        </div>
      )}

      {/* Returned alerts */}
      {returnedGoals.map((g: any) => (
        <div key={g.id} style={{ padding: '14px 18px', borderRadius: 'var(--radius-md)', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', color: '#f43f5e' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>⚠ Goal returned: "{g.title}"</div>
          <div style={{ fontSize: 13 }}>Manager comment: <em>{g.return_comment || 'No comment provided'}</em></div>
        </div>
      ))}

      {/* Goals Table */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 60 }} />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="glass-card" style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
          <h3 style={{ marginBottom: 8 }}>No goals yet</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Start by adding your first goal for this cycle</p>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Create First Goal
          </button>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Goal Title</th>
                <th>Thrust Area</th>
                <th>UoM</th>
                <th>Target</th>
                <th>Weightage</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {goals.map((g: any, i: number) => (
                <tr key={g.id} className="animate-fade-in">
                  <td style={{ color: 'var(--text-muted)', width: 32 }}>{i + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {g.locked && <Lock size={12} color="var(--text-muted)" />}
                      <div>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{g.title}</div>
                        {g.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, maxWidth: 280 }}>{g.description.slice(0, 80)}{g.description.length > 80 ? '…' : ''}</div>}
                        {g.is_shared && <span style={{ fontSize: 10, background: 'rgba(99,102,241,0.15)', color: '#818cf8', padding: '1px 6px', borderRadius: 4, border: '1px solid rgba(99,102,241,0.25)' }}>SHARED</span>}
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 13 }}>{g.thrust_area}</td>
                  <td><span className="badge badge-submitted">{g.uom_type.toUpperCase()}</span></td>
                  <td style={{ color: 'var(--text-primary)' }}>{g.uom_type === 'timeline' ? g.target || '—' : g.target}</td>
                  <td>
                    <strong style={{ color: 'var(--text-primary)', fontSize: 15 }}>{g.weightage}%</strong>
                  </td>
                  <td><span className={`badge badge-${g.status}`}>{g.status.replace('_', ' ')}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(g.status === 'draft' || g.status === 'returned') && !g.locked && (
                        <>
                          <button
                            className="btn-secondary btn-xs"
                            onClick={() => { setEditGoal(g); setShowForm(true) }}
                            title="Edit"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            className="btn-danger btn-xs"
                            onClick={() => { if (confirm('Delete this goal?')) del.mutate(g.id) }}
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                      {g.is_shared && !g.locked && g.status !== 'approved' && (
                        <button
                          className="btn-secondary btn-xs"
                          onClick={() => { setEditGoal(g); setShowForm(true) }}
                          title="Adjust weightage"
                        >
                          <Edit3 size={12} /> Weightage
                        </button>
                      )}
                      {g.locked && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Locked</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)', paddingRight: 14 }}>Total Weightage:</td>
                <td style={{ fontWeight: 800, fontSize: 16, color: Math.abs(totalWeight - 100) < 0.01 ? '#10b981' : totalWeight > 100 ? '#f43f5e' : 'var(--text-primary)' }}>
                  {totalWeight.toFixed(0)}%
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Submit hint */}
      {canSubmit && Math.abs(totalWeight - 100) > 0.01 && totalWeight > 0 && (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
          Total weightage must equal exactly 100% before you can submit. Currently: {totalWeight.toFixed(0)}%
        </div>
      )}

      {/* Goal Form Modal */}
      {showForm && (
        <GoalFormModal
          onClose={() => { setShowForm(false); setEditGoal(null) }}
          editGoal={editGoal}
          cycleId={cycle?.id}
          existingWeight={totalWeight}
        />
      )}
    </div>
  )
}
