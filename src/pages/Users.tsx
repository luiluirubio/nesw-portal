import { useState } from 'react'
import { ChevronDown, ChevronRight, Trash2, Search, X, Shield, Clock, Monitor } from 'lucide-react'
import { agents } from '@/data/agents'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import type { LoginRecord } from '@/types/loginHistory'
import { Navigate } from 'react-router-dom'

// Microsoft logo
function MicrosoftLogo({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
      <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
      <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
    </svg>
  )
}

const roleBadgeColors: Record<string, string> = {
  'Super Admin':    'bg-amber-100 text-amber-700',
  'Branch Manager': 'bg-blue-100 text-blue-700',
  'Senior Agent':   'bg-emerald-100 text-emerald-700',
  'Agent':          'bg-violet-100 text-violet-700',
  'Junior Agent':   'bg-slate-100 text-slate-500',
}

function formatTimestamp(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (mins < 1)    return 'just now'
  if (mins < 60)   return `${mins}m ago`
  if (hours < 24)  return `${hours}h ago`
  return `${days}d ago`
}

// ── User Row with expandable login history ────────────────────────────────────
function UserRow({ agent, records, currentUserId, onClearHistory }: {
  agent: typeof agents[0]
  records: LoginRecord[]
  currentUserId: string | undefined
  onClearHistory: (agentId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  const lastLogin  = records[0]
  const isOnline   = currentUserId === agent.id
  const ssoCount   = records.filter(r => r.method === 'microsoft_sso').length
  const manualCount = records.filter(r => r.method === 'manual').length

  return (
    <>
      <tr
        className="border-b cursor-pointer transition-colors"
        style={{ borderColor: 'var(--border)' }}
        onClick={() => setExpanded(e => !e)}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>

        {/* Expand chevron */}
        <td className="px-3 py-3 w-8">
          {records.length > 0
            ? <ChevronDown size={14} className={cn('transition-transform', expanded ? 'rotate-0' : '-rotate-90')}
                style={{ color: 'var(--muted-foreground)' }} />
            : <ChevronRight size={14} style={{ color: 'var(--border)' }} />}
        </td>

        {/* Agent */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: agent.role === 'Super Admin' ? 'var(--gold)' : 'var(--primary)' }}>
                {agent.name.split(' ').slice(0, 2).map(n => n[0]).join('')}
              </div>
              {isOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" title="Currently online" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{agent.name}</p>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{agent.email}</p>
            </div>
          </div>
        </td>

        {/* Role */}
        <td className="px-4 py-3">
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', roleBadgeColors[agent.role] ?? 'bg-slate-100 text-slate-500')}>
            {agent.role}
          </span>
        </td>

        {/* Branch */}
        <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--muted-foreground)' }}>
          {agent.branch}
        </td>

        {/* Session status */}
        <td className="px-4 py-3">
          {isOnline ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              Offline
            </span>
          )}
        </td>

        {/* Last login */}
        <td className="px-4 py-3">
          {lastLogin ? (
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{timeAgo(lastLogin.timestamp)}</p>
              <div className="flex items-center gap-1 mt-0.5">
                {lastLogin.method === 'microsoft_sso'
                  ? <><MicrosoftLogo size={11} /><span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Microsoft SSO</span></>
                  : <><Monitor size={11} style={{ color: 'var(--muted-foreground)' }} /><span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Manual</span></>}
              </div>
            </div>
          ) : (
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Never</span>
          )}
        </td>

        {/* Login count */}
        <td className="px-4 py-3">
          <div className="space-y-0.5">
            <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{records.length}</p>
            <div className="flex items-center gap-2">
              {ssoCount > 0 && (
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  <MicrosoftLogo size={10} />{ssoCount}
                </span>
              )}
              {manualCount > 0 && (
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  <Monitor size={10} />{manualCount}
                </span>
              )}
            </div>
          </div>
        </td>

        {/* Actions */}
        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
          {records.length > 0 && (
            <button
              onClick={() => onClearHistory(agent.id)}
              title="Clear login history"
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--muted-foreground)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted-foreground)')}>
              <Trash2 size={14} />
            </button>
          )}
        </td>
      </tr>

      {/* Expanded history sub-rows */}
      {expanded && records.length > 0 && (
        <tr style={{ borderColor: 'var(--border)' }}>
          <td />
          <td colSpan={7} className="px-4 pb-3 pt-0">
            <div className="rounded-[var(--radius-sm)] border overflow-hidden"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                    {['#', 'Date & Time', 'Method', 'Session ID', 'IP Address', 'User Agent'].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-bold uppercase tracking-wide"
                        style={{ color: 'var(--muted-foreground)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.slice(0, 20).map((r, i) => (
                    <tr key={r.id} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-3 py-2 font-mono" style={{ color: 'var(--muted-foreground)' }}>{i + 1}</td>
                      <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--foreground)' }}>
                        {formatTimestamp(r.timestamp)}
                      </td>
                      <td className="px-3 py-2">
                        {r.method === 'microsoft_sso' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700">
                            <MicrosoftLogo size={10} />Microsoft SSO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-600">
                            <Monitor size={10} />Manual
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono" style={{ color: 'var(--muted-foreground)' }}>{r.sessionId}</td>
                      <td className="px-3 py-2 font-mono" style={{ color: 'var(--muted-foreground)' }}>{r.ipAddress}</td>
                      <td className="px-3 py-2 max-w-48 truncate" style={{ color: 'var(--muted-foreground)' }} title={r.userAgent}>
                        {r.userAgent}
                      </td>
                    </tr>
                  ))}
                  {records.length > 20 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-2 text-center" style={{ color: 'var(--muted-foreground)' }}>
                        +{records.length - 20} more records
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function Users() {
  const { user, loginHistory, clearHistory } = useAuth()
  const [search, setSearch] = useState('')

  const isAdmin = user?.role === 'Super Admin' || user?.role === 'Branch Manager'
  if (!isAdmin) return <Navigate to="/listings" replace />

  const filtered = agents.filter(a => {
    const q = search.toLowerCase()
    return !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.branch.toLowerCase().includes(q)
  })

  const totalLogins = loginHistory.length
  const ssoLogins   = loginHistory.filter(r => r.method === 'microsoft_sso').length
  const activeCount = agents.filter(a => a.id === user?.id).length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Users</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
          Agent accounts, session status, and login history
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Users',    value: agents.length,  icon: Shield,  color: 'var(--primary)', bg: 'bg-emerald-50' },
          { label: 'Total Logins',   value: totalLogins,    icon: Clock,   color: '#3b82f6',         bg: 'bg-blue-50'    },
          { label: 'Microsoft SSO',  value: ssoLogins,      icon: Monitor, color: '#0078d4',         bg: 'bg-blue-50'    },
          { label: 'Manual Logins',  value: totalLogins - ssoLogins, icon: Monitor, color: '#94a3b8', bg: 'bg-slate-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-[var(--radius)] border p-4 flex items-center gap-3"
            style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', bg)}>
              <Icon size={16} style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-black" style={{ color: 'var(--foreground)' }}>{value}</p>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* SSO info banner */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-sm)] border"
        style={{ backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }}>
        <div className="shrink-0">
          <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
            <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
            <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-blue-800">Microsoft 365 Single Sign-On Enabled</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Agents can sign in using their <strong>@nesw.com</strong> Microsoft 365 accounts. Sessions are tracked and visible below.
          </p>
        </div>
        <div className="ml-auto shrink-0">
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-600 text-white">Active</span>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, branch..."
            className="pl-8 pr-8 py-2 text-sm rounded-[var(--radius-sm)] focus:outline-none w-64"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }} />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X size={13} style={{ color: 'var(--muted-foreground)' }} />
            </button>
          )}
        </div>
        {loginHistory.length > 0 && (
          <button
            onClick={() => clearHistory()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold border transition-all"
            style={{ borderColor: '#ef4444', color: '#ef4444', backgroundColor: 'transparent' }}>
            <Trash2 size={12} /> Clear All History
          </button>
        )}
      </div>

      {/* Users Table */}
      <div className="rounded-[var(--radius)] border overflow-hidden"
        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
                <th className="px-3 py-3 w-8" />
                {['Agent', 'Role', 'Branch', 'Session', 'Last Login', 'Total Logins', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide whitespace-nowrap"
                    style={{ color: 'var(--muted-foreground)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(agent => (
                <UserRow
                  key={agent.id}
                  agent={agent}
                  records={loginHistory.filter(r => r.agentId === agent.id)}
                  currentUserId={user?.id}
                  onClearHistory={clearHistory}
                />
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>No users found.</div>
          )}
        </div>
      </div>

      <p className="text-xs pb-4" style={{ color: 'var(--muted-foreground)' }}>
        Login history is stored locally in this browser session. Up to 200 records per agent are retained.
      </p>
    </div>
  )
}
