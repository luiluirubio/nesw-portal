export type BillingStatus   = 'draft' | 'sent' | 'paid' | 'cancelled'
export type BillingItemType = 'debit' | 'credit'

export interface BillingItem {
  description:    string
  subDescription: string
  amount:         number
  type:           BillingItemType  // debit = charge to client, credit = payment received
}

export interface Billing {
  id:             string
  billingNo:      string
  agentId:        string
  agentName:      string
  status:         BillingStatus
  bookingId?:     string
  bookingNo?:     string
  proposalId?:    string
  proposalNo?:    string
  clientId?:      string
  clientCode?:    string
  clientName:     string
  clientCompany:  string
  clientAddress:  string
  servicePurpose: string
  items:          BillingItem[]
  discount:       number
  subtotal:       number
  total:          number
  terms:          string
  dateIssued:     string
  createdAt:      string
  updatedAt:      string
}
