import { createContext, useContext, useState, type ReactNode } from 'react'
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
  addLog: (params: AddLogParams) => void
  clearLogs: () => void
}

const LogsContext = createContext<LogsContextValue | null>(null)

const STORAGE_KEY = 'nesw_activity_logs'

function generateId() {
  return Math.random().toString(36).slice(2, 10).toUpperCase()
}

function getStored(): ActivityLog[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') }
  catch { return [] }
}

export function LogsProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<ActivityLog[]>(getStored)

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
    const updated = [entry, ...logs].slice(0, 500)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setLogs(updated)
  }

  function clearLogs() {
    localStorage.removeItem(STORAGE_KEY)
    setLogs([])
  }

  return (
    <LogsContext.Provider value={{ logs, addLog, clearLogs }}>
      {children}
    </LogsContext.Provider>
  )
}

export function useLogs() {
  const ctx = useContext(LogsContext)
  if (!ctx) throw new Error('useLogs must be used within LogsProvider')
  return ctx
}
