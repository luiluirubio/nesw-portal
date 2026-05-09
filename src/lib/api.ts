import type { ListingDraft } from '@/types/draft'

const BASE = import.meta.env.VITE_API_URL ?? ''

// Agent context set once after MSAL login
let _agentId    = ''
let _agentEmail = ''

export function setApiAgent(id: string, email: string) {
  _agentId    = id
  _agentEmail = email
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('nesw_token')

  // Only send X-Agent-Id when there is no JWT token (M365 SSO path only)
  const agentHeaders: Record<string, string> = (!token && _agentId)
    ? { 'X-Agent-Id': _agentId, ...(_agentEmail ? { 'X-Agent-Email': _agentEmail } : {}) }
    : {}

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : agentHeaders),
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  // Properties
  getProperties:  ()                  => request<unknown[]>('/api/properties'),
  getProperty:    (id: string)        => request<unknown>(`/api/properties/${id}`),
  createProperty: (body: unknown)     => request<unknown>('/api/properties', { method: 'POST', body: JSON.stringify(body) }),
  updateProperty: (id: string, body: unknown) => request<unknown>(`/api/properties/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProperty: (id: string)        => request<void>(`/api/properties/${id}`, { method: 'DELETE' }),

  // Agents
  getAgents: () => request<unknown[]>('/api/agents'),

  // Activity logs
  getLogs:   ()           => request<unknown[]>('/api/logs'),
  createLog: (body: unknown) => request<unknown>('/api/logs', { method: 'POST', body: JSON.stringify(body) }),

  // Login history
  getLoginHistory: (agentId?: string) =>
    request<unknown[]>(`/api/logs/login${agentId ? `?agentId=${agentId}` : ''}`),
  recordLogin: (body: unknown) =>
    request<unknown>('/api/logs/login', { method: 'POST', body: JSON.stringify(body) }),

  // Drafts
  getDrafts:   ()                     => request<ListingDraft[]>('/api/drafts'),
  getDraft:    (id: string)           => request<ListingDraft>(`/api/drafts/${id}`),
  saveDraft:   (body: Partial<ListingDraft>) => request<ListingDraft>('/api/drafts', { method: 'POST', body: JSON.stringify(body) }),
  deleteDraft: (id: string)           => request<void>(`/api/drafts/${id}`, { method: 'DELETE' }),

  // File upload
  presign: (body: { fileName: string; fileType: string; propertyId?: string }) =>
    request<{ url: string; key: string; publicUrl: string }>('/api/upload/presign', {
      method: 'POST', body: JSON.stringify(body),
    }),

  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; user: Record<string, unknown> }>('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),

  // Users (admin)
  getUsers:     ()                          => request<unknown[]>('/api/users'),
  getUser:      (id: string)               => request<unknown>(`/api/users/${id}`),
  createUser:   (body: unknown)            => request<unknown>('/api/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser:   (id: string, body: unknown) => request<unknown>(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  setUserStatus:(id: string, status: 'active' | 'inactive') =>
    request<unknown>(`/api/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Services
  getServices:   (activeOnly?: boolean) => request<unknown[]>(`/api/services${activeOnly ? '?status=active' : ''}`),
  createService: (body: unknown)         => request<unknown>('/api/services', { method: 'POST', body: JSON.stringify(body) }),
  updateService: (id: string, body: unknown) => request<unknown>(`/api/services/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  toggleService: (id: string)            => request<unknown>(`/api/services/${id}/toggle`, { method: 'PUT' }),

  // Proposals
  getProposals:   ()                          => request<unknown[]>('/api/proposals'),
  getProposal:    (id: string)               => request<unknown>(`/api/proposals/${id}`),
  createProposal: (body: unknown)            => request<unknown>('/api/proposals', { method: 'POST', body: JSON.stringify(body) }),
  updateProposal: (id: string, body: unknown) => request<unknown>(`/api/proposals/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  // Billing
  getBillings:   ()                          => request<unknown[]>('/api/billing'),
  getBilling:    (id: string)               => request<unknown>(`/api/billing/${id}`),
  createBilling: (body: unknown)            => request<unknown>('/api/billing', { method: 'POST', body: JSON.stringify(body) }),
  updateBilling: (id: string, body: unknown) => request<unknown>(`/api/billing/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  // Health
  health: () => request<{ status: string; stage: string; ts: string }>('/api/health'),
}
