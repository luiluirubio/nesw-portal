import type { PropertyType, ListingType } from './property'
import type { BillingItem } from './billing'

// ── Shared base ───────────────────────────────────────────────────────────────
export interface BaseDraft {
  id:        string
  agentId:   string
  agentName: string
  draftType: 'listing' | 'proposal' | 'booking' | 'billing'
  savedAt:   string
}

// ── Proposal draft ────────────────────────────────────────────────────────────
export interface ProposalDraft extends BaseDraft {
  draftType: 'proposal'
  lastStep: number
  client: {
    clientName:    string
    clientCompany: string
    clientEmail:   string
    clientPhone:   string
    clientAddress: string
    clientNotes:   string
  }
  selectedIds: string[]
  lineItems:   Record<string, { qty: number; unitPrice: number; notes: string }>
  discount:    string
  validity:    string
  terms:       string
}

// ── Booking draft ─────────────────────────────────────────────────────────────
export interface BookingDraft extends BaseDraft {
  draftType:          'booking'
  selectedProposalId: string
  clientName:         string
  clientCompany:      string
  clientEmail:        string
  clientPhone:        string
  clientAddress:      string
  scopeNotes:         string
  startDate:          string
  notes:              string
}

// ── Billing draft ─────────────────────────────────────────────────────────────
export interface BillingDraft extends BaseDraft {
  draftType:      'billing'
  selectedBooking: string
  linkedBookingId: string
  linkedBookingNo: string
  clientName:      string
  clientCompany:   string
  clientAddress:   string
  servicePurpose:  string
  dateIssued:      string
  items:           BillingItem[]
  discount:        number
  terms:           string
}

// ── Listing draft (existing) ──────────────────────────────────────────────────
export interface ListingDraft {
  id: string
  agentId: string
  agentName: string
  lastStep: number
  savedAt: string
  form: {
    title: string
    type: PropertyType
    listingType: ListingType
    price: string
    commission: string
    ownerName: string
    nameInTitle: string
    taxDeclarationNo: string
    address: string
    barangay: string
    city: string
    province: string
    floorArea: string
    lotArea: string
    bedrooms: string
    bathrooms: string
    parking: string
    description: string
    contactPerson: string
    contactEmail: string
    contactPhone: string
    contactTelephone: string
    subdivision?: string
    // Co-Broker (all optional)
    coBrokerName: string
    coBrokerLicenseNo: string
    coBrokerMobile: string
    coBrokerEmail: string
    coBrokerTelephone: string
    coBrokerAddress: string
    coBrokerAffiliation: string
  }
  features: string[]
  photos: { name: string; size: string }[]
  docs:   { name: string; size: string }[]
}
