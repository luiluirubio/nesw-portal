// Backfills agentName into nesw-login-history-production for records missing it.
// Run: node backend/scripts/backfill-login-names.mjs
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({ region: 'ap-southeast-1' })
const ddb    = DynamoDBDocumentClient.from(client)

// 1. Build id→name map from users table
const { Items: users = [] } = await ddb.send(new ScanCommand({ TableName: 'nesw-users-production' }))
const nameMap = Object.fromEntries(users.map(u => [u.id, u.name]))
console.log(`Found ${users.length} users:`, nameMap)

// 2. Scan login history and patch any missing agentName
const { Items: logins = [] } = await ddb.send(new ScanCommand({ TableName: 'nesw-login-history-production' }))
console.log(`\nPatching ${logins.length} login records…`)

let updated = 0
for (const login of logins) {
  if (login.agentName) continue   // already has a name
  const name = nameMap[login.agentId]
  if (!name) { console.log(`  skipped ${login.agentId} (user not found)`); continue }
  await ddb.send(new UpdateCommand({
    TableName: 'nesw-login-history-production',
    Key: { agentId: login.agentId, timestamp: login.timestamp },
    UpdateExpression: 'SET agentName = :n',
    ExpressionAttributeValues: { ':n': name },
  }))
  console.log(`  ✓ ${login.timestamp.slice(0, 16)}  ${login.agentId.slice(0, 8)}…  →  ${name}`)
  updated++
}

console.log(`\nDone. ${updated} records updated.`)
