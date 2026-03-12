import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { api } from '../services/api'
import { connectSocket, disconnectSocket } from '../services/socket'

interface Profile {
  id: string
  email: string
  display_name: string
  avatar_url: string | null
  pix_key: string | null
}

interface Session {
  access_token: string
  refresh_token: string
}

interface AuthContextType {
  user: Profile | null
  session: Session | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const saveSession = useCallback((sess: Session) => {
    localStorage.setItem('session', JSON.stringify(sess))
    setSession(sess)
    connectSocket(sess.access_token)
  }, [])

  const clearSession = useCallback(() => {
    localStorage.removeItem('session')
    setSession(null)
    setUser(null)
    disconnectSocket()
  }, [])

  // Restore session on mount
  useEffect(() => {
    const restore = async () => {
      const raw = localStorage.getItem('session')
      if (!raw) {
        setLoading(false)
        return
      }

      try {
        const sess: Session = JSON.parse(raw)
        setSession(sess)
        connectSocket(sess.access_token)

        const { data } = await api<{ data: Profile }>('/auth/me')
        setUser(data)
      } catch {
        clearSession()
      } finally {
        setLoading(false)
      }
    }

    restore()
  }, [clearSession])

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api<{ data: { session: Session; user: any } }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    })

    saveSession(data.session)

    const { data: profile } = await api<{ data: Profile }>('/auth/me')
    setUser(profile)
  }, [saveSession])

  const signup = useCallback(async (email: string, password: string, displayName: string) => {
    const { data } = await api<{ data: { session: Session; user: any } }>('/auth/signup', {
      method: 'POST',
      body: { email, password, display_name: displayName },
    })

    saveSession(data.session)

    const { data: profile } = await api<{ data: Profile }>('/auth/me')
    setUser(profile)
  }, [saveSession])

  const logout = useCallback(() => {
    api('/auth/logout', { method: 'POST' }).catch(() => {})
    clearSession()
  }, [clearSession])

  return (
    <AuthContext.Provider value={{ user, session, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
