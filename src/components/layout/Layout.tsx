import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useAuth } from '@/context/AuthContext'
import { useSidebar } from '@/context/SidebarContext'
import { cn } from '@/lib/utils'

export function Layout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const { collapsed, mobileOpen, closeMobile } = useSidebar()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Loading…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--background)' }}>
      {/* Mobile backdrop — only visible when sidebar drawer is open */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={closeMobile}
        />
      )}

      <Sidebar />

      {/* Main content — on mobile fills full width; on desktop offsets for sidebar */}
      <div className={cn(
        'flex-1 flex flex-col min-w-0 transition-all duration-300',
        collapsed ? 'md:ml-16' : 'md:ml-64',
      )}>
        <TopBar />
        <main className="flex-1 overflow-auto p-4 md:p-6" style={{ backgroundColor: 'var(--card)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
