import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import api from '@/lib/api'
import type { User, LoginResponse } from '@/types'

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (identifier: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  hasPermission: (permission: string) => boolean
  hasFeature: (feature: keyof NonNullable<User['features']>) => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [isLoading, setIsLoading] = useState(true)

  // The token whose user we already hold. Signing in returns the same payload
  // /auth/me does, so without this the app fetches it a second time on every
  // login — a wasted round trip before the dashboard can even start loading.
  const hydratedToken = useRef<string | null>(null)

  const refreshUser = useCallback(async () => {
    if (!token) {
      hydratedToken.current = null
      setIsLoading(false)
      return
    }
    if (hydratedToken.current === token) {
      setIsLoading(false)
      return
    }
    try {
      const { data } = await api.get('/auth/me')
      hydratedToken.current = token
      setUser(data.data)
      localStorage.setItem('user', JSON.stringify(data.data))
    } catch {
      hydratedToken.current = null
      setUser(null)
      setToken(null)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = async (identifier: string, password: string) => {
    // The API accepts a username or an email address in this one field.
    const { data } = await api.post<LoginResponse>('/auth/login', { username: identifier, password })
    const { user: userData, token: newToken } = data.data
    // Already have this token's user from the login response.
    hydratedToken.current = newToken
    setUser(userData)
    setToken(newToken)
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      hydratedToken.current = null
      setUser(null)
      setToken(null)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }

  const hasPermission = (permission: string) => {
    return user?.permissions?.includes(permission) ?? false
  }

  // Feature flags default to enabled when absent so nothing hides unexpectedly.
  const hasFeature = (feature: keyof NonNullable<User['features']>) => {
    return user?.features?.[feature] ?? true
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser, hasPermission, hasFeature }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
