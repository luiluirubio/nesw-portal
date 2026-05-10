import { Router, Response } from 'express'
import { v4 as uuid } from 'uuid'
import { db, Tables, ScanCommand, GetCommand, PutCommand, UpdateCommand } from '../db/dynamo'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

async function nextBookingNo(): Promise<string> {
  const year = new Date().getFullYear()
  const result = await db.send(new ScanCommand({ TableName: Tables.bookings, ProjectionExpression: 'bookingNo' }))
  const existing = (result.Items ?? [])
    .map(i => i.bookingNo as string)
    .filter(n => n?.startsWith(`BKG-${year}-`))
  const max = existing.reduce((acc, n) => {
    const num = parseInt(n.split('-')[2] ?? '0', 10)
    return num > acc ? num : acc
  }, 0)
  return `BKG-${year}-${String(max + 1).padStart(3, '0')}`
}

// GET /api/bookings
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.send(new ScanCommand({ TableName: Tables.bookings }))
    let items = (result.Items ?? []).sort(
      (a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
    )
    if (req.userRole !== 'Admin') items = items.filter(i => i.agentId === req.userId)
    res.json(items)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch bookings' })
  }
})

// GET /api/bookings/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.send(new GetCommand({ TableName: Tables.bookings, Key: { id: req.params.id } }))
    if (!result.Item) { res.status(404).json({ error: 'Booking not found' }); return }
    res.json(result.Item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch booking' })
  }
})

// POST /api/bookings
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      proposalId, proposalNo, clientName, clientCompany, clientEmail,
      clientPhone, clientAddress, scopeNotes, services, totalAmount,
      startDate, notes,
    } = req.body

    if (!clientName) { res.status(400).json({ error: 'clientName is required' }); return }

    const bookingNo = await nextBookingNo()
    const item = {
      id:            `BKG-${uuid().slice(0, 8).toUpperCase()}`,
      bookingNo,
      agentId:       req.userId ?? '',
      agentName:     req.userName ?? '',
      status:        'active',
      proposalId:    (proposalId as string) ?? '',
      proposalNo:    (proposalNo as string) ?? '',
      clientName:    clientName as string,
      clientCompany: (clientCompany as string) ?? '',
      clientEmail:   (clientEmail as string) ?? '',
      clientPhone:   (clientPhone as string) ?? '',
      clientAddress: (clientAddress as string) ?? '',
      scopeNotes:    (scopeNotes as string) ?? '',
      services:      services ?? [],
      totalAmount:   Number(totalAmount ?? 0),
      startDate:     (startDate as string) ?? new Date().toISOString().slice(0, 10),
      notes:         (notes as string) ?? '',
      createdAt:     new Date().toISOString(),
      updatedAt:     new Date().toISOString(),
    }
    await db.send(new PutCommand({ TableName: Tables.bookings, Item: item }))
    res.status(201).json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create booking' })
  }
})

// PUT /api/bookings/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const existing = await db.send(new GetCommand({ TableName: Tables.bookings, Key: { id } }))
    if (!existing.Item) { res.status(404).json({ error: 'Booking not found' }); return }

    if (req.userRole !== 'Admin' && existing.Item.agentId !== req.userId) {
      res.status(403).json({ error: 'Forbidden' }); return
    }

    const allowed = [
      'status', 'scopeNotes', 'notes', 'startDate',
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
      TableName: Tables.bookings,
      Key: { id },
      UpdateExpression: `SET ${exprParts.join(', ')}`,
      ExpressionAttributeNames:  names,
      ExpressionAttributeValues: values,
    }))
    res.json({ ...existing.Item, ...req.body, updatedAt: values[':ua'] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update booking' })
  }
})

export default router
