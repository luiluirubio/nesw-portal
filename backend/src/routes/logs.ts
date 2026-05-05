import { Router, Response } from 'express'
import { v4 as uuid } from 'uuid'
import { db, Tables, ScanCommand, PutCommand, QueryCommand } from '../db/dynamo'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/logs  — all logs (admin) or filter by agentId
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.send(new ScanCommand({
      TableName: Tables.activityLogs,
      Limit: 500,
    }))
    const items = (result.Items ?? []).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    res.json(items)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch logs' })
  }
})

// POST /api/logs — record a create or edit event
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { action, propertyId, propertyTitle, agentId, agentName, changes } = req.body
    if (!action || !propertyId || !agentId) {
      res.status(400).json({ error: 'action, propertyId and agentId are required' })
      return
    }
    const item = {
      id:            uuid(),
      timestamp:     new Date().toISOString(),
      action,
      propertyId,
      propertyTitle: propertyTitle ?? '',
      agentId,
      agentName:     agentName ?? '',
      changes:       changes ?? [],
    }
    await db.send(new PutCommand({ TableName: Tables.activityLogs, Item: item }))
    res.status(201).json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to write log' })
  }
})

// GET /api/logs/login — login history
router.get('/login', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { agentId } = req.query

    if (agentId && typeof agentId === 'string') {
      const result = await db.send(new QueryCommand({
        TableName: Tables.loginHistory,
        KeyConditionExpression: 'agentId = :a',
        ExpressionAttributeValues: { ':a': agentId },
        ScanIndexForward: false,
        Limit: 50,
      }))
      res.json(result.Items ?? [])
      return
    }

    const result = await db.send(new ScanCommand({
      TableName: Tables.loginHistory,
      Limit: 500,
    }))
    res.json(result.Items ?? [])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch login history' })
  }
})

// POST /api/logs/login — record a login
router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { agentId, agentName, method, sessionId, ipAddress, userAgent } = req.body
    if (!agentId) { res.status(400).json({ error: 'agentId is required' }); return }

    const item = {
      agentId,
      agentName:  agentName ?? '',
      timestamp:  new Date().toISOString(),
      id:         uuid(),
      method:     method ?? 'manual',
      sessionId:  sessionId ?? uuid(),
      ipAddress:  ipAddress ?? 'unknown',
      userAgent:  userAgent ?? '',
    }
    await db.send(new PutCommand({ TableName: Tables.loginHistory, Item: item }))
    res.status(201).json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to record login' })
  }
})

export default router
