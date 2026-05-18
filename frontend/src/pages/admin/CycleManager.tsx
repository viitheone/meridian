import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listCycles, createCycle, activateCycle } from '../../lib/api'
import { Plus, Play, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const PHASES = [
  'Goal Setting', 'Q1 Check-in', 'Q2 Check-in', 'Q3 Check-in', 'Q4 / Annual Review'
]

export default function CycleManager() {
  const qc = useQueryClient()
  const { data: cycles = [], isLoading } = useQuery({ queryKey: ['cycles'], queryFn: listCycles })
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    year: 2026,
    phase: PHASES[0],
    window_open: '',
    window_close: '',
    is_active: false,
  })

  const create = useMutation({
    mutationFn: createCycle,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cycles'] }); toast.success('Cycle created!'); setShowForm(false) },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed'),
  })

  const activate = useMutation({
    mutationFn: activateCycle,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cycles'] }); toast.success('Cycle activated!') },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed'),
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 26, marginBottom: 4 }}>Goal Cycle Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Configure fiscal periods and manage active goal cycles</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> New Cycle
        </button>
      </div>

      {/* BRD Schedule reference */}
      <div className="glass-card" style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>BRD Check-in Schedule</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {[
            { phase: 'Goal Setting', window: 'May 1st', action: 'Create, Submit & Approve' },
            { phase: 'Q1 Check-in', window: 'July', action: 'Progress Update' },
            { phase: 'Q2 Check-in', window: 'October', action: 'Progress Update' },
            { phase: 'Q3 Check-in', window: 'January', action: 'Progress Update' },
            { phase: 'Q4 / Annual', window: 'March/April', action: 'Final Achievement' },
          ].map(({ phase, window: w, action }) => (
            <div key={phase} style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-accent)', marginBottom: 4 }}>{phase}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{w}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{action}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: 18, fontSize: 16 }}>Create New Cycle</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="form-label">Year</label>
              <input type="number" className="form-input" value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))} min={2024} max={2030} />
            </div>
            <div>
              <label className="form-label">Phase</label>
              <select className="form-select" value={form.phase} onChange={e => setForm(f => ({ ...f, phase: e.target.value }))}>
                {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Window Opens</label>
              <input type="date" className="form-input" value={form.window_open} onChange={e => setForm(f => ({ ...f, window_open: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Window Closes</label>
              <input type="date" className="form-input" value={form.window_close} onChange={e => setForm(f => ({ ...f, window_close: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn-primary" onClick={() => create.mutate(form)} disabled={create.isPending}>
              {create.isPending ? <span className="spinner" /> : <Plus size={16} />} Create Cycle
            </button>
          </div>
        </div>
      )}

      {/* Cycles list */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Year</th>
              <th>Phase</th>
              <th>Window Opens</th>
              <th>Window Closes</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {cycles.map((c: any) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>FY{c.year}</td>
                <td>{c.phase}</td>
                <td>{c.window_open}</td>
                <td>{c.window_close}</td>
                <td>
                  {c.is_active
                    ? <span className="badge badge-approved">● Active</span>
                    : <span className="badge badge-not_started">Inactive</span>}
                </td>
                <td>
                  {!c.is_active && (
                    <button className="btn-success btn-xs" onClick={() => activate.mutate(c.id)} disabled={activate.isPending}>
                      <Play size={12} /> Activate
                    </button>
                  )}
                  {c.is_active && <span style={{ fontSize: 12, color: '#10b981' }}>Current</span>}
                </td>
              </tr>
            ))}
            {cycles.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No cycles yet. Create one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
