import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { api } from '@/lib/api'
import type { ActivityLog, FieldChange, LogAction } from '@/types/activityLog'

interface AddLogParams {
  action: LogAction
  propertyId: string
  propertyTitle: string
  agentId: string
  agentName: string
  changes?: FieldChange[]
}

interface LogsContextValue {
  logs: ActivityLog[]
  loading: boolean
  addLog: (params: AddLogParams) => void
  clearLogs: () => void
  refresh: () => void
}

const LogsContext = createContext<LogsContextValue | null>(null)

function generateId() {
  return Math.random().toString(36).slice(2, 10).toUpperCase()
}

export function LogsProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs]       = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getLogs()
      setLogs(data as ActivityLog[])
    } catch {
      // API not reachable — silently leave existing state
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch logs on mount (once the agent ID is set by AuthContext)
  useEffect(() => {
    const t = setTimeout(refresh, 500) // small delay so AuthContext sets agent first
    return () => clearTimeout(t)
  }, [refresh])

  function addLog(params: AddLogParams) {
    const entry: ActivityLog = {
      id:            generateId(),
      action:        params.action,
      propertyId:    params.propertyId,
      propertyTitle: params.propertyTitle,
      agentId:       params.agentId,
      agentName:     params.agentName,
      timestamp:     new Date().toISOString(),
      changes:       params.changes ?? [],
    }

    // Optimistic update — show immediately in the UI
    setLogs(prev => [entry, ...prev].slice(0, 500))

    // Persist to DynamoDB (fire-and-forget)
    api.createLog(entry).catch(() => {
      // If the API call fails, remove the optimistic entry
      setLogs(prev => prev.filter(l => l.id !== entry.id))
    })
  }

  function clearLogs() {
    setLogs([])
    // Note: no backend delete-all endpoint — clear is local-only for now
  }

  return (
    <LogsContext.Provider value={{ logs, loading, addLog, clearLogs, refresh }}>
      {children}
    </LogsContext.Provider>
  )
}

export function useLogs() {
  const ctx = useContext(LogsContext)
  if (!ctx) throw new Error('useLogs must be used within LogsProvider')
  return ctx
}
