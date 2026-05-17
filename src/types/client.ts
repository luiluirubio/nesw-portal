export type ClientStatus = 'active' | 'inactive'

export interface Client {
  id:            string
  clientCode:    string
  accountNumber?: string
  name:          string
  company:       string
  email:         string
  phone:         string
  street:        string
  barangay:      string
  city:          string
  province:      string
  notes:         string
  status:        ClientStatus
  agentId:       string
  agentName:     string
  createdAt:     string
  updatedAt:     string
}

