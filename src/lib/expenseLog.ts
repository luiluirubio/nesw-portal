import { CATEGORY_LABELS, METHOD_LABELS, USED_FOR_LABELS, type Expense } from '@/types/expense'
import { formatPHP } from '@/lib/utils'
import type { FieldChange } from '@/types/activityLog'

// Render a single expense field as a human-readable string for the audit log.
function fmt(e: Partial<Expense>, key: keyof Expense): string {
  const v = e[key]
  if (v === undefined || v === null || v === '') return '—'
  switch (key) {
    case 'amount':        return formatPHP(Number(v) || 0)
    case 'category':      return CATEGORY_LABELS[v as Expense['category']] ?? String(v)
    case 'paymentMethod': return METHOD_LABELS[v as Expense['paymentMethod']] ?? String(v)
    case 'usedFor':       return USED_FOR_LABELS[v as Expense['usedFor']] ?? String(v)
    case 'status':        return String(v).charAt(0).toUpperCase() + String(v).slice(1)
    default:              return String(v)
  }
}

// Fields tracked in the audit trail, with friendly labels.
const TRACKED: { key: keyof Expense; label: string }[] = [
  { key: 'status',         label: 'Status' },
  { key: 'amount',         label: 'Amount' },
  { key: 'date',           label: 'Date' },
  { key: 'category',       label: 'Category' },
  { key: 'paymentMethod',  label: 'Payment Method' },
  { key: 'paidToAccount',  label: 'Account No. (paid to)' },
  { key: 'usedFor',        label: 'Used For' },
  { key: 'projectName',    label: 'Project Name' },
  { key: 'payee',          label: 'Payee' },
  { key: 'notes',          label: 'Notes' },
  { key: 'receiptName',    label: 'Receipt' },
]

// Compute the list of changed fields between an existing expense and the next state.
export function diffExpense(before: Expense, after: Partial<Expense>): FieldChange[] {
  const changes: FieldChange[] = []
  for (const { key, label } of TRACKED) {
    if (after[key] === undefined) continue       // field not part of this update
    const oldVal = fmt(before, key)
    const newVal = fmt(after, key)
    if (oldVal !== newVal) changes.push({ field: label, oldValue: oldVal, newValue: newVal })
  }
  return changes
}
