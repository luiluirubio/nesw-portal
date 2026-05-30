import type { Payee } from '@/types/payee'

// ── localStorage-backed Payee (vendor) master data ───────────────────────────
// Mirrors the shape of the Clients master data but stored client-side, matching
// the Expenses module's localStorage decision. The lookup auto-grows: typing a
// new payee on an expense upserts it here for next time.

const LS_KEY = 'nesw_payees'

export function loadPayees(): Payee[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    const list = raw ? (JSON.parse(raw) as Payee[]) : []
    return list.sort((a, b) => a.name.localeCompare(b.name))
  } catch {
    return []
  }
}

export function savePayees(list: Payee[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(list))
}

export type PayeeInput = Omit<Payee, 'id' | 'createdAt' | 'updatedAt'>

export function createPayee(input: PayeeInput): Payee {
  const list = loadPayees()
  const now = new Date().toISOString()
  const payee: Payee = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
  savePayees([payee, ...list])
  return payee
}

export function updatePayee(id: string, patch: Partial<PayeeInput>): Payee | null {
  const list = loadPayees()
  let updated: Payee | null = null
  const next = list.map(p => {
    if (p.id !== id) return p
    updated = { ...p, ...patch, updatedAt: new Date().toISOString() }
    return updated
  })
  if (updated) savePayees(next)
  return updated
}

export function deletePayee(id: string): void {
  savePayees(loadPayees().filter(p => p.id !== id))
}

// Find an existing payee by (case-insensitive) name, or create one. Used by the
// expense form so manually-typed payees become reusable master data.
export function upsertPayeeByName(name: string): Payee {
  const trimmed = name.trim()
  const existing = loadPayees().find(p => p.name.toLowerCase() === trimmed.toLowerCase())
  if (existing) return existing
  return createPayee({ name: trimmed, status: 'active' })
}
