import { Router, Response, Request } from 'express'
import { v4 as uuid } from 'uuid'
import { db, Tables, ScanCommand, GetCommand, PutCommand, UpdateCommand } from '../db/dynamo'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

const BILLING_BASE = 9000000

async function nextBillingNo(): Promise<string> {
  const result = await db.send(new ScanCommand({ TableName: Tables.billings, ProjectionExpression: 'billingNo' }))
  const max = (result.Items ?? [])
    .map(i => parseInt(i.billingNo as string, 10))
    .filter(n => !isNaN(n) && n >= BILLING_BASE && n < BILLING_BASE + 1_000_000)
    .reduce((acc, n) => n > acc ? n : acc, BILLING_BASE)
  return String(max + 1)
}

// Create Xendit QR Ph payment — returns { qrId, qrString } or null on failure
async function createXenditQR(billingNo: string, amount: number): Promise<{ qrId: string; qrString: string } | null> {
  const secret = process.env.XENDIT_SECRET_KEY
  if (!secret) return null

  try {
    const body = {
      reference_id: `billing-${billingNo}`,
      type:         'DYNAMIC',
      currency:     'PHP',
      amount:       Math.round(amount * 100) / 100,
      expires_at:   new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    }
    const res = await fetch('https://api.xendit.co/qr_codes', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Basic ${Buffer.from(`${secret}:`).toString('base64')}`,
        'api-version':   '2022-07-31',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      console.error('Xendit QR error:', res.status, await res.text())
      return null
    }
    const data = await res.json() as { id: string; qr_string: string }
    return { qrId: data.id, qrString: data.qr_string }
  } catch (err) {
    console.error('Xendit QR exception:', err)
    return null
  }
}

// POST /api/billing/xendit-webhook — Xendit payment callback (no auth required)
router.post('/xendit-webhook', async (req: Request, res: Response) => {
  try {
    // Xendit sends X-CALLBACK-TOKEN header for verification
    const token = req.headers['x-callback-token']
    if (process.env.XENDIT_WEBHOOK_TOKEN && token !== process.env.XENDIT_WEBHOOK_TOKEN) {
      res.status(401).json({ error: 'Invalid callback token' }); return
    }

    const event = req.body
    // QR payment completion event
    if (event?.event === 'qr.payment' && event?.data?.qr_id) {
      const qrId    = event.data.qr_id as string
      const status  = event.data.status === 'COMPLETED' ? 'paid' : 'unpaid'

      // Find billing by paymentQrId
      const scan = await db.send(new ScanCommand({
        TableName:        Tables.billings,
        FilterExpression: 'paymentQrId = :qrId',
        ExpressionAttributeValues: { ':qrId': qrId },
      }))
      const billing = scan.Items?.[0]
      if (billing) {
        await db.send(new UpdateCommand({
          TableName: Tables.billings,
          Key: { id: billing.id },
          UpdateExpression: 'SET paymentStatus = :s, #ua = :ua',
          ExpressionAttributeNames:  { '#ua': 'updatedAt' },
          ExpressionAttributeValues: { ':s': status, ':ua': new Date().toISOString() },
        }))
        // Also mark billing status as paid
        if (status === 'paid') {
          await db.send(new UpdateCommand({
            TableName: Tables.billings,
            Key: { id: billing.id },
            UpdateExpression: 'SET #st = :st',
            ExpressionAttributeNames:  { '#st': 'status' },
            ExpressionAttributeValues: { ':st': 'paid' },
          }))
        }
      }
    }
    res.json({ received: true })
  } catch (err) {
    console.error('Xendit webhook error:', err)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

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
      bookingId, bookingNo, proposalId, proposalNo, clientId, clientCode,
    } = req.body

    if (!clientName || !items?.length) {
      res.status(400).json({ error: 'clientName and items are required' }); return
    }
    if (!bookingId) {
      res.status(400).json({ error: 'bookingId is required' }); return
    }

    const billingNo = await nextBillingNo()

    // Create Xendit QR (graceful — does not block billing creation)
    const qr = await createXenditQR(billingNo, Number(total ?? 0))

    const item = {
      id:              `BILL-${uuid().slice(0, 8).toUpperCase()}`,
      billingNo,
      agentId:         req.userId ?? '',
      agentName:       req.userName ?? '',
      status:          'draft',
      bookingId:       (bookingId as string)      ?? '',
      bookingNo:       (bookingNo as string)      ?? '',
      proposalId:      (proposalId as string)     ?? '',
      proposalNo:      (proposalNo as string)     ?? '',
      clientId:        (clientId as string)       ?? '',
      clientCode:      (clientCode as string)     ?? '',
      clientName:      clientName as string,
      clientCompany:   (clientCompany as string)  ?? '',
      clientAddress:   (clientAddress as string)  ?? '',
      servicePurpose:  (servicePurpose as string) ?? '',
      items:           items ?? [],
      discount:        Number(discount ?? 0),
      subtotal:        Number(subtotal ?? 0),
      total:           Number(total ?? 0),
      terms:           (terms as string) ?? '',
      dateIssued:      (dateIssued as string) ?? new Date().toISOString().slice(0, 10),
      createdAt:       new Date().toISOString(),
      updatedAt:       new Date().toISOString(),
      ...(qr ? { paymentQrId: qr.qrId, paymentQrString: qr.qrString, paymentStatus: 'unpaid' } : {}),
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
      'bookingId', 'bookingNo', 'clientId', 'clientCode', 'paymentStatus',
      ...(req.userRole === 'Admin' ? ['agentId', 'agentName'] : []),
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
