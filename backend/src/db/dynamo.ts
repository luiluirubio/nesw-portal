import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'ap-southeast-1' })
export const db = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
})

const stage = process.env.STAGE ?? 'staging'

export const Tables = {
  properties:   `nesw-properties-${stage}`,
  agents:       `nesw-agents-${stage}`,
  activityLogs: `nesw-activity-logs-${stage}`,
  loginHistory: `nesw-login-history-${stage}`,
  drafts:       `nesw-drafts-${stage}`,
}

export { GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand, QueryCommand }
