import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Plus, Trash2, Download, Save, ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { toaster } from '@/components/ui/toast'
import { cn, formatPHP, inputCls, inputStyle } from '@/lib/utils'
import { generateBillingPDF } from '@/lib/billingPdf'
import type { Billing, BillingItem, BillingItemType } from '@/types/billing'
import type { Booking } from '@/types/booking'
import { saveDraftCloud, fetchDraft, deleteDraftCloud, generateBillingDraftId } from '@/lib/drafts'
import type { BillingDraft } from '@/types/draft'
import { ClientSelector } from '@/components/ClientSelector'

const DEFAULT_TERMS =
  "For your convenience, we'll prepare everything for release and provide the final appraisal reports as soon as full payment has been received."

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

function emptyItem(): BillingItem {
  return { description: '', subDescription: '', amount: 0, type: 'debit' }
}

export function AddBilling() {
  const navigate      = useNavigate()
  const { id }        = useParams<{ id: string }>()
  const [params]      = useSearchParams()
  const { user }      = useAuth()
  const isEdit        = Boolean(id)

  // Pre-fill from booking URL params (from ViewBooking "New Billing" button)
  const preBookingId   = params.get('bookingId')   ?? ''
  const preBookingNo   = params.get('bookingNo')   ?? ''
  const preClientName  = params.get('clientName')  ?? ''

  // Draft (only for new billings, not edits)
  const draftIdRef    = useRef<string>(params.get('draft') ?? generateBillingDraftId())
  const draftId       = draftIdRef.current
  const [loadingDraft, setLoadingDraft] = useState(!isEdit && !!params.get('draft'))
  const [submitted,    setSubmitted]    = useState(false)

  const [saving, setSaving]      = useState(false)
  const [bookings, setBookings]  = useState<Booking[]>([])
  // Single source of truth for the linked booking
  const [linkedBookingId, setLinkedBookingId] = useState(preBookingId)
  const [linkedBookingNo, setLinkedBookingNo] = useState(preBookingNo)
  const [clientId,   setClientId]   = useState('')
  const [clientCode, setClientCode] = useState('')

  // Form state
  const [clientName,     setClientName]     = useState(preClientName)
  const [clientCompany,  setClientCompany]  = useState('')
  const [clientAddress,  setClientAddress]  = useState('')
  const [servicePurpose, setServicePurpose] = useState('')
  const [dateIssued,     setDateIssued]     = useState(new Date().toISOString().slice(0, 10))
  const [dueDate,        setDueDate]        = useState('')
  const [items,          setItems]          = useState<BillingItem[]>([emptyItem()])
  const [discount,       setDiscount]       = useState(0)
  const [terms,          setTerms]          = useState(DEFAULT_TERMS)
  const [existingBilling, setExistingBilling] = useState<Billing | null>(null)

  // Load bookings for linking
  useEffect(() => {
    api.getBookings()
      .then(data => setBookings(data as Booking[]))
      .catch(() => {})
  }, [])

  // Load draft on resume (new billing only)
  useEffect(() => {
    const draftParam = params.get('draft')
    if (!draftParam || isEdit) return
    fetchDraft<BillingDraft>(draftParam).then(d => {
      if (d) {
        setLinkedBookingId(d.linkedBookingId)
        setLinkedBookingNo(d.linkedBookingNo)
        setClientName(d.clientName)
        setClientCompany(d.clientCompany)
        setClientAddress(d.clientAddress)
        setServicePurpose(d.servicePurpose)
        setDateIssued(d.dateIssued)
        if (d.dueDate) setDueDate(d.dueDate)
        setItems(d.items?.length ? d.items : [emptyItem()])
        setDiscount(d.discount)
        setTerms(d.terms)
      }
    }).finally(() => setLoadingDraft(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save on any field change (new billings only)
  const autoSave = useCallback(() => {
    if (!user || isEdit || submitted || loadingDraft) return
    saveDraftCloud({
      id: draftId, agentId: user.id, agentName: user.name,
      draftType: 'billing', savedAt: new Date().toISOString(),
      linkedBookingId, linkedBookingNo,
      clientName, clientCompany, clientAddress, servicePurpose,
      dateIssued, items, discount, terms,
    })
  }, [draftId, user, isEdit, submitted, loadingDraft, linkedBookingId, linkedBookingNo, clientName, clientCompany, clientAddress, servicePurpose, dateIssued, items, discount, terms])

  useEffect(() => {
    if (isEdit || submitted || loadingDraft) return
    const t = setTimeout(autoSave, 800)
    return () => clearTimeout(t)
  }, [autoSave, isEdit, submitted, loadingDraft])

  // Load existing billing when editing
  useEffect(() => {
    if (!isEdit || !id) return
    api.getBilling(id)
      .then(data => {
        const b = data as Billing
        setExistingBilling(b)
        setClientName(b.clientName)
        setClientCompany(b.clientCompany)
        setClientAddress(b.clientAddress)
        setServicePurpose(b.servicePurpose)
        setDateIssued(b.dateIssued || new Date().toISOString().slice(0, 10))
        setDueDate(b.dueDate || '')
        setItems(b.items?.length ? b.items.map(it => ({ ...it, type: it.type ?? 'debit' })) : [emptyItem()])
        setDiscount(b.discount)
        setTerms(b.terms || DEFAULT_TERMS)
        if (b.bookingId) { setLinkedBookingId(b.bookingId); setLinkedBookingNo(b.bookingNo ?? '') }
      })
      .catch(() => toaster.create({ title: 'Failed to load billing', type: 'error' }))
  }, [id, isEdit])

  // Auto-fill from booking
  const fillFromBooking = useCallback((bookingId: string) => {
    const bkg = bookings.find(x => x.id === bookingId)
    if (!bkg) return
    setClientName(bkg.clientName)
    setClientCompany(bkg.clientCompany || '')
    setClientAddress(bkg.clientAddress || '')
    setLinkedBookingId(bkg.id)
    setLinkedBookingNo(bkg.bookingNo)
    setServicePurpose(bkg.scopeNotes || '')
    if (bkg.clientId)   setClientId(bkg.clientId)
    if (bkg.clientCode) setClientCode(bkg.clientCode)
    if (!isEdit) {
      setItems(bkg.services.length
        ? bkg.services.map(svc => ({
            description:    svc.name,
            subDescription: svc.notes || '',
            amount:         svc.unitPrice * (svc.qty || 1),
            type:           'debit' as BillingItemType,
          }))
        : [emptyItem()]
      )
    }
  }, [bookings, isEdit])

  useEffect(() => {
    if (linkedBookingId && !isEdit) fillFromBooking(linkedBookingId)
  }, [linkedBookingId, fillFromBooking, isEdit])

  // Computed totals
  const totalDebits  = items.filter(it => it.type !== 'credit').reduce((s, it) => s + (Number(it.amount) || 0), 0)
  const totalCredits = items.filter(it => it.type === 'credit').reduce((s, it) => s + (Number(it.amount) || 0), 0)
  const subtotal     = totalDebits
  const discountAmt  = discount > 0 ? (subtotal * discount) / 100 : 0
  const netBalance   = totalDebits - discountAmt - totalCredits
  const total        = netBalance

  // Item helpers
  function updateItem(idx: number, field: keyof BillingItem, value: string | number | BillingItemType) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }
  function addItem() { setItems(prev => [...prev, emptyItem()]) }
  function removeItem(idx: number) {
    setItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev)
  }

  async function buildPayload() {
    return {
      clientId, clientCode,
      clientName, clientCompany, clientAddress, servicePurpose, dateIssued, dueDate,
      items, discount, subtotal, total, terms,
      bookingId: linkedBookingId || '',
      bookingNo: linkedBookingNo || '',
    }
  }

  async function handleSave(andPrint = false) {
    if (!linkedBookingId) {
      toaster.create({ title: 'Please select a booking', type: 'error' }); return
    }
    if (!clientName.trim()) {
      toaster.create({ title: 'Client name is required', type: 'error' }); return
    }
    if (items.every(it => !it.description.trim())) {
      toaster.create({ title: 'At least one item is required', type: 'error' }); return
    }
    setSaving(true)
    try {
      const payload = await buildPayload()
      let saved: Billing
      if (isEdit && id) {
        saved = await api.updateBilling(id, payload) as Billing
        // Merge with existing to ensure billingNo etc. are present
        saved = { ...existingBilling!, ...saved }
      } else {
        saved = await api.createBilling(payload) as Billing
      }
      setSubmitted(true)
      if (!isEdit) deleteDraftCloud(draftId)
      toaster.create({ title: isEdit ? 'Billing updated' : 'Billing created', type: 'success' })
      if (andPrint) {
        await generateBillingPDF({
          ...saved,
          agentName: saved.agentName || user?.name || '',
        })
      }
      navigate('/billing')
    } catch (err) {
      toaster.create({ title: (err as Error).message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/billing')}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--accent)]"
            style={{ color: 'var(--muted-foreground)' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
              {isEdit ? 'Edit Billing' : 'New Billing Statement'}
            </h1>
            {existingBilling && (
              <p className="text-xs font-mono" style={{ color: 'var(--primary)' }}>
                {existingBilling.billingNo}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleSave(false)} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors hover:bg-[var(--accent)]"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
            <Save size={15} />
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button onClick={() => handleSave(true)} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--primary)' }}>
            <Download size={15} />
            Save & Print
          </button>
        </div>
      </div>

      {/* Form body */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-8">

          {/* ── SECTION A: Header info ─────────────────────────────────────── */}
          <section className="rounded-xl border p-5 space-y-4"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
            <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>
              Billing Header
            </h2>

            {/* Booking selector — always required */}
            <Field label="Booking" required>
              {isEdit && linkedBookingNo ? (
                <div className="px-3 py-2 rounded-lg text-sm font-mono font-semibold"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--primary)' }}>
                  {linkedBookingNo}
                </div>
              ) : (
                <select value={linkedBookingId} onChange={e => setLinkedBookingId(e.target.value)}
                  className={inputCls} style={inputStyle}>
                  <option value="">— select a booking —</option>
                  {bookings.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.bookingNo} — {b.clientName} ({b.status})
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <ClientSelector
              value={clientId ? { id: clientId, clientCode, name: clientName, company: clientCompany, email: '', phone: '', address: '', notes: '', status: 'active', agentId: '', agentName: '', createdAt: '', updatedAt: '' } : null}
              onSelect={c => { setClientId(c.id); setClientCode(c.clientCode); setClientName(c.name); setClientCompany(c.company || '') }}
              onClear={() => { setClientId(''); setClientCode('') }}
              disabled={!!linkedBookingId}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Client Name" required>
                <input value={clientName} onChange={e => setClientName(e.target.value)}
                  placeholder="e.g. SPS Jennifer and Perry Bucay"
                  className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Client Company / Organization">
                <input value={clientCompany} onChange={e => setClientCompany(e.target.value)}
                  placeholder="Company name (optional)"
                  className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Client Address">
                <input value={clientAddress} onChange={e => setClientAddress(e.target.value)}
                  placeholder="Address"
                  className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Date Issued">
                <input type="date" value={dateIssued} onChange={e => setDateIssued(e.target.value)}
                  className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Due Date">
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className={inputCls} style={inputStyle} />
              </Field>
            </div>

            <Field label="Service & Purpose">
              <textarea value={servicePurpose} onChange={e => setServicePurpose(e.target.value)}
                rows={2}
                placeholder="e.g. Real Estate Appraisal Services – Market Valuation / Loan Application – Rural Bank of Apalit"
                className={cn(inputCls, 'resize-none')} style={inputStyle} />
            </Field>
          </section>

          {/* ── SECTION B: Items ───────────────────────────────────────────── */}
          <section className="rounded-xl border p-5 space-y-4"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>
                Itemized Billing
              </h2>
              <button onClick={addItem}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-[var(--accent)]"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                <Plus size={13} /> Add Item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="rounded-lg border p-4 space-y-3 relative"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--accent)' }}>

                  {/* Row header: number + D/C toggle + remove */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                      Item {idx + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      {/* Debit / Credit toggle */}
                      <div className="flex rounded-lg overflow-hidden border text-xs font-semibold"
                        style={{ borderColor: 'var(--border)' }}>
                        {(['debit', 'credit'] as BillingItemType[]).map(t => (
                          <button key={t} type="button"
                            onClick={() => updateItem(idx, 'type', t)}
                            className="px-3 py-1 transition-colors"
                            style={{
                              backgroundColor: item.type === t
                                ? (t === 'debit' ? 'var(--primary)' : 'rgb(234 179 8)')
                                : 'var(--background)',
                              color: item.type === t ? 'white' : 'var(--muted-foreground)',
                            }}>
                            {t === 'debit' ? 'D' : 'C'}
                          </button>
                        ))}
                      </div>
                      {items.length > 1 && (
                        <button onClick={() => removeItem(idx)}
                          className="p-1 rounded transition-colors hover:bg-red-100"
                          style={{ color: 'var(--muted-foreground)' }}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <Field label="Description">
                        <input value={item.description}
                          onChange={e => updateItem(idx, 'description', e.target.value)}
                          placeholder="e.g. Property 1 – Pasig"
                          className={inputCls} style={{ ...inputStyle, backgroundColor: 'var(--background)' }} />
                      </Field>
                    </div>
                    <Field label={item.type === 'credit' ? 'Amount Received (PHP)' : 'Amount (PHP)'}>
                      <input type="number" min={0} value={item.amount || ''}
                        onChange={e => updateItem(idx, 'amount', Number(e.target.value))}
                        placeholder="0"
                        className={inputCls} style={{ ...inputStyle, backgroundColor: 'var(--background)' }} />
                    </Field>
                  </div>
                  <Field label="Sub-description">
                    <input value={item.subDescription}
                      onChange={e => updateItem(idx, 'subDescription', e.target.value)}
                      placeholder="e.g. Market Valuation / General Appraisal"
                      className={inputCls} style={{ ...inputStyle, backgroundColor: 'var(--background)' }} />
                  </Field>
                </div>
              ))}
            </div>

            {/* Totals summary */}
            <div className="rounded-lg border p-4 space-y-2" style={{ borderColor: 'var(--border)' }}>
              <div className="flex justify-between text-sm" style={{ color: 'var(--muted-foreground)' }}>
                <span>Total Debits (Charges)</span>
                <span>{formatPHP(totalDebits)}</span>
              </div>

              {discount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm shrink-0" style={{ color: 'var(--muted-foreground)' }}>Discount</span>
                  <input type="number" min={0} max={100} value={discount || ''}
                    onChange={e => setDiscount(Number(e.target.value))}
                    className="w-16 px-2 py-1 rounded-lg border text-sm text-right outline-none"
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }} />
                  <span className="text-xs">%</span>
                  <span className="text-sm ml-auto" style={{ color: 'var(--muted-foreground)' }}>
                    − {formatPHP(discountAmt)}
                  </span>
                </div>
              )}

              {!discount && (
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Discount %</span>
                  <input type="number" min={0} max={100} value=""
                    onChange={e => setDiscount(Number(e.target.value))}
                    placeholder="0"
                    className="w-16 px-2 py-1 rounded-lg border text-sm text-right outline-none"
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }} />
                </div>
              )}

              {totalCredits > 0 && (
                <div className="flex justify-between text-sm" style={{ color: 'rgb(234 179 8)' }}>
                  <span>Total Credits (Payments Received)</span>
                  <span>({formatPHP(totalCredits)})</span>
                </div>
              )}

              <div className="flex justify-between text-base font-bold pt-2 border-t"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                <span>Net Balance Due</span>
                <span style={{ color: 'var(--primary)' }}>{formatPHP(netBalance)}</span>
              </div>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>VAT Exclusive</p>
            </div>
          </section>

          {/* ── SECTION C: Terms ───────────────────────────────────────────── */}
          <section className="rounded-xl border p-5 space-y-4"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
            <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>
              Terms & Conditions
            </h2>
            <textarea value={terms} onChange={e => setTerms(e.target.value)}
              rows={4} className={cn(inputCls, 'resize-none')} style={inputStyle} />
          </section>

          {/* Bottom action bar */}
          <div className="flex gap-3 justify-end pb-4">
            <button onClick={() => navigate('/billing')}
              className="px-4 py-2 rounded-lg text-sm border transition-colors hover:bg-[var(--accent)]"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              Cancel
            </button>
            <button onClick={() => handleSave(false)} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors hover:bg-[var(--accent)]"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              <Save size={15} />
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
            <button onClick={() => handleSave(true)} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--primary)' }}>
              <Download size={15} />
              Save & Print
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
