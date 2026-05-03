import type { PropertyType, ListingType } from './property'

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
  }
  features: string[]
  photos: { name: string; size: string }[]
  docs:   { name: string; size: string }[]
}
