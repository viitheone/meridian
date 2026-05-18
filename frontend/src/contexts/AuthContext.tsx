import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { getMe, demoLogin } from '../lib/api'

interface User {
  id: string
  name: string
  email: string
  role: 'employee' | 'manager' | 'admin'
  department: string
  manager_id?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isEmployee: boolean
  isManager: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userId = localStorage.getItem('meridian_user_id')
    if (userId) {
      getMe()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('meridian_user_id')
          localStorage.removeItem('meridian_token')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const data = await demoLogin(email, password)
    localStorage.setItem('meridian_user_id', data.user_id)
    localStorage.setItem('meridian_token', data.token)
    setUser(data.user)
  }

  const logout = () => {
    localStorage.removeItem('meridian_user_id')
    localStorage.removeItem('meridian_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isEmployee: user?.role === 'employee',
      isManager: user?.role === 'manager',
      isAdmin: user?.role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
