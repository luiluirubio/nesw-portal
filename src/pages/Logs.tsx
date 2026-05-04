import { useState } from 'react'
import { ChevronDown, Search, X, Trash2, ScrollText, Plus, Pencil, RefreshCw } from 'lucide-react'
import { useLogs } from '@/context/LogsContext'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import type { ActivityLog, LogAction } from '@/types/activityLog'
import { Navigate } from 'react-router-dom'

function timeAgo(iso: string) {
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (mins  < 1)  return 'just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function formatTs(iso: string) {
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function ActionBadge({ action }: { action: LogAction }) {
  if (action === 'created') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
        <Plus size={11} />Created
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
      <Pencil size={11} />Edited
    </span>
  )
}

function LogRow({ log }: { log: ActivityLog }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <tr
        className="border-b cursor-pointer transition-colors"
        style={{ borderColor: 'var(--border)' }}
        onClick={() => log.changes.length > 0 && setExpanded(e => !e)}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>

        {/* Expand */}
        <td className="px-3 py-3 w-8">
          {log.changes.length > 0
            ? <ChevronDown size={14} className={cn('transition-transform', expanded ? 'rotate-0' : '-rotate-90')}
                style={{ color: 'var(--muted-foreground)' }} />
            : <span className="w-4 inline-block" />}
        </td>

        {/* Timestamp */}
        <td className="px-4 py-3 whitespace-nowrap">
          <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{formatTs(log.timestamp)}</p>
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{timeAgo(log.timestamp)}</p>
        </td>

        {/* Action */}
        <td className="px-4 py-3 whitespace-nowrap">
          <ActionBadge action={log.action} />
        </td>

        {/* Property */}
        <td className="px-4 py-3">
          <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{log.propertyTitle}</p>
          <p className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>{log.propertyId}</p>
        </td>

        {/* Agent */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ backgroundColor: 'var(--primary)' }}>
              {log.agentName.split(' ').slice(0, 2).map(n => n[0]).join('')}
            </div>
            <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
              {log.agentName.split(' ').slice(0, 2).join(' ')}
            </span>
          </div>
        </td>

        {/* Changes count */}
        <td className="px-4 py-3">
          {log.changes.length > 0 ? (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black"
              style={{ backgroundColor: log.action === 'created' ? '#D1FAE5' : '#DBEAFE', color: log.action === 'created' ? '#065F46' : '#1E40AF' }}>
              {log.changes.length}
            </span>
          ) : (
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>—</span>
          )}
        </td>
      </tr>

      {/* Expanded changes */}
      {expanded && log.changes.length > 0 && (
        <tr style={{ borderColor: 'var(--border)' }} className="border-b">
          <td />
          <td colSpan={5} className="px-4 pb-3 pt-0">
            <div className="rounded-[var(--radius-sm)] border overflow-hidden"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                    {['Field', 'Old Value', 'New Value'].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-bold uppercase tracking-wide"
                        style={{ color: 'var(--muted-foreground)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {log.changes.map((c, i) => (
                    <tr key={i} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-3 py-2 font-semibold w-40" style={{ color: 'var(--foreground)' }}>{c.field}</td>
                      <td className="px-3 py-2 max-w-48">
                        <span className="px-1.5 py-0.5 rounded text-xs line-through"
                          style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                          {c.oldValue || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 max-w-48">
                        <span className="px-1.5 py-0.5 rounded text-xs font-semibold"
                          style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
                          {c.newValue || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
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
export function Logs() {
  const { user } = useAuth()
  const { logs, loading, clearLogs, refresh } = useLogs()
  const isAdmin = user?.role === 'Admin'
  if (!isAdmin) return <Navigate to="/listings" replace />

  const [search, setSearch]           = useState('')
  const [filterAction, setFilterAction] = useState<LogAction | 'all'>('all')
  const [filterAgent, setFilterAgent]   = useState('all')

  const filtered = logs.filter(l => {
    if (filterAction !== 'all' && l.action !== filterAction) return false
    if (filterAgent  !== 'all' && l.agentName !== filterAgent) return false
    const q = search.toLowerCase()
    if (q && !l.propertyTitle.toLowerCase().includes(q) && !l.propertyId.toLowerCase().includes(q) && !l.agentName.toLowerCase().includes(q)) return false
    return true
  })

  const createdCount = logs.filter(l => l.action === 'created').length
  const editedCount  = logs.filter(l => l.action === 'edited').length

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Activity Logs</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            Full audit trail of property creations and edits
          </p>
        </div>
        <button onClick={refresh} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold border transition-all disabled:opacity-50"
          style={{ borderColor: 'var(--border)', color: 'var(--foreground)', backgroundColor: 'var(--accent)' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Events',     value: logs.length,    icon: ScrollText, color: 'var(--primary)', bg: 'bg-emerald-50' },
          { label: 'New Listings',     value: createdCount,   icon: Plus,       color: '#10b981',         bg: 'bg-emerald-50' },
          { label: 'Listing Edits',    value: editedCount,    icon: Pencil,     color: '#3b82f6',         bg: 'bg-blue-50'    },
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

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search property or agent..."
            className="pl-8 pr-8 py-2 text-sm rounded-[var(--radius-sm)] focus:outline-none w-56"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }} />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X size={13} style={{ color: 'var(--muted-foreground)' }} />
            </button>
          )}
        </div>

        <div className="relative">
          <select value={filterAction} onChange={e => setFilterAction(e.target.value as LogAction | 'all')}
            className="appearance-none pl-3 pr-8 py-2 text-sm rounded-[var(--radius-sm)] focus:outline-none cursor-pointer"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)', minWidth: '140px' }}>
            <option value="all">All Actions</option>
            <option value="created">Created</option>
            <option value="edited">Edited</option>
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted-foreground)' }} />
        </div>

        <div className="relative">
          <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-sm rounded-[var(--radius-sm)] focus:outline-none cursor-pointer"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)', minWidth: '160px' }}>
            <option value="all">All Agents</option>
            {Array.from(new Set(logs.map(l => l.agentName).filter(Boolean))).sort().map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted-foreground)' }} />
        </div>

        {(filterAction !== 'all' || filterAgent !== 'all' || search) && (
          <button onClick={() => { setFilterAction('all'); setFilterAgent('all'); setSearch('') }}
            className="px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold flex items-center gap-1.5"
            style={{ border: '1px solid var(--destructive)', color: 'var(--destructive)', backgroundColor: 'transparent' }}>
            <X size={12} />Clear
          </button>
        )}

        {logs.length > 0 && (
          <button onClick={clearLogs}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold border"
            style={{ borderColor: '#ef4444', color: '#ef4444', backgroundColor: 'transparent' }}>
            <Trash2 size={12} />Clear All Logs
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-[var(--radius)] border overflow-hidden"
        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          {loading && logs.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3">
              <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--muted-foreground)' }} />
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Loading logs…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3">
              <ScrollText size={32} style={{ color: 'var(--muted-foreground)' }} />
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>No activity logs yet</p>
                <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                  Logs will appear here when listings are created or edited.
                </p>
              </div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
                  <th className="px-3 py-3 w-8" />
                  {['Timestamp', 'Action', 'Property', 'Agent', 'Changes'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide whitespace-nowrap"
                      style={{ color: 'var(--muted-foreground)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => <LogRow key={log.id} log={log} />)}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {filtered.length > 0 && (
        <p className="text-xs pb-4" style={{ color: 'var(--muted-foreground)' }}>
          Showing {filtered.length} of {logs.length} log entries · Stored locally up to 500 records
        </p>
      )}
    </div>
  )
}
