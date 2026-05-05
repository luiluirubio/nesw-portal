export interface Service {
  id:           string
  category:     string
  name:         string
  defaultPrice: number
  timeline:     string
  description:  string
  status:       'active' | 'inactive'
  agentId:      string
  createdAt:    string
  updatedAt:    string
}
