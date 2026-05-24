import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { AccountInfo } from '@azure/msal-browser'
import { getAccount, loginRedirect, logoutRedirect, getIdToken } from '@/lib/auth'
import { api } from '@/lib/api'
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
  login:            () => void
  loginWithPassword:(email: string, password: string) => Promise<{ error?: string }>
  logout:           () => void
  loginHistory:     LoginRecord[]
  clearHistory:     (agentId?: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const TOKEN_KEY    = 'nesw_token'
const HISTORY_KEY  = 'nesw_login_history'
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

  // Fire-and-forget: record login in backend (JWT is already stored at this point)
  api.recordLogin({ agentId, agentName, method, sessionId: record.sessionId, ipAddress: record.ipAddress, userAgent: record.userAgent }).catch(() => {})
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]           = useState<AuthUser | null>(null)
  const [msAccount, setMsAccount] = useState<AccountInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loginMethod, setLoginMethod] = useState<'sso' | 'password' | null>(null)
  const [loginHistory, setLoginHistory] = useState<LoginRecord[]>(getStoredHistory)

  // ── Try JWT token first (email/password or prior SSO session) ────────
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
        recordLogin(u.id, u.name, 'manual').then(() => setLoginHistory(getStoredHistory()))
        setIsLoading(false)
        return
      } else {
        localStorage.removeItem(TOKEN_KEY)
      }
    }

    // ── Try MSAL (M365 SSO) — exchange ID token for backend JWT ─────────
    getAccount()
      .then(async acc => {
        if (!acc) return
        const idToken = await getIdToken()
        if (!idToken) return

        try {
          const { token, user: rawUser } = await api.ssoExchange(idToken)
          localStorage.setItem(TOKEN_KEY, token)

          const u: AuthUser = {
            id:        rawUser.id as string,
            name:      rawUser.name as string,
            email:     rawUser.email as string,
            role:      rawUser.role as 'Admin' | 'Agent',
            branch:    (rawUser.branch as string) ?? '',
            licenseNo: (rawUser.licenseNo as string) ?? '',
            status:    (rawUser.status as 'active' | 'inactive') ?? 'active',
            msAccount: acc,
          }
          setUser(u)
          setMsAccount(acc)
          setLoginMethod('sso')
          recordLogin(u.id, u.name, 'microsoft_sso').then(() => setLoginHistory(getStoredHistory()))
        } catch {
          // SSO exchange failed — user may not exist in the system
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  function login() { loginRedirect() }

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
        branch:    (rawUser.branch as string) ?? '',
        licenseNo: (rawUser.licenseNo as string) ?? '',
        status:    rawUser.status as 'active' | 'inactive',
      }
      setUser(u)
      setLoginMethod('password')
      recordLogin(u.id, u.name, 'manual').then(() => setLoginHistory(getStoredHistory()))
      return {}
    } catch (err) {
      return { error: (err as Error).message }
    }
  }

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
