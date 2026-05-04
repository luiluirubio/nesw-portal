export type PropertyType =
  | 'house_and_lot'
  | 'condo'
  | 'lot_only'
  | 'commercial'
  | 'townhouse'
  | 'warehouse'
  | 'farm_lot'

export type PropertyStatus = 'available' | 'reserved' | 'under_contract' | 'sold' | 'off_market' | 'expired'

export type ListingType = 'for_sale' | 'for_rent'

export interface PropertyLocation {
  address: string
  barangay: string
  city: string
  province: string
}

export interface PropertyDocument {
  name: string
  type: 'title' | 'tax_dec' | 'floor_plan' | 'survey' | 'photo' | 'other'
  size: string
}

export interface Property {
  id: string
  title: string
  type: PropertyType
  listingType: ListingType
  status: PropertyStatus
  price: number
  location: PropertyLocation
  floorArea: number
  lotArea: number
  bedrooms: number
  bathrooms: number
  parking: number
  agentId: string
  dateListed: string
  description: string
  features: string[]
  photos: string[]
  documents: PropertyDocument[]
  turnoverDate?: string
  commission: number
  // Ownership details
  taxDeclarationNo: string
  ownerName: string
  nameInTitle: string
  // Contact
  contactPerson: string
  contactEmail: string
  contactPhone: string
  // Optional
  subdivision?: string
  // Co-Broker (optional — present only when a co-broker is involved)
  coBroker?: {
    name:        string
    licenseNo:   string
    mobile:      string
    email:       string
    telephone:   string
    address:     string
    affiliation: string
  }
}
