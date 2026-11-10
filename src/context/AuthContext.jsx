import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount: verify any stored token against the server
  useEffect(() => {
    const storedToken = localStorage.getItem('admin_token')
    if (!storedToken) {
      setLoading(false)
      return
    }

    api.get('/api/me')
      .then((res) => {
        const u = res.data?.data?.user || res.data?.user || res.data?.data
        if (!u) throw new Error('No user in response')
        if (u.role !== 'admin') throw new Error('Not an admin')
        setUser(u)
        setToken(storedToken)
      })
      .catch(() => {
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_user')
        setUser(null)
        setToken(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback((userData, authToken) => {
    localStorage.setItem('admin_token', authToken)
    localStorage.setItem('admin_user', JSON.stringify(userData))
    setToken(authToken)
    setUser(userData)
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/api/logout')
    } catch (_) {
      // ignore – clear session regardless
    }
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    setUser(null)
    setToken(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
