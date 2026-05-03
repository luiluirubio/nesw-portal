/**
 * Seeds nesw-users-staging with all agents as users.
 * Default password: NESWPortal2025!
 * Run: STAGE=staging npx ts-node src/scripts/seedUsers.ts
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb'
import bcrypt from 'bcryptjs'

const client = new DynamoDBClient({ region: 'ap-southeast-1' })
const db = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } })
const stage = process.env.STAGE ?? 'staging'
const TABLE = `nesw-users-${stage}`
const DEFAULT_PW = 'NESWPortal2025!'

// Role mapping: first agent is Admin, branch managers are Admin, rest are Agent
const seedData = [
  { id: 'AGT-001', name: 'Maria Santos',      email: 'maria.santos@nesw.com',      role: 'Admin',  branch: 'Headquarters', licenseNo: 'REB-2019-001234' },
  { id: 'AGT-002', name: 'Jose Reyes',        email: 'jose.reyes@nesw.com',        role: 'Admin',  branch: 'Cebu City',    licenseNo: 'REB-2018-005678' },
  { id: 'AGT-003', name: 'Ana Dela Cruz',     email: 'ana.delacruz@nesw.com',      role: 'Agent',  branch: 'Cebu City',    licenseNo: 'REB-2020-009012' },
  { id: 'AGT-004', name: 'Roberto Tan',       email: 'roberto.tan@nesw.com',       role: 'Agent',  branch: 'Mandaue',      licenseNo: 'REB-2019-003456' },
  { id: 'AGT-005', name: 'Liza Fernandez',    email: 'liza.fernandez@nesw.com',    role: 'Agent',  branch: 'Mandaue',      licenseNo: 'REB-2021-007890' },
  { id: 'AGT-006', name: 'Carlo Mendoza',     email: 'carlo.mendoza@nesw.com',     role: 'Agent',  branch: 'Lapu-Lapu',    licenseNo: 'REB-2021-011234' },
  { id: 'AGT-007', name: 'Patricia Lim',      email: 'patricia.lim@nesw.com',      role: 'Agent',  branch: 'Lapu-Lapu',    licenseNo: 'REB-2022-015678' },
  { id: 'AGT-008', name: 'Mark Garcia',       email: 'mark.garcia@nesw.com',       role: 'Agent',  branch: 'Talisay',      licenseNo: 'REB-2022-019012' },
  { id: 'AGT-009', name: 'Christine Bautista',email: 'christine.bautista@nesw.com',role: 'Agent',  branch: 'Talisay',      licenseNo: 'REB-2023-023456' },
  { id: 'AGT-010', name: 'Dennis Ocampo',     email: 'dennis.ocampo@nesw.com',     role: 'Agent',  branch: 'Cebu City',    licenseNo: 'REB-2023-027890' },
]

async function seed() {
  console.log(`Seeding ${TABLE}...`)
  const hash = await bcrypt.hash(DEFAULT_PW, 10)

  const items = seedData.map(u => ({
    ...u,
    passwordHash: hash,
    status:       'active',
    createdAt:    new Date().toISOString(),
    createdBy:    'system',
  }))

  // DynamoDB batch write (max 25 per batch)
  for (let i = 0; i < items.length; i += 25) {
    const chunk = items.slice(i, i + 25)
    await db.send(new BatchWriteCommand({
      RequestItems: {
        [TABLE]: chunk.map(item => ({ PutRequest: { Item: item } })),
      },
    }))
  }

  console.log(`✓ Seeded ${items.length} users with default password: ${DEFAULT_PW}`)
  console.log('  Admins: maria.santos@nesw.com, jose.reyes@nesw.com')
}

seed().catch(err => { console.error(err); process.exit(1) })
