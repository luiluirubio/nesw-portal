/**
 * Seeds DynamoDB tables with the mock data from the frontend.
 * Run with: npm run seed
 *
 * Requires AWS credentials (AWS_PROFILE or environment variables).
 * Set STAGE env var to target the right table (default: staging).
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({ region: 'ap-southeast-1' })
const db = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } })
const stage = process.env.STAGE ?? 'staging'

const Tables = {
  properties: `nesw-properties-${stage}`,
  agents:     `nesw-agents-${stage}`,
}

// ── Agents ──────────────────────────────────────────────────────────────────
const agents = [
  { id: 'AGT-001', name: 'Maria Santos',     role: 'Super Admin',    branch: 'Headquarters', email: 'maria.santos@nesw.com',      phone: '0917-123-4567', licenseNo: 'REB-2019-001234', dateJoined: '2019-01-15', status: 'active' },
  { id: 'AGT-002', name: 'Jose Reyes',       role: 'Branch Manager', branch: 'Cebu City',    email: 'jose.reyes@nesw.com',        phone: '0918-234-5678', licenseNo: 'REB-2018-005678', dateJoined: '2018-06-01', status: 'active' },
  { id: 'AGT-003', name: 'Ana Dela Cruz',    role: 'Senior Agent',   branch: 'Cebu City',    email: 'ana.delacruz@nesw.com',      phone: '0919-345-6789', licenseNo: 'REB-2020-009012', dateJoined: '2020-03-15', status: 'active' },
  { id: 'AGT-004', name: 'Roberto Tan',      role: 'Senior Agent',   branch: 'Mandaue',      email: 'roberto.tan@nesw.com',       phone: '0916-456-7890', licenseNo: 'REB-2019-003456', dateJoined: '2019-09-01', status: 'active' },
  { id: 'AGT-005', name: 'Liza Fernandez',   role: 'Agent',          branch: 'Mandaue',      email: 'liza.fernandez@nesw.com',    phone: '0915-567-8901', licenseNo: 'REB-2021-007890', dateJoined: '2021-01-10', status: 'active' },
  { id: 'AGT-006', name: 'Carlo Mendoza',    role: 'Agent',          branch: 'Lapu-Lapu',    email: 'carlo.mendoza@nesw.com',     phone: '0912-678-9012', licenseNo: 'REB-2021-011234', dateJoined: '2021-07-20', status: 'active' },
  { id: 'AGT-007', name: 'Patricia Lim',     role: 'Agent',          branch: 'Lapu-Lapu',    email: 'patricia.lim@nesw.com',      phone: '0920-789-0123', licenseNo: 'REB-2022-015678', dateJoined: '2022-02-14', status: 'active' },
  { id: 'AGT-008', name: 'Mark Garcia',      role: 'Agent',          branch: 'Talisay',      email: 'mark.garcia@nesw.com',       phone: '0921-890-1234', licenseNo: 'REB-2022-019012', dateJoined: '2022-05-30', status: 'active' },
  { id: 'AGT-009', name: 'Christine Bautista', role: 'Junior Agent', branch: 'Talisay',      email: 'christine.bautista@nesw.com',phone: '0922-901-2345', licenseNo: 'REB-2023-023456', dateJoined: '2023-01-09', status: 'active' },
  { id: 'AGT-010', name: 'Dennis Ocampo',    role: 'Junior Agent',   branch: 'Cebu City',    email: 'dennis.ocampo@nesw.com',     phone: '0923-012-3456', licenseNo: 'REB-2023-027890', dateJoined: '2023-06-01', status: 'active' },
]

// ── Properties (abbreviated — full list mirrors frontend data) ──────────────
const properties = [
  { id: 'PROP-001', title: 'Modern House in Banilad Heights',        type: 'house_and_lot', listingType: 'for_sale', status: 'available',      price: 12500000, agentId: 'AGT-003', location: { address: 'Lot 12 Blk 5 Banilad Heights', barangay: 'Banilad',       city: 'Cebu City',     province: 'Cebu' }, floorArea: 220, lotArea: 350,  bedrooms: 4, bathrooms: 3, parking: 2, commission: 3, taxDeclarationNo: 'TD-2024-001234', ownerName: 'Guillermo P. Santos Jr.',   nameInTitle: 'Guillermo P. Santos Jr.',                              contactPerson: 'Guillermo P. Santos Jr.',   contactEmail: 'g.santos@email.com',          contactPhone: '0917-123-4001', description: 'Elegant modern house in prestigious Banilad Heights.', features: ['Swimming Pool','Home Office','Balcony','Smart Home','Solar Panels','CCTV'], photos: [], documents: [], dateListed: '2025-01-10' },
  { id: 'PROP-002', title: 'Family Home in Filinvest Cebu',          type: 'house_and_lot', listingType: 'for_sale', status: 'under_contract', price: 8800000,  agentId: 'AGT-004', location: { address: 'Lot 8 Blk 12 Filinvest Homes',    barangay: 'Basak',         city: 'Mandaue City',  province: 'Cebu' }, floorArea: 180, lotArea: 280,  bedrooms: 3, bathrooms: 2, parking: 1, commission: 3, taxDeclarationNo: 'TD-2023-008876', ownerName: 'Eleanor R. Ong',           nameInTitle: 'Eleanor R. Ong married to Henry C. Ong',              contactPerson: 'Henry C. Ong',             contactEmail: 'henry.ong@gmail.com',         contactPhone: '0918-200-4002', description: 'Well-maintained family home in a secure gated community.', features: ['Corner Lot','Covered Carport','Enclosed Garage'], photos: [], documents: [], dateListed: '2024-11-20' },
  { id: 'PROP-003', title: 'Luxury Villa in Maria Luisa Estate',     type: 'house_and_lot', listingType: 'for_sale', status: 'available',      price: 45000000, agentId: 'AGT-002', location: { address: '18 Acacia Lane Maria Luisa Estate', barangay: 'Banilad',       city: 'Cebu City',     province: 'Cebu' }, floorArea: 650, lotArea: 1200, bedrooms: 6, bathrooms: 6, parking: 4, commission: 2.5, taxDeclarationNo: 'TD-2022-000045', ownerName: 'Alejandro M. Reyes',      nameInTitle: 'Alejandro M. Reyes',                                   contactPerson: 'Alejandro M. Reyes',        contactEmail: 'alejandro.reyes@businessmail.com', contactPhone: '0919-300-4003', description: 'Grand luxury villa in the most exclusive subdivision in Cebu.', features: ['Infinity Pool','Home Cinema','Wine Cellar','Gym','Smart Home','Solar Panels'], photos: [], documents: [], dateListed: '2025-02-01' },
  { id: 'PROP-004', title: 'Starter Home in Talisay Residences',     type: 'house_and_lot', listingType: 'for_sale', status: 'available',      price: 3200000,  agentId: 'AGT-008', location: { address: 'Lot 22 Blk 3 Talisay Residences', barangay: 'Poblacion',     city: 'Talisay City',  province: 'Cebu' }, floorArea: 80,  lotArea: 120,  bedrooms: 2, bathrooms: 1, parking: 1, commission: 4, taxDeclarationNo: 'TD-2025-014400', ownerName: 'Imelda D. Garcia',        nameInTitle: 'Imelda D. Garcia',                                     contactPerson: 'Imelda D. Garcia',          contactEmail: 'imelda.garcia@yahoo.com',     contactPhone: '0920-400-4004', description: 'Affordable starter home near SRP.', features: ['Near SRP','Secure Compound','Water Tank'], photos: [], documents: [], dateListed: '2025-03-05' },
  { id: 'PROP-005', title: 'House and Lot in Consolacion',           type: 'house_and_lot', listingType: 'for_sale', status: 'sold',           price: 5500000,  agentId: 'AGT-005', location: { address: 'Lot 5 Blk 7 Palm Springs Village', barangay: 'Lamac',         city: 'Consolacion',   province: 'Cebu' }, floorArea: 130, lotArea: 200,  bedrooms: 3, bathrooms: 2, parking: 1, commission: 3.5, taxDeclarationNo: 'TD-2021-033210', ownerName: 'Rodrigo B. Cruz',         nameInTitle: 'Rodrigo B. Cruz married to Maribel S. Cruz',          contactPerson: 'Rodrigo B. Cruz',           contactEmail: 'rodrigo.cruz@gmail.com',      contactPhone: '0916-500-4005', description: 'Well-designed home near MEPZ.', features: ['Near MEPZ','Balcony','Covered Parking'], photos: [], documents: [], dateListed: '2024-09-15' },
  { id: 'PROP-006', title: '2BR Condo at Avida Towers Cebu',         type: 'condo',         listingType: 'for_sale', status: 'available',      price: 4800000,  agentId: 'AGT-003', location: { address: 'Tower 2 Unit 1508 Avida Towers',  barangay: 'Lahug',         city: 'Cebu City',     province: 'Cebu' }, floorArea: 56,  lotArea: 0,    bedrooms: 2, bathrooms: 1, parking: 1, commission: 3, taxDeclarationNo: 'TD-2023-055021', ownerName: 'Maria Theresa A. Lim',    nameInTitle: 'Maria Theresa A. Lim',                                 contactPerson: 'Maria Theresa A. Lim',      contactEmail: 'mtheresa.lim@outlook.com',    contactPhone: '0912-600-4006', description: 'High-floor 2BR at Avida Towers. Fully furnished.', features: ['Fully Furnished','City View','Pool Access','Gym Access'], photos: [], documents: [], dateListed: '2025-01-25' },
  { id: 'PROP-007', title: 'Studio Unit at Amisa Private Residences',type: 'condo',         listingType: 'for_sale', status: 'reserved',       price: 3200000,  agentId: 'AGT-007', location: { address: 'Tower 1 Unit 812 Amisa',          barangay: 'Punta Engaño',  city: 'Lapu-Lapu City',province: 'Cebu' }, floorArea: 32,  lotArea: 0,    bedrooms: 0, bathrooms: 1, parking: 1, commission: 3, taxDeclarationNo: 'TD-2024-071890', ownerName: 'Jerome V. Tan',           nameInTitle: 'Jerome V. Tan',                                        contactPerson: 'Jerome V. Tan',             contactEmail: 'jerome.tan@tangroup.com',     contactPhone: '0915-700-4007', description: 'Beach resort-style studio in Amisa.', features: ['Beach Access','Resort Amenities','Sea View'], photos: [], documents: [], dateListed: '2025-02-14' },
  { id: 'PROP-008', title: '3BR Penthouse at 38 Park Avenue',        type: 'condo',         listingType: 'for_sale', status: 'available',      price: 18500000, agentId: 'AGT-002', location: { address: '38 Park Avenue Unit PH-01',      barangay: 'Cebu Business Park', city: 'Cebu City', province: 'Cebu' }, floorArea: 210, lotArea: 0,    bedrooms: 3, bathrooms: 3, parking: 2, commission: 2.5, taxDeclarationNo: 'TD-2022-000302', ownerName: 'Jose Emmanuel C. Villanueva', nameInTitle: 'Jose Emmanuel C. Villanueva',                    contactPerson: 'Jose Emmanuel C. Villanueva', contactEmail: 'jose.villanueva@villanueva.ph', contactPhone: '0921-800-4008', description: 'Luxurious penthouse with panoramic city and sea views.', features: ['Private Terrace','Panoramic View','Premium Finishes'], photos: [], documents: [], dateListed: '2025-01-05' },
  { id: 'PROP-009', title: '1BR Unit at Baseline Premiere',          type: 'condo',         listingType: 'for_rent', status: 'available',      price: 28000,    agentId: 'AGT-010', location: { address: 'Baseline Premiere Unit 612',     barangay: 'Pahina Central',city: 'Cebu City',     province: 'Cebu' }, floorArea: 38,  lotArea: 0,    bedrooms: 1, bathrooms: 1, parking: 0, commission: 1, taxDeclarationNo: 'TD-2023-088541', ownerName: 'Cynthia P. Navarro',      nameInTitle: 'Cynthia P. Navarro',                                   contactPerson: 'Cynthia P. Navarro',        contactEmail: 'cynthia.navarro@gmail.com',   contactPhone: '0922-900-4009', description: 'Cozy 1BR near USC. Partially furnished.', features: ['Partially Furnished','Near University','Pool Access'], photos: [], documents: [], dateListed: '2025-04-01' },
  { id: 'PROP-010', title: 'Prime Commercial Lot in IT Park',        type: 'lot_only',      listingType: 'for_sale', status: 'available',      price: 35000000, agentId: 'AGT-003', location: { address: 'IT Park Extension Lot 7',        barangay: 'Apas',          city: 'Cebu City',     province: 'Cebu' }, floorArea: 0,   lotArea: 500,  bedrooms: 0, bathrooms: 0, parking: 0, commission: 2.5, taxDeclarationNo: 'TD-2020-002100', ownerName: 'Cebu Land Holdings Inc.', nameInTitle: 'Cebu Land Holdings Incorporated',                      contactPerson: 'Atty. Ramon T. Alcala',     contactEmail: 'r.alcala@cebulandholdings.com', contactPhone: '0917-010-4010', description: 'Prime IT Park extension lot for mixed-use development.', features: ['Corner Lot','All Utilities','Near IT Park'], photos: [], documents: [], dateListed: '2025-02-20' },
]

async function batchWrite(tableName: string, items: Record<string, unknown>[]) {
  const chunks: Record<string, unknown>[][] = []
  for (let i = 0; i < items.length; i += 25) chunks.push(items.slice(i, i + 25))

  for (const chunk of chunks) {
    await db.send(new BatchWriteCommand({
      RequestItems: {
        [tableName]: chunk.map(item => ({ PutRequest: { Item: item } })),
      },
    }))
  }
}

async function seed() {
  console.log(`Seeding DynamoDB (stage: ${stage})...`)

  console.log('  → agents')
  await batchWrite(Tables.agents, agents)

  console.log('  → properties')
  await batchWrite(Tables.properties, properties)

  console.log('✓ Seed complete.')
}

seed().catch(err => { console.error(err); process.exit(1) })
