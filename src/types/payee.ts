export type PayeeType = 'company' | 'individual'

export interface Payee {
  id:             string
  accountNumber:  string     // PAY-2026-0001
  payeeType:      PayeeType  // company → company fields; individual → personal fields
  name:           string     // company name OR individual full name
  company?:       string     // legacy / optional secondary company label
  contactPerson?: string     // company only
  contactNumber?: string
  email?:         string
  address?:       string     // company address or individual address
  notes?:         string
  idName?:        string      // attached ID file name
  idUrl?:         string      // attached ID — S3 public URL
  status:         'active' | 'inactive'
  createdAt:      string
  updatedAt:      string
}
