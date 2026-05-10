export type ClientStatus = 'active' | 'inactive'

export interface Client {
  id:         string
  clientCode: string
  name:       string
  company:    string
  email:      string
  phone:      string
  address:    string
  notes:      string
  status:     ClientStatus
  agentId:    string
  agentName:  string
  createdAt:  string
  updatedAt:  string
}

