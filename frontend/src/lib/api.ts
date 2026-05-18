// API client — all backend calls go through here

import axios from 'axios'

// In production (Railway + Vercel), VITE_API_URL is the full Railway backend URL.
// In local dev it's empty and the Vite proxy (vite.config.ts) forwards /api → localhost:8000.
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

// Inject auth headers from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('meridian_token')
  const userId = localStorage.getItem('meridian_user_id')
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (userId) config.headers['X-User-Id'] = userId
  return config
})

// ── Auth ─────────────────────────────────────────────────────

export const demoLogin = (email: string, password: string) =>
  api.post('/users/demo-login', { email, password }).then(r => r.data)

export const getMe = () =>
  api.get('/users/me').then(r => r.data)

// ── Users ────────────────────────────────────────────────────

export const listUsers = (role?: string) =>
  api.get('/users', { params: { role } }).then(r => r.data)

export const getTeam = () =>
  api.get('/users/team').then(r => r.data)

// ── Cycles ───────────────────────────────────────────────────

export const listCycles = () =>
  api.get('/cycles').then(r => r.data)

export const getActiveCycle = () =>
  api.get('/cycles/active').then(r => r.data)

export const createCycle = (data: any) =>
  api.post('/cycles', data).then(r => r.data)

export const activateCycle = (id: string) =>
  api.put(`/cycles/${id}/activate`).then(r => r.data)

// ── Goals ────────────────────────────────────────────────────

export const getMyGoals = (cycleId?: string) =>
  api.get('/goals/my', { params: { cycle_id: cycleId } }).then(r => r.data)

export const getTeamGoals = (params?: { employee_id?: string; cycle_id?: string; status_filter?: string }) =>
  api.get('/goals/team', { params }).then(r => r.data)

export const createGoal = (data: any) =>
  api.post('/goals', data).then(r => r.data)

export const updateGoal = (id: string, data: any) =>
  api.put(`/goals/${id}`, data).then(r => r.data)

export const deleteGoal = (id: string) =>
  api.delete(`/goals/${id}`)

export const submitGoals = (cycleId?: string) =>
  api.post('/goals/submit', null, { params: { cycle_id: cycleId } }).then(r => r.data)

export const reviewGoal = (id: string, action: { action: string; return_comment?: string; target?: number; weightage?: number }) =>
  api.post(`/goals/${id}/review`, action).then(r => r.data)

export const unlockGoal = (id: string) =>
  api.post(`/goals/${id}/unlock`).then(r => r.data)

export const pushSharedGoal = (data: any) =>
  api.post('/goals/shared', data).then(r => r.data)

export const getGoal = (id: string) =>
  api.get(`/goals/${id}`).then(r => r.data)

// ── Achievements ─────────────────────────────────────────────

export const getGoalAchievements = (goalId: string) =>
  api.get(`/achievements/goal/${goalId}`).then(r => r.data)

export const logAchievement = (goalId: string, data: any) =>
  api.post(`/achievements/goal/${goalId}`, data).then(r => r.data)

export const updateAchievement = (goalId: string, quarter: string, data: any) =>
  api.put(`/achievements/goal/${goalId}/${quarter}`, data).then(r => r.data)

// ── Check-ins ────────────────────────────────────────────────

export const addCheckin = (data: { goal_id: string; quarter: string; comment: string }) =>
  api.post('/checkins', data).then(r => r.data)

export const getGoalCheckins = (goalId: string, quarter?: string) =>
  api.get(`/checkins/goal/${goalId}`, { params: { quarter } }).then(r => r.data)

export const getTeamCheckinSummary = (quarter?: string) =>
  api.get('/checkins/team', { params: { quarter } }).then(r => r.data)

// ── Reports ──────────────────────────────────────────────────

export const getStats = () =>
  api.get('/reports/stats').then(r => r.data)

export const getAchievementReport = (quarter?: string, department?: string) =>
  api.get('/reports/achievement', { params: { quarter, department } }).then(r => r.data)

export const getCompletionDashboard = (quarter?: string) =>
  api.get('/reports/completion', { params: { quarter } }).then(r => r.data)

export const getAuditTrail = (goalId?: string) =>
  api.get('/reports/audit', { params: { goal_id: goalId } }).then(r => r.data)

export const exportCSV = (quarter?: string) => {
  const userId = localStorage.getItem('meridian_user_id')
  const token = localStorage.getItem('meridian_token')
  const params = new URLSearchParams()
  if (quarter) params.set('quarter', quarter)
  const url = `${API_BASE}/reports/export?${params.toString()}`
  const link = document.createElement('a')
  link.href = url
  link.download = `meridian_report_${quarter || 'all'}.csv`
  // Add auth headers via fetch
  fetch(url, { headers: { 'X-User-Id': userId || '', Authorization: `Bearer ${token}` } })
    .then(r => r.blob())
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob)
      link.href = blobUrl
      link.click()
      URL.revokeObjectURL(blobUrl)
    })
}

export default api
