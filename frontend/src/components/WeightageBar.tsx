import React from 'react'
import { getScoreColor } from '../lib/scoring'

interface WeightageBarProps {
  used: number
  total?: number
  showLabel?: boolean
}

export function WeightageBar({ used, total = 100, showLabel = true }: WeightageBarProps) {
  const pct = Math.min((used / total) * 100, 100)
  const remaining = total - used
  const isExact = Math.abs(used - total) < 0.01
  const isOver = used > total

  let barColor = '#6366f1'
  let statusClass = ''
  let statusText = `${remaining.toFixed(0)}% remaining`
  let statusColor = 'var(--text-muted)'

  if (isExact) {
    barColor = '#10b981'
    statusClass = 'weightage-success'
    statusText = '✓ Total = 100% — Ready to submit!'
    statusColor = '#10b981'
  } else if (isOver) {
    barColor = '#f43f5e'
    statusClass = 'weightage-danger'
    statusText = `⚠ Over by ${(used - total).toFixed(0)}% — Reduce weightage`
    statusColor = '#f43f5e'
  } else if (used >= 80) {
    barColor = '#f59e0b'
    statusClass = 'weightage-warning'
  }

  return (
    <div className={`weightage-indicator ${statusClass}`} style={{ flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: isOver ? '#f43f5e' : isExact ? '#10b981' : 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>
            {used.toFixed(0)}%
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>of {total}% used</span>
        </div>
        {showLabel && (
          <span style={{ fontSize: 12, color: statusColor, fontWeight: 600 }}>
            {statusText}
          </span>
        )}
      </div>
      <div className="progress-bar" style={{ width: '100%' }}>
        <div
          className="progress-bar-fill"
          style={{
            width: `${pct}%`,
            background: isExact
              ? 'linear-gradient(90deg, #10b981, #06b6d4)'
              : isOver
              ? '#f43f5e'
              : `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
          }}
        />
      </div>
    </div>
  )
}
