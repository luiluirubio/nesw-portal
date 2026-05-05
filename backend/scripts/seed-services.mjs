// Seeds the NESW service catalog into nesw-services-staging.
// Run: node backend/scripts/seed-services.mjs
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({ region: 'ap-southeast-1' })
const ddb    = DynamoDBDocumentClient.from(client)
const TABLE  = 'nesw-services-staging'

const services = [
  // RPT Assistance
  { category: 'RPT Assistance', name: 'RPT Payment Assistance (per title)',      defaultPrice: 1000,    timeline: '1-5 days' },
  { category: 'RPT Assistance', name: 'RPT Clearance Facilitation (per title)',  defaultPrice: 1500,    timeline: '2-7 days' },

  // Title Transfer
  { category: 'Title Transfer', name: 'Title Transfer – Complete Package (Residential/Agricultural)', defaultPrice: 45000, timeline: '45-180 days' },
  { category: 'Title Transfer', name: 'Title Transfer – Complete Package (Commercial/Industrial)',    defaultPrice: 55000, timeline: '45-180 days' },
  { category: 'Title Transfer', name: 'EJS Full Facilitation (Extrajudicial Settlement)',             defaultPrice: 55000, timeline: '60-150 days' },

  // Property Appraisal
  { category: 'Property Appraisal', name: 'Residential/Agricultural Appraisal (minimum fee)', defaultPrice: 10000, timeline: '10-20 days' },
  { category: 'Property Appraisal', name: 'Commercial Lot / Office Appraisal (minimum fee)',  defaultPrice: 20000, timeline: '10-20 days' },
  { category: 'Property Appraisal', name: 'Industrial / Warehouse Appraisal (minimum fee)',   defaultPrice: 35000, timeline: '15-25 days' },

  // Property Management
  { category: 'Property Management', name: 'Property Management (monthly retainer)', defaultPrice: 15000, timeline: 'Ongoing' },

  // Environmental Planning
  { category: 'Environmental Planning', name: 'CLUP Preparation (LGU)',                      defaultPrice: 100000,   timeline: '4-12 months' },
  { category: 'Environmental Planning', name: 'EIS (Environmental Impact Statement)',          defaultPrice: 1500000,  timeline: '12-24 months' },
]

let seeded = 0
for (const svc of services) {
  const id = `SVC-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      id,
      ...svc,
      description: '',
      status:    'active',
      agentId:   'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }))
  console.log(`  ✓ [${svc.category}] ${svc.name}`)
  seeded++
}
console.log(`\nDone. ${seeded} services seeded into ${TABLE}.`)
