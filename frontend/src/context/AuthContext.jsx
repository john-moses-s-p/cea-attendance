import { createContext, useContext, useState, useCallback } from 'react'
import client from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('cea_user')
    return stored ? JSON.parse(stored) : null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const login = useCallback(async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await client.post('/api/auth/login', { email, password })
      localStorage.setItem('cea_access_token', data.access_token)
      localStorage.setItem('cea_refresh_token', data.refresh_token)
      localStorage.setItem('cea_user', JSON.stringify(data.user))
      setUser(data.user)
      return { success: true, user: data.user }
    } catch (err) {
      const message = err.response?.data?.error || 'Login failed. Please try again.'
      setError(message)
      return { success: false, error: message }
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('cea_access_token')
    localStorage.removeItem('cea_refresh_token')
    localStorage.removeItem('cea_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
