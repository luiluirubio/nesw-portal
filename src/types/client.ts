export type ClientStatus = 'active' | 'inactive' | 'closed'
export type BudgetRange = 'below_2m' | '2m_5m' | '5m_10m' | '10m_20m' | 'above_20m'

export interface Client {
  id: string
  name: string
  email: string
  phone: string
  budget: number
  budgetRange: BudgetRange
  preferredType: string
  preferredCity: string
  agentId: string
  status: ClientStatus
  dateAdded: string
  notes: string
  inquiredProperties: string[]
}
