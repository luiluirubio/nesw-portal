import type { Expense } from '@/types/expense'

// ── localStorage-backed expense store ────────────────────────────────────────
// Per product decision, expenses are stored client-side in localStorage (no
// backend yet). The public API below mirrors the shape of a future
// `/api/expenses` so it can be swapped for a backend with minimal changes.

const LS_KEY = 'nesw_expenses'

// Receipts are inlined as base64 data URLs on the record. localStorage is
// capped at ~5MB total per origin, so we limit a single receipt to keep the
// store from overflowing. A backend swap later removes this cap.
export const MAX_RECEIPT_BYTES = 1024 * 1024 // 1MB

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
