import { Router, Response } from 'express'
import { v4 as uuid } from 'uuid'
import { db, Tables, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand } from '../db/dynamo'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/properties
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status, agentId } = req.query

    if (status && typeof status === 'string') {
      const result = await db.send(new QueryCommand({
        TableName: Tables.properties,
        IndexName: 'ByStatus',
        KeyConditionExpression: '#s = :s',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':s': status },
      }))
      res.json(result.Items ?? [])
      return
    }

    if (agentId && typeof agentId === 'string') {
      const result = await db.send(new QueryCommand({
        TableName: Tables.properties,
        IndexName: 'ByAgent',
        KeyConditionExpression: 'agentId = :a',
        ExpressionAttributeValues: { ':a': agentId },
      }))
      res.json(result.Items ?? [])
      return
    }

    const result = await db.send(new ScanCommand({ TableName: Tables.properties }))
    res.json(result.Items ?? [])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch properties' })
  }
})

// GET /api/properties/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.send(new GetCommand({
      TableName: Tables.properties,
      Key: { id: req.params.id },
    }))
    if (!result.Item) { res.status(404).json({ error: 'Property not found' }); return }
    res.json(result.Item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch property' })
  }
})

// POST /api/properties
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = `PROP-${uuid().slice(0, 8).toUpperCase()}`
    const item = {
      ...req.body,
      id,
      dateListed: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    if (!item.title || !item.price || !item.type || !item.status) {
      res.status(400).json({ error: 'title, price, type, and status are required' })
      return
    }

    await db.send(new PutCommand({ TableName: Tables.properties, Item: item }))
    res.status(201).json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create property' })
  }
})

// PUT /api/properties/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await db.send(new GetCommand({
      TableName: Tables.properties,
      Key: { id: req.params.id },
    }))
    if (!existing.Item) { res.status(404).json({ error: 'Property not found' }); return }

    // build update expression dynamically
    const updates = { ...req.body, updatedAt: new Date().toISOString() }
    delete updates.id

    const setExpressions: string[] = []
    const names: Record<string, string> = {}
    const values: Record<string, unknown> = {}

    Object.entries(updates).forEach(([k, v]) => {
      const nameKey  = `#${k}`
      const valueKey = `:${k}`
      setExpressions.push(`${nameKey} = ${valueKey}`)
      names[nameKey]  = k
      values[valueKey] = v
    })

    await db.send(new UpdateCommand({
      TableName: Tables.properties,
      Key: { id: req.params.id },
      UpdateExpression: `SET ${setExpressions.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    }))

    res.json({ id: req.params.id, ...existing.Item, ...updates })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update property' })
  }
})

// DELETE /api/properties/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await db.send(new DeleteCommand({
      TableName: Tables.properties,
      Key: { id: req.params.id },
    }))
    res.status(204).send()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete property' })
  }
})

export default router
