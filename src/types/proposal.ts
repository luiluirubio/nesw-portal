export type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'declined'

export interface ProposalService {
  serviceId: string
  category:  string
  name:      string
  qty:       number
  unitPrice: number
  timeline:  string
  notes:     string
}

export interface Proposal {
  id:            string
  proposalNo:    string
  agentId:       string
  agentName:     string
  status:        ProposalStatus
  clientName:    string
  clientCompany: string
  clientEmail:   string
  clientPhone:   string
  clientAddress: string
  clientNotes:   string
  services:      ProposalService[]
  discount:      number
  validityDays:  number
  terms:         string
  subtotal:      number
  total:         number
  createdAt:     string
  updatedAt:     string
}
