import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { AccountInfo } from '@azure/msal-browser'
import { getAccount, getAccessToken, loginRedirect, logoutRedirect } from '@/lib/auth'
import { agents } from '@/data/agents'
import type { Agent } from '@/types/agent'
import type { LoginRecord, LoginMethod } from '@/types/loginHistory'

export type AuthUser = Agent & { msAccount?: AccountInfo }

interface AuthContextValue {
  user: AuthUser | null
  msAccount: AccountInfo | null
  isAuthenticated: boolean
  isLoading: boolean
  login: () => void
  logout: () => void
  loginHistory: LoginRecord[]
  clearHistory: (agentId?: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const HISTORY_KEY = 'nesw_login_history'
const SESSION_LOGGED = 'nesw_session_logged'

function generateId() {
  return Math.random().toString(36).slice(2, 10).toUpperCase()
}

function getStoredHistory(): LoginRecord[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') } catch { return [] }
}

function agentFromMsAccount(account: AccountInfo): AuthUser {
  const email = account.username?.toLowerCase() ?? ''
  const matched = agents.find(a => a.email.toLowerCase() === email)
  if (matched) return matched

  // fallback: create a transient agent from the MS profile
  return {
    id:          account.localAccountId,
    name:        account.name ?? account.username,
    role:        'Agent',
    branch:      'Headquarters',
    email:       account.username,
    phone:       '',
    licenseNo:   '',
    dateJoined:  new Date().toISOString().slice(0, 10),
    status:      'active',
    msAccount:   account,
  }
}

async function recordLogin(agentId: string, method: LoginMethod) {
  if (sessionStorage.getItem(SESSION_LOGGED)) return
  sessionStorage.setItem(SESSION_LOGGED, '1')

  const record: LoginRecord = {
    id:         generateId(),
    agentId,
    timestamp:  new Date().toISOString(),
    method,
    sessionId:  generateId(),
    ipAddress:  'via Microsoft 365',
    userAgent:  navigator.userAgent.slice(0, 80),
  }
  const updated = [record, ...getStoredHistory()].slice(0, 200)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))

  // also post to backend API (fire-and-forget)
  const apiBase = import.meta.env.VITE_API_URL
  if (apiBase) {
    const token = await getAccessToken()
    fetch(`${apiBase}/api/logs/login`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        agentId,
        method,
        sessionId:  record.sessionId,
        ipAddress:  record.ipAddress,
        userAgent:  record.userAgent,
      }),
    }).catch(() => {})
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]           = useState<AuthUser | null>(null)
  const [msAccount, setMsAccount] = useState<AccountInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loginHistory, setLoginHistory] = useState<LoginRecord[]>(getStoredHistory)

  useEffect(() => {
    getAccount()
      .then(acc => {
        if (acc) {
          const agent = agentFromMsAccount(acc)
          setUser(agent)
          setMsAccount(acc)
          recordLogin(agent.id, 'microsoft_sso').then(() => {
            setLoginHistory(getStoredHistory())
          })
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  function login() { loginRedirect() }

  function logout() {
    sessionStorage.removeItem(SESSION_LOGGED)
    setUser(null)
    setMsAccount(null)
    logoutRedirect()
  }

  function clearHistory(agentId?: string) {
    const updated = agentId
      ? getStoredHistory().filter(r => r.agentId !== agentId)
      : []
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
    setLoginHistory(updated)
  }

  return (
    <AuthContext.Provider value={{
      user, msAccount,
      isAuthenticated: !!user,
      isLoading,
      login, logout,
      loginHistory, clearHistory,
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

export function getNavPermissions(user: AuthUser | null): Set<string> {
  if (!user) return new Set()
  if (user.role === 'Super Admin')    return new Set(['all'])
  if (user.role === 'Branch Manager') return new Set(['all'])
  return new Set(['listings'])
}
