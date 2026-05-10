export type BookingStatus = 'draft' | 'active' | 'completed' | 'cancelled'

export interface BookingService {
  serviceId: string
  category:  string
  name:      string
  qty:       number
  unitPrice: number
  timeline:  string
  notes:     string
}

export interface Booking {
  id:           string
  bookingNo:    string
  agentId:      string
  agentName:    string
  status:       BookingStatus
  proposalId:   string
  proposalNo:   string
  clientId?:    string
  clientCode?:  string
  clientName:   string
  clientCompany: string
  clientEmail:  string
  clientPhone:  string
  clientAddress: string
  scopeNotes:   string
  services:     BookingService[]
  totalAmount:  number
  startDate:    string
  notes:        string
  createdAt:    string
  updatedAt:    string
}
