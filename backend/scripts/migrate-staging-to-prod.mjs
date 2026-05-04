// Copies all items from nesw-properties-staging → nesw-properties-production
// Run: node backend/scripts/migrate-staging-to-prod.mjs
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({ region: 'ap-southeast-1' })
const ddb    = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } })

const SRC  = 'nesw-properties-staging'
const DEST = 'nesw-properties-production'

const { Items = [] } = await ddb.send(new ScanCommand({ TableName: SRC }))
console.log(`Found ${Items.length} items in ${SRC}`)

let ok = 0
for (const item of Items) {
  await ddb.send(new PutCommand({ TableName: DEST, Item: item }))
  console.log(`  ✓ ${item.id}  ${item.title}`)
  ok++
}

console.log(`\nDone — ${ok} listings copied to ${DEST}`)
