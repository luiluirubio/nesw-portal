import { Router, Response } from 'express'
import { v4 as uuid } from 'uuid'
import { db, Tables, ScanCommand, GetCommand, PutCommand, UpdateCommand } from '../db/dynamo'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

async function nextBillingNo(): Promise<string> {
  const year = new Date().getFullYear()
  const result = await db.send(new ScanCommand({ TableName: Tables.billings, ProjectionExpression: 'billingNo' }))
  const existing = (result.Items ?? [])
    .map(i => i.billingNo as string)
    .filter(n => n?.startsWith(`BILL-${year}-`))
  const max = existing.reduce((acc, n) => {
    const num = parseInt(n.split('-')[2] ?? '0', 10)
    return num > acc ? num : acc
  }, 0)
  return `BILL-${year}-${String(max + 1).padStart(3, '0')}`
}

// GET /api/billing — all (admin) or own (agent)
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.send(new ScanCommand({ TableName: Tables.billings }))
    let items = (result.Items ?? []).sort(
      (a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
    )
    if (req.userRole !== 'Admin') {
      items = items.filter(i => i.agentId === req.userId)
    }
    res.json(items)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch billings' })
  }
})

// GET /api/billing/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.send(new GetCommand({ TableName: Tables.billings, Key: { id: req.params.id } }))
    if (!result.Item) { res.status(404).json({ error: 'Billing not found' }); return }
    res.json(result.Item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch billing' })
  }
})

// POST /api/billing — create
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      clientName, clientCompany, clientAddress, servicePurpose,
      items, discount, subtotal, total, terms, dateIssued,
      proposalId, proposalNo,
    } = req.body

    if (!clientName || !items?.length) {
      res.status(400).json({ error: 'clientName and items are required' }); return
    }

    const billingNo = await nextBillingNo()
    const item = {
      id:             `BILL-${uuid().slice(0, 8).toUpperCase()}`,
      billingNo,
      agentId:        req.userId ?? '',
      agentName:      req.userName ?? '',
      status:         'draft',
      proposalId:     (proposalId as string) ?? '',
      proposalNo:     (proposalNo as string) ?? '',
      clientName:     clientName as string,
      clientCompany:  (clientCompany as string) ?? '',
      clientAddress:  (clientAddress as string) ?? '',
      servicePurpose: (servicePurpose as string) ?? '',
      items:          items ?? [],
      discount:       Number(discount ?? 0),
      subtotal:       Number(subtotal ?? 0),
      total:          Number(total ?? 0),
      terms:          (terms as string) ?? '',
      dateIssued:     (dateIssued as string) ?? new Date().toISOString().slice(0, 10),
      createdAt:      new Date().toISOString(),
      updatedAt:      new Date().toISOString(),
    }
    await db.send(new PutCommand({ TableName: Tables.billings, Item: item }))
    res.status(201).json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create billing' })
  }
})

// PUT /api/billing/:id — update
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const existing = await db.send(new GetCommand({ TableName: Tables.billings, Key: { id } }))
    if (!existing.Item) { res.status(404).json({ error: 'Billing not found' }); return }

    if (req.userRole !== 'Admin' && existing.Item.agentId !== req.userId) {
      res.status(403).json({ error: 'Forbidden' }); return
    }

    const allowed = [
      'status', 'clientName', 'clientCompany', 'clientAddress', 'servicePurpose',
      'items', 'discount', 'subtotal', 'total', 'terms', 'dateIssued',
    ]
    const exprParts: string[] = ['#ua = :ua']
    const names: Record<string, string>  = { '#ua': 'updatedAt' }
    const values: Record<string, unknown> = { ':ua': new Date().toISOString() }

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        exprParts.push(`#${key} = :${key}`)
        names[`#${key}`]  = key
        values[`:${key}`] = ['discount', 'subtotal', 'total'].includes(key)
          ? Number(req.body[key])
          : req.body[key]
      }
    }

    await db.send(new UpdateCommand({
      TableName: Tables.billings,
      Key: { id },
      UpdateExpression: `SET ${exprParts.join(', ')}`,
      ExpressionAttributeNames:  names,
      ExpressionAttributeValues: values,
    }))
    res.json({ ...existing.Item, ...req.body, updatedAt: values[':ua'] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update billing' })
  }
})

export default router
