import { createContext, useContext, useState, type ReactNode } from 'react'
import type { AgentBranch } from '@/types/agent'

interface AppContextValue {
  selectedBranch: AgentBranch | 'all'
  setSelectedBranch: (branch: AgentBranch | 'all') => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedBranch, setSelectedBranch] = useState<AgentBranch | 'all'>('all')

  return (
    <AppContext.Provider value={{ selectedBranch, setSelectedBranch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
