import { api } from '@/lib/api'
import type { Expense } from '@/types/expense'

// ── localStorage-backed expense store ────────────────────────────────────────
// Per product decision, expense records are stored client-side in localStorage
// (no backend yet). The public API below mirrors the shape of a future
// `/api/expenses` so it can be swapped for a backend with minimal changes.
//
// Receipt FILES are uploaded to S3 (via the existing presign route) and only the
// public URL is kept on the record — this keeps large receipts out of the ~5MB
// localStorage quota and allows attachments up to 5MB.

const LS_KEY = 'nesw_expenses'

export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024 // 5MB

// Upload a receipt file to S3 and return its public URL.
export async function uploadReceipt(file: File): Promise<string> {
  const fileType = file.type || 'application/octet-stream'
  const { url, publicUrl } = await api.presign({ fileName: file.name, fileType })
  const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': fileType }, body: file })
  if (!res.ok) throw new Error('Failed to upload receipt')
  return publicUrl
}

export function loadExpenses(): Expense[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as Expense[]) : []
  } catch {
    return []
  }
}

export function saveExpenses(list: Expense[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(list))
}

// EXP-<year>-<zero-padded running count within that year>
function nextExpenseNo(list: Expense[], date: string): string {
  const year = (date || new Date().toISOString()).slice(0, 4)
  const countThisYear = list.filter(e => e.expenseNo.startsWith(`EXP-${year}-`)).length
  return `EXP-${year}-${String(countThisYear + 1).padStart(4, '0')}`
}

export type ExpenseInput = Omit<
  Expense,
  'id' | 'expenseNo' | 'createdAt' | 'updatedAt'
>

export function createExpense(input: ExpenseInput): Expense {
  const list = loadExpenses()
  const now = new Date().toISOString()
  const expense: Expense = {
    ...input,
    id:        crypto.randomUUID(),
    expenseNo: nextExpenseNo(list, input.date),
    createdAt: now,
    updatedAt: now,
  }
  saveExpenses([expense, ...list])
  return expense
}

export function updateExpense(id: string, patch: Partial<ExpenseInput>): Expense | null {
  const list = loadExpenses()
  let updated: Expense | null = null
  const next = list.map(e => {
    if (e.id !== id) return e
    updated = { ...e, ...patch, updatedAt: new Date().toISOString() }
    return updated
  })
  if (updated) saveExpenses(next)
  return updated
}

export function deleteExpense(id: string): void {
  saveExpenses(loadExpenses().filter(e => e.id !== id))
}
