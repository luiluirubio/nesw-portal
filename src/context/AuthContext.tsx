import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { AccountInfo } from '@azure/msal-browser'
import { getAccount, loginRedirect, logoutRedirect } from '@/lib/auth'
import { setApiAgent, api } from '@/lib/api'
import type { LoginRecord, LoginMethod } from '@/types/loginHistory'

export interface AuthUser {
  id:         string
  name:       string
  email:      string
  role:       'Admin' | 'Agent'
  branch:     string
  licenseNo:  string
  status:     'active' | 'inactive'
  msAccount?: AccountInfo
}

interface AuthContextValue {
  user:             AuthUser | null
  msAccount:        AccountInfo | null
  isAuthenticated:  boolean
  isLoading:        boolean
  loginMethod:      'sso' | 'password' | null
  login:            () => void                                   // M365 SSO
  loginWithPassword:(email: string, password: string) => Promise<{ error?: string }>
  logout:           () => void
  loginHistory:     LoginRecord[]
  clearHistory:     (agentId?: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const TOKEN_KEY  = 'nesw_token'
const HISTORY_KEY = 'nesw_login_history'
const SESSION_LOGGED = 'nesw_session_logged'

function generateId() { return Math.random().toString(36).slice(2, 10).toUpperCase() }

function getStoredHistory(): LoginRecord[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') } catch { return [] }
}

function parseJwt(token: string): { sub: string; name: string; email: string; role: string } | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload
  } catch { return null }
}

async function recordLogin(agentId: string, agentName: string, method: LoginMethod) {
  if (sessionStorage.getItem(SESSION_LOGGED)) return
  sessionStorage.setItem(SESSION_LOGGED, '1')
  const record: LoginRecord = {
    id: generateId(), agentId, method,
    timestamp:  new Date().toISOString(),
    sessionId:  generateId(),
    ipAddress:  method === 'microsoft_sso' ? 'via Microsoft 365' : 'via Email/Password',
    userAgent:  navigator.userAgent.slice(0, 80),
  }
  const updated = [record, ...getStoredHistory()].slice(0, 200)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))

  const apiBase = import.meta.env.VITE_API_URL
  if (apiBase) {
    const token = localStorage.getItem(TOKEN_KEY)
    fetch(`${apiBase}/api/logs/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : { 'X-Agent-Id': agentId }),
      },
      body: JSON.stringify({ agentId, agentName, method, sessionId: record.sessionId, ipAddress: record.ipAddress, userAgent: record.userAgent }),
    }).catch(() => {})
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]           = useState<AuthUser | null>(null)
  const [msAccount, setMsAccount] = useState<AccountInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loginMethod, setLoginMethod] = useState<'sso' | 'password' | null>(null)
  const [loginHistory, setLoginHistory] = useState<LoginRecord[]>(getStoredHistory)

  // ── Try JWT token first (email/password session) ──────────────────────
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      const payload = parseJwt(token)
      if (payload) {
        const u: AuthUser = {
          id:        payload.sub,
          name:      payload.name,
          email:     payload.email,
          role:      payload.role as 'Admin' | 'Agent',
          branch:    '',
          licenseNo: '',
          status:    'active',
        }
        setUser(u)
        setLoginMethod('password')
        setApiAgent(u.id, u.email)
        // Record session restore as a login (session guard prevents duplicates)
        recordLogin(u.id, u.name, 'manual').then(() => setLoginHistory(getStoredHistory()))
        setIsLoading(false)
        return
      } else {
        localStorage.removeItem(TOKEN_KEY)
      }
    }

    // ── Try MSAL (M365 SSO) ─────────────────────────────────────────────
    getAccount()
      .then(acc => {
        if (acc) {
          const u: AuthUser = {
            id:        acc.localAccountId,
            name:      acc.name ?? acc.username,
            email:     acc.username,
            role:      'Agent',
            branch:    '',
            licenseNo: '',
            status:    'active',
            msAccount: acc,
          }
          setUser(u)
          setMsAccount(acc)
          setLoginMethod('sso')
          setApiAgent(acc.localAccountId, acc.username)
          recordLogin(acc.localAccountId, acc.name ?? acc.username, 'microsoft_sso').then(() =>
            setLoginHistory(getStoredHistory())
          )
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  // ── M365 SSO login ────────────────────────────────────────────────────
  function login() { loginRedirect() }

  // ── Email/password login ──────────────────────────────────────────────
  async function loginWithPassword(email: string, password: string): Promise<{ error?: string }> {
    try {
      const res = await api.login(email, password)
      const { token, user: rawUser } = res
      localStorage.setItem(TOKEN_KEY, token)

      const u: AuthUser = {
        id:        rawUser.id as string,
        name:      rawUser.name as string,
        email:     rawUser.email as string,
        role:      rawUser.role as 'Admin' | 'Agent',
        branch:    rawUser.branch as string ?? '',
        licenseNo: rawUser.licenseNo as string ?? '',
        status:    rawUser.status as 'active' | 'inactive',
      }
      setUser(u)
      setLoginMethod('password')
      setApiAgent(u.id, u.email)
      recordLogin(u.id, u.name, 'manual').then(() => setLoginHistory(getStoredHistory()))
      return {}
    } catch (err) {
      return { error: (err as Error).message }
    }
  }

  // ── Logout ─────────────────────────────────────────────────────────────
  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(SESSION_LOGGED)
    setUser(null)
    setMsAccount(null)
    setLoginMethod(null)
    if (msAccount) logoutRedirect()
    else window.location.href = '/login'
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
      user, msAccount, isAuthenticated: !!user,
      isLoading, loginMethod,
      login, loginWithPassword, logout,
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
  if (user.role === 'Admin') return new Set(['all'])
  return new Set(['listings'])
}
