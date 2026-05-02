export type LoginMethod = 'microsoft_sso' | 'manual'

export interface LoginRecord {
  id: string
  agentId: string
  timestamp: string
  method: LoginMethod
  sessionId: string
  ipAddress: string
  userAgent: string
}
