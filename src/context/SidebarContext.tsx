import { createContext, useContext, useState, type ReactNode } from 'react'

interface SidebarContextValue {
  collapsed:   boolean
  toggle:      () => void
  mobileOpen:  boolean
  openMobile:  () => void
  closeMobile: () => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem('nesw_sidebar_collapsed') === 'true'
  )
  const [mobileOpen, setMobileOpen] = useState(false)

  function toggle() {
    setCollapsed(c => {
      localStorage.setItem('nesw_sidebar_collapsed', String(!c))
      return !c
    })
  }

  return (
    <SidebarContext.Provider value={{
      collapsed,
      toggle,
      mobileOpen,
      openMobile:  () => setMobileOpen(true),
      closeMobile: () => setMobileOpen(false),
    }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
  return ctx
}
