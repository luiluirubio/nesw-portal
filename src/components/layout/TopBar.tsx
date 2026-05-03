import { Bell, Sun, Moon, Menu } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useSidebar } from '@/context/SidebarContext'

function MicrosoftLogo({ size = 13 }: { size?: number }) {
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
  'Admin': 'bg-amber-100 text-amber-700',
  'Agent': 'bg-blue-100 text-blue-700',
}

export function TopBar() {
  const { user } = useAuth()
  const { theme, toggle } = useTheme()
  const { openMobile } = useSidebar()

  let lastMethod: 'microsoft_sso' | 'manual' | null = null
  try {
    const history = JSON.parse(localStorage.getItem('nesw_login_history') ?? '[]')
    const mine = history.find((r: { agentId: string; method: string }) => r.agentId === user?.id)
    if (mine) lastMethod = mine.method
  } catch { /* ignore */ }

  return (
    <header className="h-14 md:h-16 flex items-center justify-between px-4 md:px-6 gap-3 border-b shrink-0"
      style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>

      {/* Hamburger — mobile only */}
      <button
        onClick={openMobile}
        aria-label="Open navigation"
        className="md:hidden p-2 -ml-1 rounded-[var(--radius-sm)] transition-colors"
        style={{ color: 'var(--foreground)' }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
        <Menu size={20} />
      </button>

      {/* Brand title — desktop only (sidebar shows it on mobile) */}
      <div className="hidden md:flex items-center gap-2" style={{ color: 'var(--muted-foreground)' }}>
        <span className="text-xs">NESW Realty Portal</span>
      </div>

      {/* Mobile: app name centered */}
      <p className="md:hidden text-sm font-bold flex-1 text-center" style={{ color: 'var(--foreground)' }}>
        NESW Realty
      </p>

      <div className="flex items-center gap-1.5 md:gap-2 ml-auto md:ml-0">
        {/* User badge — desktop only */}
        {user && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-sm)] border"
            style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--border)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ backgroundColor: user.role === 'Admin' ? 'var(--gold)' : 'var(--primary)' }}>
              {user.name.split(' ').slice(0, 2).map(n => n[0]).join('')}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-tight truncate max-w-32" style={{ color: 'var(--foreground)' }}>
                {user.name.split(' ').slice(0, 2).join(' ')}
              </p>
              <p className="text-xs leading-tight" style={{ color: 'var(--muted-foreground)' }}>{user.role}</p>
            </div>
            {lastMethod === 'microsoft_sso' && (
              <span className="ml-1 flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 shrink-0">
                <MicrosoftLogo />SSO
              </span>
            )}
            {lastMethod === 'manual' && (
              <span className={`ml-1 px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${roleBadgeColors[user.role] ?? 'bg-slate-100 text-slate-600'}`}>
                {user.role === 'Admin' ? '⭐ Admin' : user.role}
              </span>
            )}
          </div>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggle}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-sm)] border text-xs font-medium transition-all"
          style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
          {theme === 'light'
            ? <><Moon size={14} style={{ color: 'var(--primary)' }} /><span className="hidden sm:inline">Dark</span></>
            : <><Sun  size={14} style={{ color: 'var(--chart-3)' }} /><span className="hidden sm:inline">Light</span></>}
        </button>

        <button className="relative p-2 rounded-[var(--radius-sm)] transition-colors"
          style={{ color: 'var(--muted-foreground)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
          <Bell size={18} />
        </button>
      </div>
    </header>
  )
}
