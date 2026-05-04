// One-time script: seed production users into DynamoDB
// Run: node backend/scripts/seed-prod-users.mjs
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

const TABLE    = 'nesw-users-production'
const REGION   = 'ap-southeast-1'
const TEMP_PW  = 'NESWPortal@2025'   // ← change after first login

const client = new DynamoDBClient({ region: REGION })
const ddb    = DynamoDBDocumentClient.from(client)

const users = [
  { name: 'Lui Rubio',      email: 'lrubio@neswcorp.com',        role: 'Admin',  branch: 'Headquarters' },
  { name: 'Marivic Rubio',  email: 'marivicrubio@neswcorp.com',  role: 'Agent',  branch: 'Headquarters' },
  { name: 'Miraflor Rubio', email: 'miraflorrubio@neswcorp.com', role: 'Agent',  branch: 'Headquarters' },
  { name: 'Jessamyn Rubio', email: 'jrubio@neswcorp.com',        role: 'Agent',  branch: 'Headquarters' },
]

const hash = await bcrypt.hash(TEMP_PW, 12)

console.log('Creating users in', TABLE, '\n')
const created = []
for (const u of users) {
  const id = randomUUID()
  const item = {
    id,
    name:         u.name,
    email:        u.email,
    role:         u.role,
    branch:       u.branch,
    licenseNo:    '',
    status:       'active',
    passwordHash: hash,
    createdAt:    new Date().toISOString(),
  }
  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }))
  created.push({ ...u, id })
  console.log(`✓ ${u.role.padEnd(5)} ${u.name.padEnd(20)} ${u.email}  (id: ${id})`)
}

console.log('\n─────────────────────────────────────────────')
console.log('Temporary password:', TEMP_PW)
console.log('All 4 accounts created successfully.')
