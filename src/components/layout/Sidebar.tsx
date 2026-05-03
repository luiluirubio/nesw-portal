import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Building2, Users, PanelLeftClose, LogOut, Settings, Home, ScrollText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useSidebar } from '@/context/SidebarContext'


function NavItem({
  to, icon: Icon, label, collapsed, end,
}: {
  to: string; icon: typeof LayoutDashboard; label: string; collapsed: boolean; end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) => cn(
        'flex items-center rounded-[var(--radius-sm)] text-sm font-medium transition-all',
        collapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-3 px-3 py-2.5',
        isActive ? 'font-semibold' : ''
      )}
      style={({ isActive }) => ({
        backgroundColor: isActive ? 'var(--primary)' : undefined,
        color: isActive ? 'var(--primary-foreground)' : 'var(--sidebar-foreground)',
      })}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        if (!el.style.backgroundColor) el.style.backgroundColor = 'var(--accent)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLAnchorElement
        if (el.getAttribute('aria-current') !== 'page') el.style.backgroundColor = ''
      }}>
      <Icon size={collapsed ? 18 : 15} />
      {!collapsed && label}
    </NavLink>
  )
}

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="my-1 border-t mx-2" style={{ borderColor: 'var(--sidebar-border)' }} />
  return (
    <p className="px-3 py-1.5 text-xs font-bold tracking-widest" style={{ color: 'var(--muted-foreground)' }}>
      {label}
    </p>
  )
}

export function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { collapsed, toggle } = useSidebar()
  const isAdmin = user?.role === 'Admin'

  function handleLogout() { logout(); navigate('/login') }

  const w = collapsed ? 'w-16' : 'w-64'

  return (
    <aside
      className={cn('fixed inset-y-0 left-0 z-50 flex flex-col border-r transition-all duration-300', w)}
      style={{ backgroundColor: 'var(--sidebar)', borderColor: 'var(--sidebar-border)' }}>

      {/* Header */}
      <div className={cn('flex items-center border-b shrink-0 h-16', collapsed ? 'justify-center px-0' : 'px-4 gap-2')}
        style={{ borderColor: 'var(--sidebar-border)' }}>
        {collapsed ? (
          <button onClick={toggle} title="Expand sidebar"
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:opacity-80 transition-opacity shrink-0"
            style={{ backgroundColor: 'var(--primary)' }}>
            <Home size={16} className="text-white" />
          </button>
        ) : (
          <>
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'var(--primary)' }}>
                <Home size={16} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black leading-tight truncate" style={{ color: 'var(--foreground)' }}>NESW Realty</p>
                <p className="text-xs leading-tight" style={{ color: 'var(--muted-foreground)' }}>Property Portal</p>
              </div>
            </div>
            <button onClick={toggle} title="Collapse sidebar"
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors"
              style={{ color: 'var(--muted-foreground)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
              <PanelLeftClose size={15} />
            </button>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className={cn('flex-1 overflow-y-auto py-3', collapsed ? 'px-2 space-y-1' : 'px-3 space-y-0.5')}>

        {/* Listings */}
        <SectionLabel label="LISTINGS" collapsed={collapsed} />
        <NavItem to="/listings" icon={Building2} label="All Listings" collapsed={collapsed} end />

        {/* Admin */}
        {isAdmin && (
          <>
            <SectionLabel label="ADMIN" collapsed={collapsed} />
            <NavItem to="/users" icon={Users}       label="Users" collapsed={collapsed} end />
            <NavItem to="/logs"  icon={ScrollText}  label="Logs"  collapsed={collapsed} end />
          </>
        )}
      </nav>

      {/* Footer */}
      <div className={cn('border-t shrink-0', collapsed ? 'px-2 py-2 space-y-1' : 'px-3 py-3 space-y-1')}
        style={{ borderColor: 'var(--sidebar-border)' }}>

        {!collapsed && (
          <button className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] text-sm font-medium w-full transition-colors"
            style={{ color: 'var(--muted-foreground)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
            <Settings size={15} />Settings
          </button>
        )}

        {user && (
          collapsed ? (
            <button onClick={handleLogout} title={`Logout ${user.name}`}
              className="flex items-center justify-center w-10 h-10 mx-auto rounded-full transition-opacity hover:opacity-80">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--primary)' }}>
                {user.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)]"
              style={{ backgroundColor: 'var(--accent)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
                style={{ backgroundColor: user.role === 'Admin' ? 'var(--gold)' : 'var(--primary)' }}>
                {user.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--sidebar-foreground)' }}>
                  {user.name.split(' ').slice(0, 2).join(' ')}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>{user.role} · {user.branch}</p>
              </div>
              <button onClick={handleLogout} title="Logout"
                className="p-1 rounded transition-colors shrink-0"
                style={{ color: 'var(--muted-foreground)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--foreground)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted-foreground)')}>
                <LogOut size={14} />
              </button>
            </div>
          )
        )}
      </div>
    </aside>
  )
}
