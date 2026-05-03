import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { db, Tables, QueryCommand } from '../db/dynamo'
import { signToken } from '../middleware/auth'

const router = Router()

// POST /api/auth/login — email + password
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' })
      return
    }

    // Find user by email (GSI)
    const result = await db.send(new QueryCommand({
      TableName:                 Tables.users,
      IndexName:                 'ByEmail',
      KeyConditionExpression:    'email = :e',
      ExpressionAttributeValues: { ':e': email.toLowerCase().trim() },
      Limit: 1,
    }))

    const user = result.Items?.[0]
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' })
      return
    }

    if (user.status === 'inactive') {
      res.status(403).json({ error: 'Your account has been deactivated. Contact your administrator.' })
      return
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' })
      return
    }

    const token = signToken({
      sub:   user.id,
      email: user.email,
      role:  user.role,
      name:  user.name,
    })

    // Return token + safe user object (no passwordHash)
    const { passwordHash: _, ...safeUser } = user
    res.json({ token, user: safeUser })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Login failed' })
  }
})

// GET /api/auth/me — verify token + return user info
router.get('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' })
    return
  }
  try {
    const { verifyJwt } = await import('../middleware/auth')
    const payload = verifyJwt(authHeader.slice(7))
    res.json(payload)
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
})

export default router
