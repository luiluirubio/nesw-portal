export interface Payee {
  id:             string
  accountNumber:  string   // PAY-2026-0001
  name:           string
  company?:       string
  contactPerson?: string
  contactNumber?: string
  email?:         string
  address?:       string   // company address
  notes?:         string
  idName?:        string   // attached ID file name
  idUrl?:         string   // attached ID — S3 public URL
  status:         'active' | 'inactive'
  createdAt:      string
  updatedAt:      string
}
