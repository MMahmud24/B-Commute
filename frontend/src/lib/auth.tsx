import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiFetch } from './api'

export interface User {
  id: number
  first_name: string
  last_name: string
  email: string
  username: string
}

export interface SignupPayload {
  first_name: string
  last_name: string
  email: string
  username: string
  password: string
  confirm_password: string
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  signup: (payload: SignupPayload) => Promise<void>
  login: (identifier: string, password: string) => Promise<void>
  logout: () => void
}

const TOKEN_KEY = 'access_token'
const AuthContext = createContext<AuthContextValue | null>(null)

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // storage unavailable; session just won't persist
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => readToken() !== null)

  // Restore the session from a saved token on first load.
  useEffect(() => {
    const token = readToken()
    if (!token) return
    apiFetch<User>('/auth/me/', { token })
      .then(setUser)
      .catch(() => writeToken(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (identifier: string, password: string) => {
    const data = await apiFetch<{ access: string; user: User }>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    })
    writeToken(data.access)
    setUser(data.user)
  }

  const signup = async (payload: SignupPayload) => {
    await apiFetch('/auth/signup/', { method: 'POST', body: JSON.stringify(payload) })
    await login(payload.username, payload.password)
  }

  const logout = () => {
    writeToken(null)
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, signup, login, logout }}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
