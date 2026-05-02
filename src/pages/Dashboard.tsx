import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Building2, Home, TrendingUp, DollarSign, Users, Clock } from 'lucide-react'
import { properties } from '@/data/properties'
import { agents, getAgent } from '@/data/agents'
import { clients } from '@/data/clients'
import { useAuth } from '@/context/AuthContext'
import { useApp } from '@/context/AppContext'
import { formatPHP, daysSince, cn } from '@/lib/utils'

const statusConfig = {
  available:      { label: 'Available',      bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', color: '#10b981' },
  reserved:       { label: 'Reserved',       bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   color: '#f59e0b' },
  under_contract: { label: 'Under Contract', bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    color: '#3b82f6' },
  sold:           { label: 'Sold',           bg: 'bg-slate-100',  text: 'text-slate-500',   dot: 'bg-slate-400',   color: '#94a3b8' },
  off_market:     { label: 'Off Market',     bg: 'bg-red-50',     text: 'text-red-400',     dot: 'bg-red-300',     color: '#ef4444' },
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

export function Dashboard() {
  const { user } = useAuth()
  const { selectedBranch } = useApp()
  const isAdmin = user?.role === 'Super Admin' || user?.role === 'Branch Manager'

  const scoped = isAdmin
    ? (selectedBranch === 'all' ? properties : properties.filter(p => {
        const agent = getAgent(p.agentId)
        return agent?.branch === selectedBranch
      }))
    : properties.filter(p => p.agentId === user?.id)

  const counts = {
    available:      scoped.filter(p => p.status === 'available').length,
    reserved:       scoped.filter(p => p.status === 'reserved').length,
    under_contract: scoped.filter(p => p.status === 'under_contract').length,
    sold:           scoped.filter(p => p.status === 'sold').length,
  }

  const totalValue = scoped
    .filter(p => p.status !== 'sold' && p.listingType === 'for_sale')
    .reduce((sum, p) => sum + p.price, 0)

  const soldValue = scoped
    .filter(p => p.status === 'sold' && p.listingType === 'for_sale')
    .reduce((sum, p) => sum + p.price, 0)

  const activeClients = isAdmin ? clients.filter(c => c.status === 'active').length : clients.filter(c => c.agentId === user?.id && c.status === 'active').length

  // Chart data: listings by type
  const byType = Object.entries(
    scoped.reduce<Record<string, number>>((acc, p) => {
      acc[p.type] = (acc[p.type] ?? 0) + 1
      return acc
    }, {})
  ).map(([type, count]) => ({ name: typeLabels[type] ?? type, count }))

  // Chart data: status distribution for pie
  const pieData = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({ name: statusConfig[key as keyof typeof statusConfig].label, value, color: statusConfig[key as keyof typeof statusConfig].color }))

  // Recent listings
  const recent = [...scoped]
    .sort((a, b) => new Date(b.dateListed).getTime() - new Date(a.dateListed).getTime())
    .slice(0, 6)

  const kpis = [
    { label: 'Active Listings', value: counts.available + counts.reserved + counts.under_contract, icon: Building2, color: 'var(--primary)', bg: 'bg-blue-50' },
    { label: 'For Sale Value',  value: formatPHP(totalValue), icon: DollarSign, color: '#f59e0b', bg: 'bg-amber-50' },
    { label: 'Sold Value',      value: formatPHP(soldValue),  icon: TrendingUp,  color: '#10b981', bg: 'bg-emerald-50' },
    { label: 'Active Clients',  value: activeClients,         icon: Users,       color: '#8b5cf6', bg: 'bg-violet-50' },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Dashboard</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
          {isAdmin
            ? `${selectedBranch === 'all' ? 'All Branches' : selectedBranch} — ${scoped.length} total listings`
            : `Welcome back, ${user?.name.split(' ')[0]} — ${scoped.length} your listings`}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-[var(--radius)] border p-4"
            style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>{label}</span>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', bg)}>
                <Icon size={15} style={{ color }} />
              </div>
            </div>
            <p className="text-2xl font-black" style={{ color: 'var(--foreground)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {(Object.entries(counts) as [keyof typeof counts, number][]).map(([key, count]) => {
          const cfg = statusConfig[key]
          const pct = scoped.length > 0 ? Math.round((count / scoped.length) * 100) : 0
          return (
            <div key={key} className="rounded-[var(--radius)] border p-4"
              style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', cfg.bg, cfg.text)}>{cfg.label}</span>
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{pct}%</span>
              </div>
              <p className="text-3xl font-black" style={{ color: 'var(--foreground)' }}>{count}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>listings</p>
              <div className="mt-3 w-full rounded-full h-1.5" style={{ backgroundColor: 'var(--muted)' }}>
                <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Listings by Type */}
        <div className="rounded-[var(--radius)] border p-4"
          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
          <p className="text-sm font-bold mb-4" style={{ color: 'var(--foreground)' }}>Listings by Property Type</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byType} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }}
                labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }} />
              <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Pie */}
        <div className="rounded-[var(--radius)] border p-4"
          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
          <p className="text-sm font-bold mb-4" style={{ color: 'var(--foreground)' }}>Listing Status Distribution</p>
          <div className="flex items-center gap-6">
            <PieChart width={160} height={160}>
              <Pie data={pieData} cx={75} cy={75} innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }}
                formatter={(value: number) => [value, 'listings']} />
            </PieChart>
            <div className="space-y-2">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{d.name}</span>
                  <span className="text-xs font-bold ml-auto pl-4" style={{ color: 'var(--foreground)' }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Listings */}
      <div className="rounded-[var(--radius)] border overflow-hidden"
        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
        <div className="px-4 py-3 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
          <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>Recent Listings</p>
          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Last 6 listed</span>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {recent.map(p => {
            const agent = getAgent(p.agentId)
            const sc = statusConfig[p.status]
            const days = daysSince(p.dateListed)
            return (
              <div key={p.id} className="px-4 py-3 flex items-center gap-3 transition-colors"
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'var(--accent)' }}>
                  <Home size={16} style={{ color: 'var(--primary)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{p.title}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>
                    {p.location.city} · {typeLabels[p.type]} · {agent?.name}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                    {p.listingType === 'for_rent' ? `${formatPHP(p.price)}/mo` : formatPHP(p.price)}
                  </p>
                  <div className="flex items-center justify-end gap-1.5 mt-0.5">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', sc.bg, sc.text)}>{sc.label}</span>
                    <span className="text-xs flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                      <Clock size={10} />{days}d
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top Agents Table (admin only) */}
      {isAdmin && (
        <div className="rounded-[var(--radius)] border overflow-hidden"
          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
            <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>Agent Performance</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
                  {['Agent', 'Branch', 'Role', 'Active', 'Sold', 'Under Contract'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wide"
                      style={{ color: 'var(--muted-foreground)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agents.filter(a => a.status === 'active').map(agent => {
                  const agentProps = scoped.filter(p => p.agentId === agent.id)
                  const active = agentProps.filter(p => p.status === 'available' || p.status === 'reserved').length
                  const sold   = agentProps.filter(p => p.status === 'sold').length
                  const uc     = agentProps.filter(p => p.status === 'under_contract').length
                  if (agentProps.length === 0) return null
                  return (
                    <tr key={agent.id} className="border-b transition-colors"
                      style={{ borderColor: 'var(--border)' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                            style={{ backgroundColor: 'var(--primary)' }}>
                            {agent.name.split(' ').slice(0, 2).map(n => n[0]).join('')}
                          </div>
                          <span className="font-medium" style={{ color: 'var(--foreground)' }}>{agent.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>{agent.branch}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>{agent.role}</td>
                      <td className="px-4 py-3 font-bold" style={{ color: '#10b981' }}>{active}</td>
                      <td className="px-4 py-3 font-bold" style={{ color: 'var(--muted-foreground)' }}>{sold}</td>
                      <td className="px-4 py-3 font-bold" style={{ color: '#3b82f6' }}>{uc}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
