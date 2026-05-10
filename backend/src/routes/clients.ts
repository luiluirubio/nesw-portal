import { Router, Response } from 'express'
import { v4 as uuid } from 'uuid'
import { db, Tables, ScanCommand, GetCommand, PutCommand, UpdateCommand } from '../db/dynamo'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

async function nextClientCode(): Promise<string> {
  const result = await db.send(new ScanCommand({ TableName: Tables.clients, ProjectionExpression: 'clientCode' }))
  const existing = (result.Items ?? [])
    .map(i => i.clientCode as string)
    .filter(c => c?.startsWith('CLT-'))
  const max = existing.reduce((acc, c) => {
    const num = parseInt(c.split('-')[1] ?? '0', 10)
    return num > acc ? num : acc
  }, 0)
  return `CLT-${String(max + 1).padStart(4, '0')}`
}

// GET /api/clients
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.send(new ScanCommand({ TableName: Tables.clients }))
    let items = (result.Items ?? []).sort(
      (a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
    )
    const status = (req.query as Record<string, string>).status
    if (status) items = items.filter(i => i.status === status)
    if (req.userRole !== 'Admin') items = items.filter(i => i.agentId === req.userId)
    res.json(items)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch clients' })
  }
})

// GET /api/clients/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.send(new GetCommand({ TableName: Tables.clients, Key: { id: req.params.id } }))
    if (!result.Item) { res.status(404).json({ error: 'Client not found' }); return }
    res.json(result.Item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch client' })
  }
})

// POST /api/clients
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, company, email, phone, address, notes } = req.body
    if (!name) { res.status(400).json({ error: 'name is required' }); return }

    const clientCode = await nextClientCode()
    const item = {
      id:         `CLT-${uuid().slice(0, 8).toUpperCase()}`,
      clientCode,
      agentId:    req.userId ?? '',
      agentName:  req.userName ?? '',
      status:     'active',
      name:       name as string,
      company:    (company as string) ?? '',
      email:      (email as string) ?? '',
      phone:      (phone as string) ?? '',
      address:    (address as string) ?? '',
      notes:      (notes as string) ?? '',
      createdAt:  new Date().toISOString(),
      updatedAt:  new Date().toISOString(),
    }
    await db.send(new PutCommand({ TableName: Tables.clients, Item: item }))
    res.status(201).json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create client' })
  }
})

// PUT /api/clients/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const existing = await db.send(new GetCommand({ TableName: Tables.clients, Key: { id } }))
    if (!existing.Item) { res.status(404).json({ error: 'Client not found' }); return }

    if (req.userRole !== 'Admin' && existing.Item.agentId !== req.userId) {
      res.status(403).json({ error: 'Forbidden' }); return
    }

    const allowed = [
      'name', 'company', 'email', 'phone', 'address', 'notes', 'status',
      ...(req.userRole === 'Admin' ? ['agentId', 'agentName'] : []),
    ]
    const exprParts: string[] = ['#ua = :ua']
    const names: Record<string, string>  = { '#ua': 'updatedAt' }
    const values: Record<string, unknown> = { ':ua': new Date().toISOString() }

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        exprParts.push(`#${key} = :${key}`)
        names[`#${key}`]  = key
        values[`:${key}`] = req.body[key]
      }
    }

    await db.send(new UpdateCommand({
      TableName: Tables.clients,
      Key: { id },
      UpdateExpression: `SET ${exprParts.join(', ')}`,
      ExpressionAttributeNames:  names,
      ExpressionAttributeValues: values,
    }))
    res.json({ ...existing.Item, ...req.body, updatedAt: values[':ua'] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update client' })
  }
})

export default router
