import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Save, ArrowLeft, ArrowRight, Trash2, Paperclip, CheckCircle,
  Search, UserSquare, ReceiptText, FileImage,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { toaster } from '@/components/ui/toast'
import { cn, formatPHP, formatDate, inputCls, inputStyle } from '@/lib/utils'
import { loadExpenses, createExpense, updateExpense, uploadReceipt, MAX_RECEIPT_BYTES } from '@/lib/expenses'
import { loadPayees, createPayee, updatePayee, uploadPayeeId } from '@/lib/payees'
import { PayeeSelector } from '@/components/PayeeSelector'
import { saveDraftCloud, fetchDraft, deleteDraftCloud, generateExpenseDraftId } from '@/lib/drafts'
import type { ExpenseDraft } from '@/types/draft'
import type { Payee, PayeeType } from '@/types/payee'
import {
  CATEGORY_LABELS, METHOD_LABELS, USED_FOR_LABELS,
  type Expense, type ExpenseCategory, type PaymentMethod, type ExpenseStatus, type ExpenseUsedFor,
} from '@/types/expense'

const STEPS = [
  { number: 1, label: 'Payee Lookup',     icon: Search       },
  { number: 2, label: 'Payee Details',    icon: UserSquare   },
  { number: 3, label: 'Expense Details',  icon: ReceiptText  },
  { number: 4, label: 'Receipt & Review', icon: FileImage    },
]

// ── Validation helpers ────────────────────────────────────────────────────────
function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}
// PH mobile (09xx / +639xx) or general 7–15 digit phone, spaces/dashes allowed
function isValidPhone(v: string): boolean {
  const c = v.replace(/[\s-]/g, '')
  if (/^(\+?63)?9\d{9}$/.test(c)) return true
  return /^\+?\d{7,15}$/.test(c)
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((step, i) => {
        const done   = current > step.number
        const active = current === step.number
        const Icon   = step.icon
        return (
          <div key={step.number} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: done || active ? 'var(--primary)' : 'var(--accent)',
                  color: done || active ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                }}>
                {done ? <CheckCircle size={16} /> : <Icon size={15} />}
              </div>
              <span className="text-xs font-medium hidden sm:block whitespace-nowrap"
                style={{ color: active ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 rounded transition-colors"
                style={{ backgroundColor: current > step.number ? 'var(--primary)' : 'var(--border)' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span style={{ color: 'var(--muted-foreground)' }}>{label}</span>
      <span className="font-medium text-right" style={{ color: 'var(--foreground)' }}>{value}</span>
    </div>
  )
}

export function AddExpense() {
  const navigate     = useNavigate()
  const { id }       = useParams<{ id: string }>()
  const [params]     = useSearchParams()
  const { user }     = useAuth()
  const isEdit       = Boolean(id)

  // Draft (new expenses only)
  const draftIdRef   = useRef<string>(params.get('draft') ?? generateExpenseDraftId())
  const draftId      = draftIdRef.current
  const [loadingDraft, setLoadingDraft] = useState(!isEdit && !!params.get('draft'))
  const [submitted, setSubmitted]       = useState(false)

  const [step, setStep]       = useState(1)
  const [saving, setSaving]   = useState(false)
  const [existing, setExisting] = useState<Expense | null>(null)
  const [errors, setErrors]   = useState<Record<string, string>>({})

  // ── Payee (steps 1–2) ─────────────────────────────────────────────────────
  const [selectedPayee, setSelectedPayee] = useState<Payee | null>(null)
  const [payeeId, setPayeeId]             = useState<string>('')
  const [accountNumber, setAccountNumber] = useState<string>('')   // read-only, master-data assigned
  const [payeeType, setPayeeType] = useState<PayeeType>('company')
  const [pName,    setPName]    = useState('')   // company name OR individual full name
  const [pCompany, setPCompany] = useState('')
  const [pContact, setPContact] = useState('')   // contact person (company only)
  const [pNumber,  setPNumber]  = useState('')   // contact number
  const [pEmail,   setPEmail]   = useState('')
  const [pAddress, setPAddress] = useState('')   // company / individual address
  // ID attachment
  const [idFile, setIdFile]       = useState<File | null>(null)
  const [idName, setIdName]       = useState<string | undefined>()
  const [idUrl, setIdUrl]         = useState<string | undefined>()
  const [idPreview, setIdPreview] = useState<string | undefined>()

  // ── Expense (step 3) ──────────────────────────────────────────────────────
  const [date,          setDate]          = useState(new Date().toISOString().slice(0, 10))
  const [category,      setCategory]      = useState<ExpenseCategory>('marketing')
  const [amount,        setAmount]        = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [paidToAccount, setPaidToAccount] = useState('')
  const [usedFor,       setUsedFor]       = useState<ExpenseUsedFor>('office')
  const [projectName,   setProjectName]   = useState('')
  const [status,        setStatus]        = useState<ExpenseStatus>('pending')
  const [notes,         setNotes]         = useState('')

  // ── Receipt (step 4) ──────────────────────────────────────────────────────
  const [receiptFile, setReceiptFile]       = useState<File | null>(null)
  const [receiptName, setReceiptName]       = useState<string | undefined>()
  const [receiptUrl,  setReceiptUrl]        = useState<string | undefined>()
  const [receiptDataUrl, setReceiptDataUrl] = useState<string | undefined>()
  const [previewUrl,  setPreviewUrl]        = useState<string | undefined>()

  // ── Load existing expense (edit mode) ─────────────────────────────────────
  useEffect(() => {
    if (!isEdit || !id) return
    const found = loadExpenses().find(e => e.id === id)
    if (!found) {
      toaster.create({ title: 'Expense not found', type: 'error' })
      navigate('/expenses')
      return
    }
    setExisting(found)
    setPayeeId(found.payeeId ?? '')
    setPName(found.payee)
    if (found.payeeId) {
      const p = loadPayees().find(x => x.id === found.payeeId)
      if (p) fillFromPayee(p)
    }
    setDate(found.date)
    setCategory(found.category)
    setAmount(found.amount)
    setPaymentMethod(found.paymentMethod)
    setPaidToAccount(found.paidToAccount ?? '')
    setUsedFor(found.usedFor)
    setProjectName(found.projectName ?? '')
    setStatus(found.status)
    setNotes(found.notes)
    setReceiptName(found.receiptName)
    setReceiptUrl(found.receiptUrl)
    setReceiptDataUrl(found.receiptDataUrl)
    setStep(3)  // edit jumps straight to expense details
  }, [id, isEdit, navigate]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load draft on resume (new only) ───────────────────────────────────────
  useEffect(() => {
    const draftParam = params.get('draft')
    if (!draftParam || isEdit) return
    fetchDraft<ExpenseDraft>(draftParam).then(d => {
      if (d) {
        setStep(d.lastStep || 1)
        setPayeeId(d.payeeId || '')
        if (d.payeeId) {
          const p = loadPayees().find(x => x.id === d.payeeId)
          if (p) { setSelectedPayee(p); fillFromPayee(p) }
        } else {
          setPName(d.payee || '')
        }
        if (d.date) setDate(d.date)
        setCategory((d.category as ExpenseCategory) || 'marketing')
        setAmount(d.amount || 0)
        setPaymentMethod((d.paymentMethod as PaymentMethod) || 'cash')
        setPaidToAccount(d.paidToAccount || '')
        setUsedFor((d.usedFor as ExpenseUsedFor) || 'office')
        setProjectName(d.projectName || '')
        setStatus((d.status as ExpenseStatus) || 'pending')
        setNotes(d.notes || '')
        setReceiptName(d.receiptName)
      }
    }).finally(() => setLoadingDraft(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-save draft on change (new only) ──────────────────────────────────
  const autoSave = useCallback(() => {
    if (!user || isEdit || submitted || loadingDraft) return
    saveDraftCloud({
      id: draftId, agentId: user.id, agentName: user.name,
      draftType: 'expense', savedAt: new Date().toISOString(),
      lastStep: step,
      payeeId, payee: pName, date, amount, category, paymentMethod, paidToAccount, usedFor, projectName, status, notes,
      receiptName,
    })
  }, [draftId, user, isEdit, submitted, loadingDraft, step, payeeId, pName, date, amount, category, paymentMethod, paidToAccount, usedFor, projectName, status, notes, receiptName])

  useEffect(() => {
    if (isEdit || submitted || loadingDraft) return
    const t = setTimeout(autoSave, 800)
    return () => clearTimeout(t)
  }, [autoSave, isEdit, submitted, loadingDraft])

  // Clean up object URLs
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])
  useEffect(() => () => { if (idPreview)  URL.revokeObjectURL(idPreview)  }, [idPreview])

  // ── Payee helpers ─────────────────────────────────────────────────────────
  function fillFromPayee(p: Payee) {
    setPayeeId(p.id)
    setAccountNumber(p.accountNumber)
    setPayeeType(p.payeeType ?? 'company')
    setPName(p.name)
    setPCompany(p.company ?? '')
    setPContact(p.contactPerson ?? '')
    setPNumber(p.contactNumber ?? '')
    setPEmail(p.email ?? '')
    setPAddress(p.address ?? '')
    setIdName(p.idName)
    setIdUrl(p.idUrl)
  }

  function handleSelectPayee(p: Payee) {
    setSelectedPayee(p)
    fillFromPayee(p)
  }

  function clearPayeeFields() {
    setSelectedPayee(null)
    setPayeeId(''); setAccountNumber(''); setPayeeType('company')
    setPName(''); setPCompany(''); setPContact(''); setPNumber(''); setPEmail(''); setPAddress('')
    setIdFile(null); setIdName(undefined); setIdUrl(undefined)
    if (idPreview) URL.revokeObjectURL(idPreview)
    setIdPreview(undefined)
  }

  function handleIdChange(file: File | undefined) {
    if (!file) return
    if (file.size > MAX_RECEIPT_BYTES) {
      toaster.create({ title: 'ID file too large', description: 'Please use a file under 5MB.', type: 'error' }); return
    }
    if (idPreview) URL.revokeObjectURL(idPreview)
    setIdFile(file)
    setIdName(file.name)
    setIdUrl(undefined)
    setIdPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined)
  }

  function clearId() {
    if (idPreview) URL.revokeObjectURL(idPreview)
    setIdFile(null); setIdName(undefined); setIdUrl(undefined); setIdPreview(undefined)
  }

  // ── Receipt helpers ───────────────────────────────────────────────────────
  function handleReceiptChange(file: File | undefined) {
    if (!file) return
    if (file.size > MAX_RECEIPT_BYTES) {
      toaster.create({ title: 'Receipt too large', description: 'Please use a file under 5MB.', type: 'error' }); return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setReceiptFile(file)
    setReceiptName(file.name)
    setReceiptUrl(undefined)
    setReceiptDataUrl(undefined)
    setPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined)
  }

  function clearReceipt() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setReceiptFile(null); setReceiptName(undefined); setReceiptUrl(undefined); setReceiptDataUrl(undefined); setPreviewUrl(undefined)
  }

  // ── Validation ────────────────────────────────────────────────────────────
  function validatePayeeDetails(): boolean {
    const e: Record<string, string> = {}
    if (!pName.trim()) e.pName = payeeType === 'company' ? 'Company name is required' : 'Full name is required'
    if (pEmail.trim() && !isValidEmail(pEmail.trim())) e.pEmail = 'Enter a valid email address'
    if (pNumber.trim() && !isValidPhone(pNumber.trim())) e.pNumber = 'Enter a valid contact number'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function validateExpense(): boolean {
    const e: Record<string, string> = {}
    if (!amount || amount <= 0) e.amount = 'Amount must be greater than 0'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  function handleNext() {
    if (step === 1) {
      if (!selectedPayee) { toaster.create({ title: 'Select a payee or click Skip', type: 'error' }); return }
    }
    if (step === 2 && !validatePayeeDetails()) return
    if (step === 3 && !validateExpense()) return
    setStep(s => Math.min(s + 1, STEPS.length)); window.scrollTo(0, 0)
  }

  function handleSkip() {
    // No existing payee — enter details manually on step 2 (creates a new payee on submit)
    clearPayeeFields()
    setStep(2); window.scrollTo(0, 0)
  }

  function handleBack() { setStep(s => Math.max(s - 1, 1)); window.scrollTo(0, 0) }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!validatePayeeDetails()) { setStep(2); return }
    if (!validateExpense()) { setStep(3); return }
    setSaving(true)
    try {
      // Resolve/persist the payee in master data
      let finalIdUrl = idUrl
      if (idFile) finalIdUrl = await uploadPayeeId(idFile)

      const payeeFields = {
        payeeType,
        name: pName.trim(),
        company: payeeType === 'company' ? pCompany.trim() : '',
        contactPerson: payeeType === 'company' ? pContact.trim() : '',
        contactNumber: pNumber.trim(), email: pEmail.trim(), address: pAddress.trim(),
        idName, idUrl: finalIdUrl, status: 'active' as const,
      }
      let resolvedPayeeId = payeeId
      if (payeeId) {
        updatePayee(payeeId, payeeFields)
      } else {
        const created = createPayee(payeeFields)
        resolvedPayeeId = created.id
        setAccountNumber(created.accountNumber)
      }

      // Upload a freshly attached receipt
      let finalReceiptUrl = receiptUrl
      if (receiptFile) finalReceiptUrl = await uploadReceipt(receiptFile)

      const payload = {
        date, category, amount: Number(amount),
        payeeId: resolvedPayeeId, payee: pName.trim(),
        paymentMethod, paidToAccount: paidToAccount.trim() || undefined, usedFor,
        projectName: usedFor === 'project' ? projectName.trim() : undefined,
        status, notes,
        receiptName, receiptUrl: finalReceiptUrl, receiptDataUrl,
        agentId:   existing?.agentId   ?? user?.id   ?? '',
        agentName: existing?.agentName ?? user?.name ?? '',
      }
      if (isEdit && id) updateExpense(id, payload)
      else createExpense(payload)
      setSubmitted(true)
      if (!isEdit) deleteDraftCloud(draftId)
      toaster.create({ title: isEdit ? 'Expense updated' : 'Expense recorded', type: 'success' })
      navigate('/expenses')
    } catch (err) {
      toaster.create({ title: (err as Error).message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const hasReceipt = !!(receiptFile || receiptUrl || receiptDataUrl)
  const isImagePreview = !!previewUrl
  const existingImage = !receiptFile && !!(receiptUrl?.match(/\.(png|jpe?g|webp|gif)$/i) || receiptDataUrl?.startsWith('data:image/'))
  const idIsImage = !!idPreview || !!idUrl?.match(/\.(png|jpe?g|webp|gif)$/i)

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/expenses')}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--accent)]" style={{ color: 'var(--muted-foreground)' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
              {isEdit ? 'Edit Expense' : 'New Expense'}
            </h1>
            {existing
              ? <p className="text-xs font-mono" style={{ color: 'var(--primary)' }}>{existing.expenseNo}</p>
              : <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Record an expense · auto-saved as you go</p>}
          </div>
        </div>
      </div>

      {/* Form body */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="max-w-2xl mx-auto">
          <StepIndicator current={step} />

          {/* ── STEP 1: Payee Lookup ──────────────────────────────────────── */}
          {step === 1 && (
            <section className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
                Search for an existing payee by account number or name to auto-fill their details.
                If the payee is not yet registered, click <strong>Skip</strong> to enter details manually.
              </p>
              <PayeeSelector value={selectedPayee} onSelect={handleSelectPayee} onClear={clearPayeeFields} />
            </section>
          )}

          {/* ── STEP 2: Payee Details ─────────────────────────────────────── */}
          {step === 2 && (
            <section className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>Payee Details</h2>
                {accountNumber && (
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--primary)' }}>{accountNumber}</span>
                )}
              </div>
              {!accountNumber && (
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  A Payee Account Number will be assigned automatically when you save.
                </p>
              )}

              {/* Company / Individual toggle */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-foreground)' }}>Payee Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['company', 'individual'] as PayeeType[]).map(t => (
                    <button key={t} type="button" onClick={() => setPayeeType(t)}
                      className="px-3 py-2 rounded-lg text-sm font-medium border transition-colors"
                      style={{
                        borderColor: payeeType === t ? 'var(--primary)' : 'var(--border)',
                        backgroundColor: payeeType === t ? 'var(--primary)' : 'var(--background)',
                        color: payeeType === t ? 'var(--primary-foreground)' : 'var(--foreground)',
                      }}>
                      {t === 'company' ? 'Company' : 'Individual'}
                    </button>
                  ))}
                </div>
              </div>

              {payeeType === 'company' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Company Name" required error={errors.pName}>
                    <input value={pName} onChange={e => { setPName(e.target.value); setErrors(x => ({ ...x, pName: '' })) }}
                      placeholder="Registered company name"
                      className={cn(inputCls, errors.pName && 'border-red-400')} style={inputStyle} />
                  </Field>
                  <Field label="Contact Person">
                    <input value={pContact} onChange={e => setPContact(e.target.value)}
                      placeholder="Authorized representative" className={inputCls} style={inputStyle} />
                  </Field>
                  <Field label="Contact Number" error={errors.pNumber}>
                    <input value={pNumber} onChange={e => { setPNumber(e.target.value); setErrors(x => ({ ...x, pNumber: '' })) }}
                      placeholder="e.g. 0917 123 4567" inputMode="tel"
                      className={cn(inputCls, errors.pNumber && 'border-red-400')} style={inputStyle} />
                  </Field>
                  <Field label="Email" error={errors.pEmail}>
                    <input value={pEmail} onChange={e => { setPEmail(e.target.value); setErrors(x => ({ ...x, pEmail: '' })) }}
                      placeholder="company@example.com" type="email"
                      className={cn(inputCls, errors.pEmail && 'border-red-400')} style={inputStyle} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Company Address">
                      <input value={pAddress} onChange={e => setPAddress(e.target.value)}
                        placeholder="Business address" className={inputCls} style={inputStyle} />
                    </Field>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Full Name" required error={errors.pName}>
                    <input value={pName} onChange={e => { setPName(e.target.value); setErrors(x => ({ ...x, pName: '' })) }}
                      placeholder="First and last name"
                      className={cn(inputCls, errors.pName && 'border-red-400')} style={inputStyle} />
                  </Field>
                  <Field label="Mobile / Contact Number" error={errors.pNumber}>
                    <input value={pNumber} onChange={e => { setPNumber(e.target.value); setErrors(x => ({ ...x, pNumber: '' })) }}
                      placeholder="e.g. 0917 123 4567" inputMode="tel"
                      className={cn(inputCls, errors.pNumber && 'border-red-400')} style={inputStyle} />
                  </Field>
                  <Field label="Email" error={errors.pEmail}>
                    <input value={pEmail} onChange={e => { setPEmail(e.target.value); setErrors(x => ({ ...x, pEmail: '' })) }}
                      placeholder="name@example.com" type="email"
                      className={cn(inputCls, errors.pEmail && 'border-red-400')} style={inputStyle} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Address">
                      <input value={pAddress} onChange={e => setPAddress(e.target.value)}
                        placeholder="Home / personal address" className={inputCls} style={inputStyle} />
                    </Field>
                  </div>
                </div>
              )}

              {/* ID attachment */}
              <Field label="ID Attached">
                {idName ? (
                  <div className="flex items-start gap-4">
                    {idIsImage ? (
                      <img src={idPreview || idUrl} alt={idName} className="max-h-32 rounded-lg border object-contain" style={{ borderColor: 'var(--border)' }} />
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                        <Paperclip size={14} /> {idName}
                      </div>
                    )}
                    <button type="button" onClick={clearId}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-red-50"
                      style={{ borderColor: 'var(--border)', color: '#dc2626' }}>
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                ) : (
                  <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border-2 border-dashed transition-colors select-none border-[var(--border)] bg-[var(--card)] hover:bg-[var(--accent)]">
                    <Paperclip size={16} style={{ color: 'var(--muted-foreground)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Attach ID</p>
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Image or PDF — max 5MB</p>
                    <input type="file" accept="image/*,.pdf" className="hidden"
                      onChange={e => { handleIdChange(e.target.files?.[0]); e.target.value = '' }} />
                  </label>
                )}
              </Field>
            </section>
          )}

          {/* ── STEP 3: Expense Details ───────────────────────────────────── */}
          {step === 3 && (
            <section className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
              <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>Expense Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Date" required>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} style={inputStyle} />
                </Field>
                <Field label="Amount (PHP)" required error={errors.amount}>
                  <input type="number" min={0} value={amount || ''} onChange={e => { setAmount(Number(e.target.value)); setErrors(x => ({ ...x, amount: '' })) }}
                    placeholder="0" className={cn(inputCls, errors.amount && 'border-red-400')} style={inputStyle} />
                </Field>
                <Field label="Category" required>
                  <select value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)} className={inputCls} style={inputStyle}>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Payment Method" required>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} className={inputCls} style={inputStyle}>
                    {Object.entries(METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Account Number (paid / sent to)">
                  <input value={paidToAccount} onChange={e => setPaidToAccount(e.target.value)}
                    placeholder="Bank / e-wallet account no." className={inputCls} style={inputStyle} />
                </Field>
                <Field label="Used For" required>
                  <select value={usedFor} onChange={e => setUsedFor(e.target.value as ExpenseUsedFor)} className={inputCls} style={inputStyle}>
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
                  <select value={status} onChange={e => setStatus(e.target.value as ExpenseStatus)} className={inputCls} style={inputStyle}>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </Field>
              </div>
              <Field label="Notes">
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  placeholder="Optional details about this expense" className={cn(inputCls, 'resize-none')} style={inputStyle} />
              </Field>
            </section>
          )}

          {/* ── STEP 4: Review & Receipt ──────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-6">

              {/* Amount headline */}
              <section className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>Total Amount</p>
                    <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--primary)' }}>{formatPHP(Number(amount) || 0)}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: status === 'paid' ? '#dcfce7' : status === 'cancelled' ? '#fee2e2' : '#fef3c7',
                      color:           status === 'paid' ? '#15803d' : status === 'cancelled' ? '#dc2626' : '#b45309',
                    }}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </div>
              </section>

              {/* Review — Payee */}
              <section className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
                <div className="px-5 py-2.5 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--accent)' }}>
                  <h2 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>Payee</h2>
                </div>
                <div className="px-5 py-2 divide-y" style={{ borderColor: 'var(--border)' }}>
                  <ReviewRow label="Type" value={payeeType === 'company' ? 'Company' : 'Individual'} />
                  <ReviewRow label={payeeType === 'company' ? 'Company Name' : 'Full Name'} value={pName || '—'} />
                  {accountNumber && <ReviewRow label="Payee Account No." value={accountNumber} />}
                  {payeeType === 'company' && pContact && <ReviewRow label="Contact Person" value={pContact} />}
                  {pNumber && <ReviewRow label="Contact Number" value={pNumber} />}
                  {pEmail && <ReviewRow label="Email" value={pEmail} />}
                  {pAddress && <ReviewRow label="Address" value={pAddress} />}
                  <ReviewRow label="ID Attached" value={idName || 'None'} />
                </div>
              </section>

              {/* Review — Expense */}
              <section className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
                <div className="px-5 py-2.5 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--accent)' }}>
                  <h2 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>Expense</h2>
                </div>
                <div className="px-5 py-2 divide-y" style={{ borderColor: 'var(--border)' }}>
                  <ReviewRow label="Date" value={formatDate(date)} />
                  <ReviewRow label="Category" value={CATEGORY_LABELS[category]} />
                  <ReviewRow label="Payment Method" value={METHOD_LABELS[paymentMethod]} />
                  {paidToAccount && <ReviewRow label="Account No. (paid to)" value={paidToAccount} />}
                  <ReviewRow label="Used For" value={usedFor === 'project' && projectName ? `${USED_FOR_LABELS[usedFor]}: ${projectName}` : USED_FOR_LABELS[usedFor]} />
                  {notes && <ReviewRow label="Notes" value={notes} />}
                </div>
              </section>

              {/* Attachment — below the review */}
              <section className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
                <h2 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>Receipt Attachment</h2>
                {hasReceipt ? (
                  <div className="flex items-center gap-4 rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
                    {isImagePreview ? (
                      <img src={previewUrl} alt={receiptName} className="w-20 h-20 rounded-lg border object-cover shrink-0" style={{ borderColor: 'var(--border)' }} />
                    ) : existingImage ? (
                      <img src={receiptUrl || receiptDataUrl} alt={receiptName} className="w-20 h-20 rounded-lg border object-cover shrink-0" style={{ borderColor: 'var(--border)' }} />
                    ) : (
                      <div className="w-20 h-20 rounded-lg border flex items-center justify-center shrink-0" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--accent)' }}>
                        <Paperclip size={20} style={{ color: 'var(--muted-foreground)' }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{receiptName || 'receipt'}</p>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Attached</p>
                    </div>
                    <button type="button" onClick={clearReceipt}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-red-50 shrink-0"
                      style={{ borderColor: 'var(--border)', color: '#dc2626' }}>
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                ) : (
                  <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-sm)] border-2 border-dashed transition-colors select-none border-[var(--border)] bg-[var(--card)] hover:bg-[var(--accent)]">
                    <Paperclip size={18} style={{ color: 'var(--muted-foreground)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Attach a receipt</p>
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Image or PDF — max 5MB</p>
                    <input type="file" accept="image/*,.pdf" className="hidden"
                      onChange={e => { handleReceiptChange(e.target.files?.[0]); e.target.value = '' }} />
                  </label>
                )}
              </section>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button onClick={step === 1 ? () => navigate('/expenses') : handleBack}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-colors hover:bg-[var(--accent)]"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              <ArrowLeft size={15} /> {step === 1 ? 'Cancel' : 'Back'}
            </button>

            <div className="flex items-center gap-2">
              {step === 1 && !selectedPayee && (
                <button onClick={handleSkip}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors hover:bg-[var(--accent)]"
                  style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
                  Skip <ArrowRight size={15} />
                </button>
              )}
              {step < STEPS.length && (step !== 1 || selectedPayee) && (
                <button onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'var(--primary)' }}>
                  Next <ArrowRight size={15} />
                </button>
              )}
              {step === STEPS.length && (
                <button onClick={handleSubmit} disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'var(--primary)' }}>
                  <Save size={15} /> {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Expense'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
