export type ExpenseCategory =
  | 'marketing'
  | 'commissions'
  | 'office'
  | 'utilities'
  | 'travel'
  | 'maintenance'
  | 'taxes'
  | 'salaries'
  | 'other'

export type PaymentMethod = 'cash' | 'bank' | 'card' | 'check' | 'gcash' | 'other'

export type ExpenseStatus = 'pending' | 'paid' | 'cancelled'

export type ExpenseUsedFor = 'office' | 'project' | 'operations' | 'field' | 'personnel' | 'other'

export interface Expense {
  id:            string
  expenseNo:     string         // e.g. EXP-2026-0001
  date:          string         // ISO yyyy-mm-dd
  category:      ExpenseCategory
  amount:        number
  payeeId?:      string         // links to Payee master data when picked from lookup
  payee:         string         // vendor / who was paid (name)
  paymentMethod: PaymentMethod
  paidToAccount?: string        // account number the expense was sent/paid to
  usedFor:       ExpenseUsedFor  // cost center: what the expense was for
  projectName?:  string         // free text, only when usedFor === 'project'
  status:        ExpenseStatus
  notes:         string
  receiptName?:    string        // original file name
  receiptUrl?:     string        // S3 public URL (large files up to 5MB)
  receiptDataUrl?: string        // legacy inline base64 (older records)
  agentId:       string
  agentName:     string
  createdAt:     string
  updatedAt:     string
}

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  marketing:   'Marketing',
  commissions: 'Commissions',
  office:      'Office / Admin',
  utilities:   'Utilities',
  travel:      'Travel',
  maintenance: 'Maintenance',
  taxes:       'Taxes / Fees',
  salaries:    'Salaries',
  other:       'Other',
}

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash:  'Cash',
  bank:  'Bank Transfer',
  card:  'Card',
  check: 'Check',
  gcash: 'GCash',
  other: 'Other',
}

export const USED_FOR_LABELS: Record<ExpenseUsedFor, string> = {
  office:     'Office',
  project:    'Project',
  operations: 'Operations',
  field:      'Field/Site',
  personnel:  'Personnel',
  other:      'Other',
}
