import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET ?? 'nesw-portal-jwt-secret-staging-2025'

export interface AuthRequest extends Request {
  userId?:    string
  userEmail?: string
  userRole?:  string
  userName?:  string
}

export interface JwtPayload {
  sub:   string
  email: string
  role:  string
  name:  string
  iat?:  number
  exp?:  number
}

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' })
}

export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  // ── JWT token (email/password login) ─────────────────────────────────
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(authHeader.slice(7), JWT_SECRET) as JwtPayload
      req.userId    = payload.sub
      req.userEmail = payload.email
      req.userRole  = payload.role
      req.userName  = payload.name
      return next()
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' })
      return
    }
  }

  // ── M365 SSO fallback — X-Agent-Id header (staging only) ─────────────
  const agentId = req.headers['x-agent-id'] as string
  if (agentId) {
    req.userId    = agentId
    req.userEmail = req.headers['x-agent-email'] as string | undefined
    req.userRole  = 'Agent'
    return next()
  }

  res.status(401).json({ error: 'Authentication required' })
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'Admin') {
    res.status(403).json({ error: 'Admin access required' })
    return
  }
  next()
}
