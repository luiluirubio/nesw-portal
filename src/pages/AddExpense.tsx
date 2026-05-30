import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, ArrowLeft, Trash2, Paperclip } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { toaster } from '@/components/ui/toast'
import { cn, formatDate, inputCls, inputStyle } from '@/lib/utils'
import { loadExpenses, createExpense, updateExpense, MAX_RECEIPT_BYTES } from '@/lib/expenses'
import {
  CATEGORY_LABELS, METHOD_LABELS, USED_FOR_LABELS,
  type Expense, type ExpenseCategory, type PaymentMethod, type ExpenseStatus, type ExpenseUsedFor,
} from '@/types/expense'

function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

export function AddExpense() {
  const navigate     = useNavigate()
  const { id }       = useParams<{ id: string }>()
  const { user }     = useAuth()
  const isEdit       = Boolean(id)

  const [saving, setSaving]   = useState(false)
  const [existing, setExisting] = useState<Expense | null>(null)

  // Form state
  const [date,          setDate]          = useState(new Date().toISOString().slice(0, 10))
  const [category,      setCategory]      = useState<ExpenseCategory>('marketing')
  const [amount,        setAmount]        = useState<number>(0)
  const [payee,         setPayee]         = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [usedFor,       setUsedFor]       = useState<ExpenseUsedFor>('office')
  const [projectName,   setProjectName]   = useState('')
  const [status,        setStatus]        = useState<ExpenseStatus>('pending')
  const [notes,         setNotes]         = useState('')
  const [receiptName,   setReceiptName]   = useState<string | undefined>()
  const [receiptDataUrl, setReceiptDataUrl] = useState<string | undefined>()

  // Load existing expense when editing
  useEffect(() => {
    if (!isEdit || !id) return
    const found = loadExpenses().find(e => e.id === id)
    if (!found) {
      toaster.create({ title: 'Expense not found', type: 'error' })
      navigate('/expenses')
      return
    }
    setExisting(found)
    setDate(found.date)
    setCategory(found.category)
    setAmount(found.amount)
    setPayee(found.payee)
    setPaymentMethod(found.paymentMethod)
    setUsedFor(found.usedFor)
    setProjectName(found.projectName ?? '')
    setStatus(found.status)
    setNotes(found.notes)
    setReceiptName(found.receiptName)
    setReceiptDataUrl(found.receiptDataUrl)
  }, [id, isEdit, navigate])

  function handleReceiptChange(file: File | undefined) {
    if (!file) return
    if (file.size > MAX_RECEIPT_BYTES) {
      toaster.create({ title: 'Receipt too large', description: 'Please use a file under 1MB.', type: 'error' })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setReceiptDataUrl(reader.result as string)
      setReceiptName(file.name)
    }
    reader.readAsDataURL(file)
  }

  function handleSave() {
    if (!payee.trim()) {
      toaster.create({ title: 'Payee is required', type: 'error' }); return
    }
    if (!amount || amount <= 0) {
      toaster.create({ title: 'Amount must be greater than 0', type: 'error' }); return
    }
    setSaving(true)
    try {
      const payload = {
        date, category, amount: Number(amount), payee: payee.trim(), paymentMethod,
        usedFor,
        projectName: usedFor === 'project' ? projectName.trim() : undefined,
        status, notes,
        receiptName, receiptDataUrl,
        agentId:   existing?.agentId   ?? user?.id   ?? '',
        agentName: existing?.agentName ?? user?.name ?? '',
      }
      if (isEdit && id) updateExpense(id, payload)
      else createExpense(payload)
      toaster.create({ title: isEdit ? 'Expense updated' : 'Expense recorded', type: 'success' })
      navigate('/expenses')
    } catch (err) {
      toaster.create({ title: (err as Error).message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const isImage = receiptDataUrl?.startsWith('data:image/')

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/expenses')}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--accent)]"
            style={{ color: 'var(--muted-foreground)' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
              {isEdit ? 'Edit Expense' : 'New Expense'}
            </h1>
            {existing && (
              <p className="text-xs font-mono" style={{ color: 'var(--primary)' }}>{existing.expenseNo}</p>
            )}
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--primary)' }}>
          <Save size={15} />
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Expense'}
        </button>
      </div>

      {/* Form body */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-8">

          {/* ── Expense Details ───────────────────────────────────────────── */}
          <section className="rounded-xl border p-5 space-y-4"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
            <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>
              Expense Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Date" required>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Amount (PHP)" required>
                <input type="number" min={0} value={amount || ''}
                  onChange={e => setAmount(Number(e.target.value))}
                  placeholder="0" className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Category" required>
                <select value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)}
                  className={inputCls} style={inputStyle}>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="Payment Method" required>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  className={inputCls} style={inputStyle}>
                  {Object.entries(METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="Payee / Vendor" required>
                <input value={payee} onChange={e => setPayee(e.target.value)}
                  placeholder="Who was paid" className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Used For" required>
                <select value={usedFor} onChange={e => setUsedFor(e.target.value as ExpenseUsedFor)}
                  className={inputCls} style={inputStyle}>
                  {Object.entries(USED_FOR_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              {usedFor === 'project' && (
                <Field label="Project Name">
                  <input value={projectName} onChange={e => setProjectName(e.target.value)}
                    placeholder="e.g. Apalit Subdivision" className={inputCls} style={inputStyle} />
                </Field>
              )}
              <Field label="Status">
                <select value={status} onChange={e => setStatus(e.target.value as ExpenseStatus)}
                  className={inputCls} style={inputStyle}>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </Field>
            </div>

            <Field label="Notes">
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                rows={3} placeholder="Optional details about this expense"
                className={cn(inputCls, 'resize-none')} style={inputStyle} />
            </Field>
          </section>

          {/* ── Receipt ───────────────────────────────────────────────────── */}
          <section className="rounded-xl border p-5 space-y-4"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
            <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>
              Receipt
            </h2>

            {receiptDataUrl ? (
              <div className="flex items-start gap-4">
                {isImage ? (
                  <img src={receiptDataUrl} alt={receiptName || 'Receipt'}
                    className="max-h-40 rounded-lg border object-contain" style={{ borderColor: 'var(--border)' }} />
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                    style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                    <Paperclip size={14} /> {receiptName || 'receipt'}
                  </div>
                )}
                <button type="button"
                  onClick={() => { setReceiptDataUrl(undefined); setReceiptName(undefined) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-red-50"
                  style={{ borderColor: 'var(--border)', color: '#dc2626' }}>
                  <Trash2 size={13} /> Remove
                </button>
              </div>
            ) : (
              <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-sm)] border-2 border-dashed transition-colors select-none border-[var(--border)] bg-[var(--card)] hover:bg-[var(--accent)]">
                <Paperclip size={18} style={{ color: 'var(--muted-foreground)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Attach a receipt</p>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Image or PDF — max 1MB</p>
                <input type="file" accept="image/*,.pdf" className="hidden"
                  onChange={e => { handleReceiptChange(e.target.files?.[0]); e.target.value = '' }} />
              </label>
            )}
          </section>

          {existing && (
            <p className="text-xs text-center" style={{ color: 'var(--muted-foreground)' }}>
              Recorded by {existing.agentName || '—'} on {formatDate(existing.createdAt)}
            </p>
          )}

          {/* Bottom action bar */}
          <div className="flex gap-3 justify-end pb-4">
            <button onClick={() => navigate('/expenses')}
              className="px-4 py-2 rounded-lg text-sm border transition-colors hover:bg-[var(--accent)]"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--primary)' }}>
              <Save size={15} />
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Expense'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
