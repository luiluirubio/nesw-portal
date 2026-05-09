export type BillingStatus = 'draft' | 'sent' | 'paid' | 'cancelled'

export interface BillingItem {
  description:    string
  subDescription: string
  amount:         number
}

export interface Billing {
  id:             string
  billingNo:      string
  agentId:        string
  agentName:      string
  status:         BillingStatus
  proposalId?:    string
  proposalNo?:    string
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
