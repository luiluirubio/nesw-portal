import { Router, Response } from 'express'
import { v4 as uuid } from 'uuid'
import { db, Tables, QueryCommand, PutCommand, DeleteCommand, GetCommand } from '../db/dynamo'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/drafts — list all drafts for the authenticated agent
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.userId!
    const result  = await db.send(new QueryCommand({
      TableName:                 Tables.drafts,
      KeyConditionExpression:    'agentId = :a',
      ExpressionAttributeValues: { ':a': agentId },
    }))
    const items = (result.Items ?? []).sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    )
    res.json(items)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch drafts' })
  }
})

// GET /api/drafts/:id — get a single draft
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.send(new GetCommand({
      TableName: Tables.drafts,
      Key: { agentId: req.userId!, id: req.params.id },
    }))
    if (!result.Item) { res.status(404).json({ error: 'Draft not found' }); return }
    res.json(result.Item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch draft' })
  }
})

// POST /api/drafts — upsert (create or update) a draft
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.userId!
    const body    = req.body

    const item = {
      ...body,
      agentId,
      id:      body.id ?? uuid(),
      savedAt: new Date().toISOString(),
    }

    await db.send(new PutCommand({ TableName: Tables.drafts, Item: item }))
    res.status(200).json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to save draft' })
  }
})

// DELETE /api/drafts/:id — discard a draft
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await db.send(new DeleteCommand({
      TableName: Tables.drafts,
      Key: { agentId: req.userId!, id: req.params.id },
    }))
    res.status(204).send()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete draft' })
  }
})

export default router
