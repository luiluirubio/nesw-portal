import { Router, Response } from 'express'
import { db, Tables, ScanCommand, GetCommand, PutCommand } from '../db/dynamo'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/agents
router.get('/', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await db.send(new ScanCommand({ TableName: Tables.agents }))
    res.json(result.Items ?? [])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch agents' })
  }
})

// GET /api/agents/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.send(new GetCommand({
      TableName: Tables.agents,
      Key: { id: req.params.id },
    }))
    if (!result.Item) { res.status(404).json({ error: 'Agent not found' }); return }
    res.json(result.Item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch agent' })
  }
})

// POST /api/agents — admin only (used by seeder)
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const item = { ...req.body, createdAt: new Date().toISOString() }
    await db.send(new PutCommand({ TableName: Tables.agents, Item: item }))
    res.status(201).json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create agent' })
  }
})

export default router
