export interface Payee {
  id:        string
  name:      string
  company?:  string
  contact?:  string   // contact person
  phone?:    string
  email?:    string
  address?:  string
  notes?:    string
  status:    'active' | 'inactive'
  createdAt: string
  updatedAt: string
}
