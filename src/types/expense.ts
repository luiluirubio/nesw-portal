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
  payee:         string         // vendor / who was paid
  paymentMethod: PaymentMethod
  usedFor:       ExpenseUsedFor  // cost center: what the expense was for
  projectName?:  string         // free text, only when usedFor === 'project'
  status:        ExpenseStatus
  notes:         string
  receiptName?:    string        // original file name
  receiptDataUrl?: string        // base64 data URL (image or PDF)
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
