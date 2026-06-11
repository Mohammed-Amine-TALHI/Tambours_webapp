import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api, { ensureCsrf } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount, hydrate the session by hitting /api/me
  useEffect(() => {
    api.get('/api/me')
      .then(({ data }) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (login, password) => {
    await ensureCsrf()
    const { data } = await api.post('/api/login', { login, password })
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await ensureCsrf()
      await api.post('/api/logout')
    } finally {
      setUser(null)
    }
  }, [])

  const refresh = useCallback(async () => {
    const { data } = await api.get('/api/me')
    setUser(data.user)
    return data.user
  }, [])

  const value = { user, loading, login, logout, refresh, setUser }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
