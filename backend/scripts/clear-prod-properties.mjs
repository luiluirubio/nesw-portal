import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({ region: 'ap-southeast-1' })
const ddb    = DynamoDBDocumentClient.from(client)
const TABLE  = 'nesw-properties-production'

const { Items = [] } = await ddb.send(new ScanCommand({ TableName: TABLE }))
console.log(`Deleting ${Items.length} listings from ${TABLE}…`)

for (const item of Items) {
  await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { id: item.id } }))
  console.log(`  ✓ ${item.id}  ${item.title}`)
}

const { Count } = await ddb.send(new ScanCommand({ TableName: TABLE, Select: 'COUNT' }))
console.log(`\nDone. Items remaining: ${Count}`)
