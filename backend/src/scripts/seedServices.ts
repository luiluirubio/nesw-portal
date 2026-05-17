/**
 * Seeds default NESW service types into DynamoDB.
 * Run: $env:STAGE='staging'; npx ts-node src/scripts/seedServices.ts
 *
 * Requires AWS credentials. Set STAGE to target the correct table (default: staging).
 * Existing services are wiped before inserting fresh defaults.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb'
import { v4 as uuid } from 'uuid'

const client = new DynamoDBClient({ region: 'ap-southeast-1' })
const db = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } })
const stage = process.env.STAGE ?? 'staging'
const TABLE = `nesw-services-${stage}`

const now = new Date().toISOString()

const services = [
  { category: 'RPT Assistance',      name: 'Real Property Tax Clearance',  defaultPrice: 5000,  timeline: '5-7 business days' },
  { category: 'RPT Assistance',      name: 'RPT Payment Assistance',       defaultPrice: 3000,  timeline: '3-5 business days' },
  { category: 'Title Transfer',      name: 'Title Transfer Processing',    defaultPrice: 25000, timeline: '30-45 business days' },
  { category: 'Title Transfer',      name: 'Deed of Sale Preparation',     defaultPrice: 10000, timeline: '5-10 business days' },
  { category: 'Property Appraisal',  name: 'Property Valuation Report',    defaultPrice: 8000,  timeline: '7-10 business days' },
  { category: 'Property Appraisal',  name: 'Market Study',                 defaultPrice: 15000, timeline: '10-15 business days' },
  { category: 'Property Management', name: 'Monthly Property Management',  defaultPrice: 5000,  timeline: 'Monthly' },
  { category: 'Property Management', name: 'Lease Administration',         defaultPrice: 8000,  timeline: 'Ongoing' },
  { category: 'Environmental Planning', name: 'Environmental Compliance',  defaultPrice: 20000, timeline: '15-20 business days' },
  { category: 'Environmental Planning', name: 'Site Assessment',           defaultPrice: 12000, timeline: '7-10 business days' },
]

async function wipe() {
  const result = await db.send(new ScanCommand({ TableName: TABLE, ProjectionExpression: 'id' }))
  const ids = (result.Items ?? []).map(i => i.id as string)
  if (ids.length === 0) return
  for (let i = 0; i < ids.length; i += 25) {
    const chunk = ids.slice(i, i + 25)
    await db.send(new BatchWriteCommand({
      RequestItems: {
        [TABLE]: chunk.map(id => ({ DeleteRequest: { Key: { id } } })),
      },
    }))
  }
  console.log(`Deleted ${ids.length} existing service(s)`)
}

async function seed() {
  const items = services.map(s => ({
    id:           `SVC-${uuid().slice(0, 8).toUpperCase()}`,
    category:     s.category,
    name:         s.name,
    defaultPrice: s.defaultPrice,
    timeline:     s.timeline,
    description:  '',
    status:       'active',
    agentId:      'SYSTEM',
    createdAt:    now,
    updatedAt:    now,
  }))

  for (let i = 0; i < items.length; i += 25) {
    const chunk = items.slice(i, i + 25)
    await db.send(new BatchWriteCommand({
      RequestItems: {
        [TABLE]: chunk.map(item => ({ PutRequest: { Item: item } })),
      },
    }))
  }
  console.log(`Seeded ${items.length} services into ${TABLE}`)
}

wipe().then(seed).catch(err => { console.error(err); process.exit(1) })
