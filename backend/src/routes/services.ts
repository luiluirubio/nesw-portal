import { Router, Response } from 'express'
import { v4 as uuid } from 'uuid'
import { db, Tables, ScanCommand, GetCommand, PutCommand, UpdateCommand } from '../db/dynamo'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/services — list all; ?status=active for active only
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query
    const result = await db.send(new ScanCommand({ TableName: Tables.services }))
    let items = (result.Items ?? []).sort(
      (a, b) => (a.category as string).localeCompare(b.category as string) ||
                (a.name as string).localeCompare(b.name as string)
    )
    if (status === 'active') items = items.filter(i => i.status === 'active')
    res.json(items)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch services' })
  }
})

// GET /api/services/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.send(new GetCommand({ TableName: Tables.services, Key: { id: req.params.id } }))
    if (!result.Item) { res.status(404).json({ error: 'Service not found' }); return }
    res.json(result.Item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch service' })
  }
})

// POST /api/services — create (admin only)
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'Admin') { res.status(403).json({ error: 'Admin only' }); return }
    const { category, name, defaultPrice, timeline, description } = req.body
    if (!category || !name || defaultPrice == null) {
      res.status(400).json({ error: 'category, name and defaultPrice are required' }); return
    }
    const item = {
      id:           `SVC-${uuid().slice(0, 8).toUpperCase()}`,
      category:     category as string,
      name:         name as string,
      defaultPrice: Number(defaultPrice),
      timeline:     (timeline as string) ?? '',
      description:  (description as string) ?? '',
      status:       'active',
      agentId:      req.userId ?? '',
      createdAt:    new Date().toISOString(),
      updatedAt:    new Date().toISOString(),
    }
    await db.send(new PutCommand({ TableName: Tables.services, Item: item }))
    res.status(201).json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create service' })
  }
})

// PUT /api/services/:id — update (admin only)
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'Admin') { res.status(403).json({ error: 'Admin only' }); return }
    const { id } = req.params
    const existing = await db.send(new GetCommand({ TableName: Tables.services, Key: { id } }))
    if (!existing.Item) { res.status(404).json({ error: 'Service not found' }); return }

    const allowed = ['category', 'name', 'defaultPrice', 'timeline', 'description', 'status']
    const exprParts: string[] = ['#ua = :ua']
    const names: Record<string, string>  = { '#ua': 'updatedAt' }
    const values: Record<string, unknown> = { ':ua': new Date().toISOString() }

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        exprParts.push(`#${key} = :${key}`)
        names[`#${key}`]  = key
        values[`:${key}`] = key === 'defaultPrice' ? Number(req.body[key]) : req.body[key]
      }
    }

    await db.send(new UpdateCommand({
      TableName: Tables.services,
      Key: { id },
      UpdateExpression: `SET ${exprParts.join(', ')}`,
      ExpressionAttributeNames:  names,
      ExpressionAttributeValues: values,
    }))
    res.json({ id, ...req.body, updatedAt: values[':ua'] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update service' })
  }
})

// PUT /api/services/:id/toggle — toggle active/inactive (soft delete)
router.put('/:id/toggle', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'Admin') { res.status(403).json({ error: 'Admin only' }); return }
    const { id } = req.params
    const result = await db.send(new GetCommand({ TableName: Tables.services, Key: { id } }))
    if (!result.Item) { res.status(404).json({ error: 'Service not found' }); return }

    const newStatus = result.Item.status === 'active' ? 'inactive' : 'active'
    await db.send(new UpdateCommand({
      TableName: Tables.services,
      Key: { id },
      UpdateExpression: 'SET #s = :s, #ua = :ua',
      ExpressionAttributeNames:  { '#s': 'status', '#ua': 'updatedAt' },
      ExpressionAttributeValues: { ':s': newStatus, ':ua': new Date().toISOString() },
    }))
    res.json({ id, status: newStatus })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to toggle service status' })
  }
})

export default router
