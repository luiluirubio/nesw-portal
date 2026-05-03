import { Router, Response } from 'express'
import { v4 as uuid } from 'uuid'
import bcrypt from 'bcryptjs'
import { db, Tables, ScanCommand, GetCommand, PutCommand, UpdateCommand, QueryCommand } from '../db/dynamo'
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/users — list all users (admin only)
router.get('/', requireAuth, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await db.send(new ScanCommand({
      TableName:            Tables.users,
      ProjectionExpression: 'id, #n, email, #r, branch, licenseNo, #s, createdAt, lastLoginAt',
      ExpressionAttributeNames: { '#n': 'name', '#r': 'role', '#s': 'status' },
    }))
    const users = (result.Items ?? []).sort(
      (a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
    )
    res.json(users)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// GET /api/users/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.send(new GetCommand({
      TableName:            Tables.users,
      Key:                  { id: req.params.id },
      ProjectionExpression: 'id, #n, email, #r, branch, licenseNo, #s, createdAt, lastLoginAt',
      ExpressionAttributeNames: { '#n': 'name', '#r': 'role', '#s': 'status' },
    }))
    if (!result.Item) { res.status(404).json({ error: 'User not found' }); return }
    res.json(result.Item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

// POST /api/users — create user (admin only)
router.post('/', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, role, branch, licenseNo } = req.body
    if (!name || !email || !password || !role) {
      res.status(400).json({ error: 'name, email, password and role are required' })
      return
    }

    // Check email uniqueness
    const existing = await db.send(new QueryCommand({
      TableName:                 Tables.users,
      IndexName:                 'ByEmail',
      KeyConditionExpression:    'email = :e',
      ExpressionAttributeValues: { ':e': email.toLowerCase().trim() },
      Limit: 1,
    }))
    if (existing.Items?.length) {
      res.status(409).json({ error: 'A user with this email already exists' })
      return
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const item = {
      id:           uuid(),
      name:         name.trim(),
      email:        email.toLowerCase().trim(),
      passwordHash,
      role,
      branch:       branch ?? 'Headquarters',
      licenseNo:    licenseNo ?? '',
      status:       'active',
      createdAt:    new Date().toISOString(),
      createdBy:    req.userId,
    }

    await db.send(new PutCommand({ TableName: Tables.users, Item: item }))
    const { passwordHash: _, ...safeItem } = item
    res.status(201).json(safeItem)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create user' })
  }
})

// PUT /api/users/:id — update user info or password (admin only)
router.put('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, role, branch, licenseNo, status, password } = req.body
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }

    if (name)      updates['#n']  = name.trim()
    if (role)      updates['#r']  = role
    if (branch)    updates.branch = branch
    if (licenseNo !== undefined) updates.licenseNo = licenseNo
    if (status)    updates['#s']  = status
    if (password)  updates.passwordHash = await bcrypt.hash(password, 10)

    const setExpr: string[]              = []
    const names:   Record<string, string>  = { '#n': 'name', '#r': 'role', '#s': 'status' }
    const values:  Record<string, unknown> = {}

    Object.entries(updates).forEach(([k, v]) => {
      const vk = `:${k.replace('#','')}`
      setExpr.push(`${k} = ${vk}`)
      values[vk] = v
    })

    await db.send(new UpdateCommand({
      TableName:                 Tables.users,
      Key:                       { id: req.params.id },
      UpdateExpression:          `SET ${setExpr.join(', ')}`,
      ExpressionAttributeNames:  names,
      ExpressionAttributeValues: values,
    }))

    res.json({ id: req.params.id, updated: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update user' })
  }
})

// PATCH /api/users/:id/status — activate or deactivate (admin only)
router.patch('/:id/status', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body
    if (!['active', 'inactive'].includes(status)) {
      res.status(400).json({ error: 'status must be active or inactive' })
      return
    }
    await db.send(new UpdateCommand({
      TableName:                 Tables.users,
      Key:                       { id: req.params.id },
      UpdateExpression:          'SET #s = :s, updatedAt = :u',
      ExpressionAttributeNames:  { '#s': 'status' },
      ExpressionAttributeValues: { ':s': status, ':u': new Date().toISOString() },
    }))
    res.json({ id: req.params.id, status })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update status' })
  }
})

export default router
