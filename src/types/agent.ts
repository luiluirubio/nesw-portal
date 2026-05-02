export type AgentRole = 'Super Admin' | 'Branch Manager' | 'Senior Agent' | 'Agent' | 'Junior Agent'
export type AgentBranch = 'Cebu City' | 'Mandaue' | 'Lapu-Lapu' | 'Talisay' | 'Headquarters'
export type AgentStatus = 'active' | 'inactive'

export interface Agent {
  id: string
  name: string
  role: AgentRole
  branch: AgentBranch
  email: string
  phone: string
  licenseNo: string
  dateJoined: string
  status: AgentStatus
  avatar?: string
}
