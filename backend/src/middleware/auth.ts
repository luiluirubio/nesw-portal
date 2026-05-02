import { Request, Response, NextFunction } from 'express'
import { CognitoJwtVerifier } from 'aws-jwt-verify'

const verifier = process.env.COGNITO_USER_POOL_ID
  ? CognitoJwtVerifier.create({
      userPoolId: process.env.COGNITO_USER_POOL_ID,
      tokenUse: 'access',
      clientId: process.env.COGNITO_CLIENT_ID ?? null,
    })
  : null

export interface AuthRequest extends Request {
  userId?: string
  userEmail?: string
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  // In development (no Cognito configured) allow all requests
  if (!verifier) {
    req.userId = req.headers['x-dev-user-id'] as string ?? 'AGT-001'
    return next()
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Bearer token' })
    return
  }

  try {
    const payload = await verifier.verify(authHeader.slice(7))
    req.userId    = payload.sub
    req.userEmail = payload.email as string | undefined
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
