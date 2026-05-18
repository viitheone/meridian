import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listUsers, pushSharedGoal, getActiveCycle } from '../../lib/api'
import { getUoMLabel, getUoMDescription } from '../../lib/scoring'
import { Users, Send, Plus, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const THRUST_AREAS = [
  'Revenue Growth', 'Customer Experience', 'Process Excellence',
  'Digital Transformation', 'People Development', 'Safety & Compliance',
  'Innovation', 'Market Expansion', 'Cost Optimization', 'Quality Management',
]

const UOM_TYPES = ['min', 'max', 'timeline', 'zero'] as const

export default function SharedGoals() {
  const qc = useQueryClient()
  const { data: employees = [] } = useQuery({ queryKey: ['users', 'employee'], queryFn: () => listUsers('employee') })
  const { data: cycle } = useQuery({ queryKey: ['active-cycle'], queryFn: getActiveCycle })
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [form, setForm] = useState({
    thrust_area: THRUST_AREAS[0],
    title: '',
    description: '',
    uom_type: 'min' as any,
    target: '',
    default_weightage: '10',
  })

  const push = useMutation({
    mutationFn: () => pushSharedGoal({
      ...form,
      target: Number(form.target),
      default_weightage: Number(form.default_weightage),
      employee_ids: selectedEmployees,
      cycle_id: cycle?.id,
    }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['team-goals'] })
      toast.success(`Shared goal pushed to ${data.length} employee(s)!`)
      setSelectedEmployees([])
      setForm({ thrust_area: THRUST_AREAS[0], title: '', description: '', uom_type: 'min', target: '', default_weightage: '10' })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Push failed'),
  })

  const toggleEmployee = (id: string) => {
    setSelectedEmployees(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  const selectAll = () => setSelectedEmployees(employees.map((e: any) => e.id))
  const clearAll = () => setSelectedEmployees([])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 26, marginBottom: 4 }}>Push Shared Goals</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Push a departmental KPI to multiple employees. Title and target are read-only for recipients — only weightage can be adjusted.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        {/* Goal form */}
        <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Shared Goal Definition</h3>

          <div>
            <label className="form-label">Thrust Area</label>
            <select className="form-select" value={form.thrust_area} onChange={e => setForm(f => ({ ...f, thrust_area: e.target.value }))}>
              {THRUST_AREAS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="form-label">Goal Title <span style={{ color: '#f43f5e', fontWeight: 400, textTransform: 'none' }}>— Read-only for recipients</span></label>
            <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Zero Safety Incidents — FY2026" required />
          </div>

          <div>
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Context, scope, success criteria..." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Unit of Measurement</label>
              <select className="form-select" value={form.uom_type} onChange={e => setForm(f => ({ ...f, uom_type: e.target.value }))}>
                {UOM_TYPES.map(t => <option key={t} value={t}>{getUoMLabel(t)}</option>)}
              </select>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{getUoMDescription(form.uom_type)}</div>
            </div>
            <div>
              <label className="form-label">Target <span style={{ color: '#f43f5e', fontWeight: 400, textTransform: 'none' }}>— Read-only for recipients</span></label>
              <input className="form-input" type={form.uom_type === 'timeline' ? 'date' : 'number'} value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} disabled={form.uom_type === 'zero'} placeholder={form.uom_type === 'zero' ? '0 (auto)' : 'Enter target'} step="any" />
            </div>
          </div>

          <div>
            <label className="form-label">Default Weightage (%) <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>— Employees can adjust this</span></label>
            <input className="form-input" type="number" value={form.default_weightage} onChange={e => setForm(f => ({ ...f, default_weightage: e.target.value }))} min={10} max={100} step={5} />
          </div>

          <button
            className="btn-primary"
            onClick={() => push.mutate()}
            disabled={push.isPending || selectedEmployees.length === 0 || !form.title}
            style={{ justifyContent: 'center', padding: '12px' }}
          >
            {push.isPending ? <span className="spinner" /> : <Send size={16} />}
            Push to {selectedEmployees.length} Employee{selectedEmployees.length !== 1 ? 's' : ''}
          </button>
        </div>

        {/* Employee selector */}
        <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>
              <Users size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Select Recipients
            </h3>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn-secondary btn-xs" onClick={selectAll}>All</button>
              <button className="btn-secondary btn-xs" onClick={clearAll}>Clear</button>
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {selectedEmployees.length} of {employees.length} selected
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', maxHeight: 400 }}>
            {employees.map((emp: any) => {
              const selected = selectedEmployees.includes(emp.id)
              return (
                <div
                  key={emp.id}
                  onClick={() => toggleEmployee(emp.id)}
                  style={{
                    padding: '10px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    background: selected ? 'rgba(99,102,241,0.12)' : 'var(--bg-elevated)',
                    border: `1px solid ${selected ? 'rgba(99,102,241,0.3)' : 'var(--border-subtle)'}`,
                    display: 'flex', alignItems: 'center', gap: 10,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: selected ? 'linear-gradient(135deg, #6366f1, #06b6d4)' : 'var(--bg-hover)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0,
                  }}>
                    {selected ? <Check size={14} /> : emp.name[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{emp.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.department}</div>
                  </div>
                </div>
              )
            })}
            {employees.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>No employees found</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
