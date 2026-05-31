import { api } from '@/lib/api'
import type { Payee } from '@/types/payee'

// ── localStorage-backed Payee (vendor) master data ───────────────────────────
// Mirrors the shape of the Clients master data but stored client-side, matching
// the Expenses module's localStorage decision. Payees are created from inside
// the expense form's Payee Details step (there is no "Add Payee" on the Payees
// page); the lookup then reuses them.

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

// PAY-<year>-<zero-padded running count within that year>
function nextAccountNumber(list: Payee[]): string {
  const year = new Date().getFullYear()
  const countThisYear = list.filter(p => p.accountNumber?.startsWith(`PAY-${year}-`)).length
  return `PAY-${year}-${String(countThisYear + 1).padStart(4, '0')}`
}

export type PayeeInput = Omit<Payee, 'id' | 'accountNumber' | 'createdAt' | 'updatedAt'> & {
  // payeeType is required on the input even though older stored records may lack it
  payeeType: Payee['payeeType']
}

export function createPayee(input: PayeeInput): Payee {
  const list = loadPayees()
  const now = new Date().toISOString()
  const payee: Payee = {
    ...input,
    id:            crypto.randomUUID(),
    accountNumber: nextAccountNumber(list),
    createdAt:     now,
    updatedAt:     now,
  }
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

// Upload an attached ID to S3 and return its public URL.
export async function uploadPayeeId(file: File): Promise<string> {
  const fileType = file.type || 'application/octet-stream'
  const { url, publicUrl } = await api.presign({ fileName: file.name, fileType })
  const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': fileType }, body: file })
  if (!res.ok) throw new Error('Failed to upload ID')
  return publicUrl
}
