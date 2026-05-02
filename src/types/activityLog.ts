export type LogAction = 'created' | 'edited'

export interface FieldChange {
  field: string
  oldValue: string
  newValue: string
}

export interface ActivityLog {
  id: string
  action: LogAction
  propertyId: string
  propertyTitle: string
  agentId: string
  agentName: string
  timestamp: string
  changes: FieldChange[]
}
