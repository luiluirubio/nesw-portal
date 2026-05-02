import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { agents } from '@/data/agents'
import type { Agent } from '@/types/agent'
import type { LoginRecord, LoginMethod } from '@/types/loginHistory'

export type AuthUser = Agent

interface AuthContextValue {
  user: AuthUser | null
  login: (agentId: string, method?: LoginMethod) => void
  logout: () => void
  isAuthenticated: boolean
  loginHistory: LoginRecord[]
  clearHistory: (agentId?: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const USER_KEY    = 'nesw_user_id'
const HISTORY_KEY = 'nesw_login_history'
const SESSION_KEY = 'nesw_session_id'

function generateId() {
  return Math.random().toString(36).slice(2, 10).toUpperCase()
}

function getStoredHistory(): LoginRecord[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
  } catch {
    return []
  }
}

function appendHistory(record: LoginRecord) {
  const existing = getStoredHistory()
  // keep last 200 records
  const updated = [record, ...existing].slice(0, 200)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem(USER_KEY)
    return saved ? (agents.find(a => a.id === saved) ?? null) : null
  })

  const [loginHistory, setLoginHistory] = useState<LoginRecord[]>(getStoredHistory)

  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, user.id)
    else localStorage.removeItem(USER_KEY)
  }, [user])

  function login(agentId: string, method: LoginMethod = 'manual') {
    const agent = agents.find(a => a.id === agentId)
    if (!agent) return

    const sessionId = generateId()
    localStorage.setItem(SESSION_KEY, sessionId)

    const record: LoginRecord = {
      id:         generateId(),
      agentId:    agent.id,
      timestamp:  new Date().toISOString(),
      method,
      sessionId,
      // simulated values since we have no real network info
      ipAddress:  '192.168.1.' + Math.floor(Math.random() * 254 + 1),
      userAgent:  navigator.userAgent.slice(0, 80),
    }

    appendHistory(record)
    setLoginHistory(getStoredHistory())
    setUser(agent)
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }

  function clearHistory(agentId?: string) {
    const updated = agentId
      ? getStoredHistory().filter(r => r.agentId !== agentId)
      : []
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
    setLoginHistory(updated)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loginHistory, clearHistory }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function getNavPermissions(user: AuthUser | null): Set<string> {
  if (!user) return new Set()
  if (user.role === 'Super Admin')    return new Set(['all'])
  if (user.role === 'Branch Manager') return new Set(['all'])
  return new Set(['listings'])
}
