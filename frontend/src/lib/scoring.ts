// Score computation — mirrors backend utils/scoring.py

export type UoMType = 'min' | 'max' | 'timeline' | 'zero'

export function computeScore(
  uomType: UoMType,
  target: number,
  achievement: number,
  completionDate?: string | null,
  deadline?: string | null,
): number {
  switch (uomType) {
    case 'min':
      // Higher is better (sales revenue)
      if (target === 0) return achievement >= 0 ? 1.0 : 0.0
      return Math.round((achievement / target) * 10000) / 10000

    case 'max':
      // Lower is better (TAT, cost)
      if (achievement === 0) return 1.0
      if (target === 0) return 0.0
      return Math.round((target / achievement) * 10000) / 10000

    case 'timeline':
      if (!completionDate) return 0.0
      if (!deadline) return 1.0
      const comp = new Date(completionDate)
      const due = new Date(deadline)
      if (comp <= due) return 1.0
      const daysLate = Math.floor((comp.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
      return Math.max(0, 1.0 - daysLate / 30)

    case 'zero':
      return achievement === 0 ? 1.0 : 0.0

    default:
      return 0
  }
}

export function scoreToPercent(score: number): number {
  return Math.min(Math.round(score * 100 * 10) / 10, 150)
}

export function getScoreColor(pct: number): string {
  if (pct >= 100) return '#10b981' // emerald
  if (pct >= 80) return '#f59e0b'  // amber
  if (pct >= 50) return '#06b6d4'  // cyan
  return '#f43f5e'                  // rose
}

export function getUoMLabel(type: UoMType): string {
  const map: Record<UoMType, string> = {
    min: 'Min (↑ Higher is Better)',
    max: 'Max (↓ Lower is Better)',
    timeline: 'Timeline (Date-based)',
    zero: 'Zero-based (0 = 100%)',
  }
  return map[type] || type
}

export function getUoMDescription(type: UoMType): string {
  const map: Record<UoMType, string> = {
    min: 'e.g., Sales Revenue, Units Sold',
    max: 'e.g., TAT, Cost, Defect Rate',
    timeline: 'e.g., Project Delivery, Migration',
    zero: 'e.g., Safety Incidents, Critical Defects',
  }
  return map[type] || ''
}
