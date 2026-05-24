import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { createPublicKey, type JsonWebKey } from 'crypto'
import jwt from 'jsonwebtoken'
import { db, Tables, QueryCommand } from '../db/dynamo'
import { signToken, requireAuth, AuthRequest } from '../middleware/auth'

const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID ?? '982ea7d9-d08d-49b3-a11e-2344474c6ae4'
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID ?? '36aa1fcc-c93f-4637-8bd1-14b92e79a5fb'

async function getUserByEmail(email: string) {
  const result = await db.send(new QueryCommand({
    TableName:                 Tables.users,
    IndexName:                 'ByEmail',
    KeyConditionExpression:    'email = :e',
    ExpressionAttributeValues: { ':e': email.toLowerCase().trim() },
    Limit: 1,
  }))
  return result.Items?.[0] ?? null
}

// Verify an Azure AD ID token using the tenant's JWKS endpoint
async function verifyAzureIdToken(idToken: string): Promise<{ email: string; name: string } | null> {
  try {
    const decoded = jwt.decode(idToken, { complete: true })
    if (!decoded || typeof decoded === 'string') return null
    const { kid } = decoded.header

    const jwksRes = await fetch(
      `https://login.microsoftonline.com/${AZURE_TENANT_ID}/discovery/v2.0/keys`
    )
    if (!jwksRes.ok) return null
    const jwks = await jwksRes.json() as { keys: JsonWebKey[] }

    const jwk = jwks.keys.find(k => k['kid'] === kid)
    if (!jwk) return null

    const pubKey = createPublicKey({ key: jwk, format: 'jwk' })

    const payload = jwt.verify(idToken, pubKey, {
      algorithms: ['RS256'],
      audience: AZURE_CLIENT_ID,
    }) as { email?: string; preferred_username?: string; name?: string }

    const email = (payload.email ?? payload.preferred_username ?? '').toLowerCase().trim()
    if (!email) return null
    return { email, name: payload.name ?? email }
  } catch (err) {
    console.error('Azure token verification failed:', err)
    return null
  }
}

const router = Router()

// POST /api/auth/login — email + password
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' })
      return
    }

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

    const token = signToken({ sub: user.id, email: user.email, role: user.role, name: user.name })
    const { passwordHash: _, ...safeUser } = user
    res.json({ token, user: safeUser })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Login failed' })
  }
})

// POST /api/auth/sso — exchange a verified Azure AD ID token for a backend JWT
router.post('/sso', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body
    if (!idToken) { res.status(400).json({ error: 'idToken is required' }); return }

    const identity = await verifyAzureIdToken(idToken)
    if (!identity) { res.status(401).json({ error: 'Invalid or expired Azure AD token' }); return }

    const user = await getUserByEmail(identity.email)
    if (!user) { res.status(404).json({ error: 'User not found' }); return }
    if (user.status === 'inactive') {
      res.status(403).json({ error: 'Your account has been deactivated. Contact your administrator.' }); return
    }

    const token = signToken({ sub: user.id, email: user.email, role: user.role, name: user.name })
    const { passwordHash: _, ...safeUser } = user
    res.json({ token, user: safeUser })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'SSO login failed' })
  }
})

// GET /api/auth/profile — look up own profile or any user's profile (admin only, requires JWT)
router.get('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  const email = ((req.query.email as string | undefined) ?? req.userEmail ?? '').toLowerCase().trim()
  if (!email) { res.status(400).json({ error: 'email query parameter required' }); return }
  if (req.userRole !== 'Admin' && email !== req.userEmail) {
    res.status(403).json({ error: 'Forbidden' }); return
  }
  try {
    const user = await getUserByEmail(email)
    if (!user) { res.status(404).json({ error: 'User not found' }); return }
    if (user.status === 'inactive') { res.status(403).json({ error: 'Account deactivated' }); return }
    const { passwordHash: _, ...safeUser } = user
    res.json(safeUser)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch profile' })
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
