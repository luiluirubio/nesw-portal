import { Router, Response } from 'express'
import { v4 as uuid } from 'uuid'
import { db, Tables, ScanCommand, GetCommand, PutCommand, UpdateCommand } from '../db/dynamo'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

const PROPOSAL_BASE = 6000000

async function nextProposalNo(): Promise<string> {
  const result = await db.send(new ScanCommand({ TableName: Tables.proposals, ProjectionExpression: 'proposalNo' }))
  const max = (result.Items ?? [])
    .map(i => parseInt(i.proposalNo as string, 10))
    .filter(n => !isNaN(n) && n >= PROPOSAL_BASE && n < PROPOSAL_BASE + 1_000_000)
    .reduce((acc, n) => n > acc ? n : acc, PROPOSAL_BASE)
  return String(max + 1)
}

// GET /api/proposals — all (admin) or by agentId
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.send(new ScanCommand({ TableName: Tables.proposals }))
    let items = (result.Items ?? []).sort(
      (a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
    )
    if (req.userRole !== 'Admin') {
      items = items.filter(i => i.agentId === req.userId)
    }
    res.json(items)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch proposals' })
  }
})

// GET /api/proposals/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.send(new GetCommand({ TableName: Tables.proposals, Key: { id: req.params.id } }))
    if (!result.Item) { res.status(404).json({ error: 'Proposal not found' }); return }
    res.json(result.Item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch proposal' })
  }
})

// POST /api/proposals — create
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      clientName, clientCompany, clientEmail, clientPhone, clientAddress, clientNotes,
      services, discount, validityDays, terms, subtotal, total,
      clientId, clientCode,
    } = req.body

    if (!clientName || !services?.length) {
      res.status(400).json({ error: 'clientName and services are required' }); return
    }

    const proposalNo = await nextProposalNo()
    const item = {
      id:            `QUOT-${uuid().slice(0, 8).toUpperCase()}`,
      proposalNo,
      agentId:       req.userId ?? '',
      agentName:     req.userName ?? '',
      status:        'draft',
      clientName:    clientName as string,
      clientCompany: (clientCompany as string) ?? '',
      clientEmail:   (clientEmail as string) ?? '',
      clientPhone:   (clientPhone as string) ?? '',
      clientAddress: (clientAddress as string) ?? '',
      clientNotes:   (clientNotes as string) ?? '',
      clientId:      (clientId as string)    ?? '',
      clientCode:    (clientCode as string)  ?? '',
      services:      services ?? [],
      discount:      Number(discount ?? 0),
      validityDays:  Number(validityDays ?? 30),
      terms:         (terms as string) ?? '',
      subtotal:      Number(subtotal ?? 0),
      total:         Number(total ?? 0),
      createdAt:     new Date().toISOString(),
      updatedAt:     new Date().toISOString(),
    }
    await db.send(new PutCommand({ TableName: Tables.proposals, Item: item }))
    res.status(201).json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create proposal' })
  }
})

// PUT /api/proposals/:id — update
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const existing = await db.send(new GetCommand({ TableName: Tables.proposals, Key: { id } }))
    if (!existing.Item) { res.status(404).json({ error: 'Proposal not found' }); return }

    const allowed = [
      'status', 'clientName', 'clientCompany', 'clientEmail', 'clientPhone',
      'clientAddress', 'clientNotes', 'services', 'discount', 'validityDays',
      'terms', 'subtotal', 'total', 'clientId', 'clientCode',
      ...(req.userRole === 'Admin' ? ['agentId', 'agentName'] : []),
    ]
    const exprParts: string[] = ['#ua = :ua']
    const names: Record<string, string>  = { '#ua': 'updatedAt' }
    const values: Record<string, unknown> = { ':ua': new Date().toISOString() }

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        exprParts.push(`#${key} = :${key}`)
        names[`#${key}`]  = key
        values[`:${key}`] = ['discount', 'validityDays', 'subtotal', 'total'].includes(key)
          ? Number(req.body[key])
          : req.body[key]
      }
    }

    await db.send(new UpdateCommand({
      TableName: Tables.proposals,
      Key: { id },
      UpdateExpression: `SET ${exprParts.join(', ')}`,
      ExpressionAttributeNames:  names,
      ExpressionAttributeValues: values,
    }))
    res.json({ ...existing.Item, ...req.body, updatedAt: values[':ua'] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update proposal' })
  }
})

export default router
