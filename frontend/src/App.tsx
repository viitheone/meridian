import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import GoalSheet from './pages/employee/GoalSheet'
import Achievements from './pages/employee/Achievements'
import TeamGoals from './pages/manager/TeamGoals'
import CheckIn from './pages/manager/CheckIn'
import Reports from './pages/Reports'
import CycleManager from './pages/admin/CycleManager'
import SharedGoals from './pages/admin/SharedGoals'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px', borderWidth: 3 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />

      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Layout><Dashboard /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/goals" element={
        <ProtectedRoute roles={['employee', 'admin']}>
          <Layout><GoalSheet /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/achievements" element={
        <ProtectedRoute roles={['employee', 'admin']}>
          <Layout><Achievements /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/team-goals" element={
        <ProtectedRoute roles={['manager', 'admin']}>
          <Layout><TeamGoals /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/check-in" element={
        <ProtectedRoute roles={['manager', 'admin']}>
          <Layout><CheckIn /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute roles={['manager', 'admin']}>
          <Layout><Reports /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/cycles" element={
        <ProtectedRoute roles={['admin']}>
          <Layout><CycleManager /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/shared-goals" element={
        <ProtectedRoute roles={['admin', 'manager']}>
          <Layout><SharedGoals /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/audit" element={
        <ProtectedRoute roles={['admin']}>
          <Layout><Reports /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
                borderRadius: '10px',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#10b981', secondary: 'white' } },
              error: { iconTheme: { primary: '#f43f5e', secondary: 'white' } },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
