import { useState } from 'react'
import { Search, X, ChevronDown, Eye, Phone, Mail, Users } from 'lucide-react'
import { clients } from '@/data/clients'
import { getAgent } from '@/data/agents'
import { getProperty } from '@/data/properties'
import { useAuth } from '@/context/AuthContext'
import { formatPHP, cn } from '@/lib/utils'
import type { Client, ClientStatus } from '@/types/client'

const statusConfig: Record<ClientStatus, { label: string; bg: string; text: string }> = {
  active:   { label: 'Active',   bg: 'bg-emerald-50', text: 'text-emerald-700' },
  inactive: { label: 'Inactive', bg: 'bg-amber-50',   text: 'text-amber-700'   },
  closed:   { label: 'Closed',   bg: 'bg-slate-100',  text: 'text-slate-500'   },
}

const budgetLabels: Record<string, string> = {
  below_2m: 'Below ₱2M',
  '2m_5m':  '₱2M – ₱5M',
  '5m_10m': '₱5M – ₱10M',
  '10m_20m':'₱10M – ₱20M',
  above_20m:'Above ₱20M',
}

const typeLabels: Record<string, string> = {
  house_and_lot: 'House & Lot',
  condo:         'Condo',
  lot_only:      'Lot Only',
  commercial:    'Commercial',
  townhouse:     'Townhouse',
  warehouse:     'Warehouse',
  farm_lot:      'Farm Lot',
}

// ── Detail Panel ─────────────────────────────────────────────────────────────
function ClientDetailPanel({ client: c, onClose }: { client: Client; onClose: () => void }) {
  const agent = getAgent(c.agentId)

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        style={{ animation: 'fadeIn 0.2s ease' }} onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-[480px] flex flex-col shadow-2xl"
        style={{ backgroundColor: 'var(--background)', animation: 'slideInRight 0.25s cubic-bezier(0.32,0.72,0,1)' }}>

        {/* Header */}
        <div className="relative px-6 pt-5 pb-4 overflow-hidden shrink-0" style={{ backgroundColor: 'var(--primary)' }}>
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full opacity-10 bg-white" />
          <button onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
            <X size={13} className="text-white" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black text-white"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              {c.name.split(' ').slice(0, 2).map(n => n[0]).join('')}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{c.name}</h2>
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-bold', statusConfig[c.status].bg, statusConfig[c.status].text)}>
                {statusConfig[c.status].label}
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-4 overflow-y-auto space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted-foreground)' }}>Contact</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                <Phone size={13} style={{ color: 'var(--primary)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{c.phone}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                <Mail size={13} style={{ color: 'var(--primary)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{c.email}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted-foreground)' }}>Preferences</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Budget',         value: formatPHP(c.budget) },
                { label: 'Budget Range',   value: budgetLabels[c.budgetRange] },
                { label: 'Property Type',  value: typeLabels[c.preferredType] ?? c.preferredType },
                { label: 'Preferred City', value: c.preferredCity },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg px-3 py-2 border"
                  style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                  <p className="text-xs mb-0.5" style={{ color: 'var(--muted-foreground)' }}>{label}</p>
                  <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted-foreground)' }}>Inquired Properties</p>
            <div className="space-y-1.5">
              {c.inquiredProperties.map(pid => {
                const prop = getProperty(pid)
                if (!prop) return null
                return (
                  <div key={pid} className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                    style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--border)' }}>
                    <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>{pid}</span>
                    <span className="text-xs font-medium flex-1 truncate" style={{ color: 'var(--foreground)' }}>{prop.title}</span>
                    <span className="text-xs font-bold" style={{ color: 'var(--primary)' }}>{formatPHP(prop.price)}</span>
                  </div>
                )
              })}
              {c.inquiredProperties.length === 0 && (
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>No properties inquired yet.</p>
              )}
            </div>
          </div>

          {c.notes && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted-foreground)' }}>Notes</p>
              <p className="text-xs leading-relaxed px-3 py-2 rounded-lg border"
                style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>{c.notes}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted-foreground)' }}>Assigned Agent</p>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--primary)' }}>
                {agent?.name.split(' ').slice(0, 2).map(n => n[0]).join('')}
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{agent?.name}</p>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{agent?.role} · {agent?.branch}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Added: {c.dateAdded}</p>
          </div>
        </div>

        <div className="px-6 py-3 border-t flex gap-2 shrink-0"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
          <button className="flex-1 py-2 rounded-[var(--radius-sm)] text-sm font-bold text-white hover:opacity-90 transition-all"
            style={{ backgroundColor: 'var(--primary)' }}>
            Match Properties
          </button>
          <button className="flex-1 py-2 rounded-[var(--radius-sm)] text-sm font-semibold border hover:opacity-80 transition-all"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)', backgroundColor: 'var(--accent)' }}>
            Edit Client
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn       { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideInRight { from { transform: translateX(100%); opacity:.6 } to { transform: translateX(0); opacity:1 } }
      `}</style>
    </>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export function Clients() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'Super Admin' || user?.role === 'Branch Manager'

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<ClientStatus | 'all'>('all')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  const scoped = isAdmin ? clients : clients.filter(c => c.agentId === user?.id)

  const filtered = scoped.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false
    const q = search.toLowerCase()
    if (q && !c.name.toLowerCase().includes(q) && !c.email.toLowerCase().includes(q) && !c.phone.includes(q)) return false
    return true
  })

  const activeCount = scoped.filter(c => c.status === 'active').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Buyers & Clients</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            {filtered.length} shown · {activeCount} active
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] border"
          style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--border)' }}>
          <Users size={15} style={{ color: 'var(--primary)' }} />
          <span className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{activeCount} Active</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, phone..."
            className="pl-8 pr-8 py-2 text-sm rounded-[var(--radius-sm)] focus:outline-none w-56"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }} />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X size={13} style={{ color: 'var(--muted-foreground)' }} />
            </button>
          )}
        </div>

        <div className="relative">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as ClientStatus | 'all')}
            className="appearance-none pl-3 pr-8 py-2 text-sm rounded-[var(--radius-sm)] focus:outline-none cursor-pointer"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)', minWidth: '130px' }}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="closed">Closed</option>
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted-foreground)' }} />
        </div>

        {(filterStatus !== 'all' || search) && (
          <button onClick={() => { setFilterStatus('all'); setSearch('') }}
            className="px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold flex items-center gap-1.5 transition-all"
            style={{ border: '1px solid var(--destructive)', color: 'var(--destructive)', backgroundColor: 'transparent' }}>
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-[var(--radius)] border overflow-hidden"
        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
                {['Client', 'Contact', 'Budget', 'Looking For', 'Agent', 'Inquiries', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide whitespace-nowrap"
                    style={{ color: 'var(--muted-foreground)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const agent = getAgent(c.agentId)
                const sc = statusConfig[c.status]
                return (
                  <tr key={c.id}
                    className="border-b cursor-pointer transition-all"
                    style={{ borderColor: 'var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                    onClick={() => setSelectedClient(c)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ backgroundColor: 'var(--primary)' }}>
                          {c.name.split(' ').slice(0, 2).map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-semibold" style={{ color: 'var(--foreground)' }}>{c.name}</p>
                          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Added {c.dateAdded}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs flex items-center gap-1" style={{ color: 'var(--foreground)' }}>
                        <Phone size={10} />{c.phone}
                      </p>
                      <p className="text-xs flex items-center gap-1 mt-0.5 truncate max-w-36" style={{ color: 'var(--muted-foreground)' }}>
                        <Mail size={10} />{c.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>{formatPHP(c.budget)}</p>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{budgetLabels[c.budgetRange]}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{typeLabels[c.preferredType] ?? c.preferredType}</p>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{c.preferredCity}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{agent?.name.split(' ')[0]}</p>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{agent?.branch}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black"
                        style={{ backgroundColor: 'var(--accent)', color: 'var(--primary)' }}>
                        {c.inquiredProperties.length}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-semibold', sc.bg, sc.text)}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--muted-foreground)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted-foreground)')}>
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
              No clients found.
            </div>
          )}
        </div>
      </div>

      {selectedClient && (
        <ClientDetailPanel client={selectedClient} onClose={() => setSelectedClient(null)} />
      )}
    </div>
  )
}
