import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2, Download, Save, ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { toaster } from '@/components/ui/toast'
import { cn, formatPHP } from '@/lib/utils'
import { generateBillingPDF } from '@/lib/billingPdf'
import type { Billing, BillingItem } from '@/types/billing'
import type { Proposal } from '@/types/proposal'

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

const inputCls = 'w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors focus:ring-2'
const inputStyle = { borderColor: 'var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }

function emptyItem(): BillingItem {
  return { description: '', subDescription: '', amount: 0 }
}

export function AddBilling() {
  const navigate    = useNavigate()
  const { id }      = useParams<{ id: string }>()
  const { user }    = useAuth()
  const isEdit      = Boolean(id)

  const [saving, setSaving]       = useState(false)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [source, setSource]       = useState<'new' | 'proposal'>('new')
  const [selectedProposal, setSelectedProposal] = useState('')

  // Form state
  const [clientName,     setClientName]     = useState('')
  const [clientCompany,  setClientCompany]  = useState('')
  const [clientAddress,  setClientAddress]  = useState('')
  const [servicePurpose, setServicePurpose] = useState('')
  const [dateIssued,     setDateIssued]     = useState(new Date().toISOString().slice(0, 10))
  const [items,          setItems]          = useState<BillingItem[]>([emptyItem()])
  const [discount,       setDiscount]       = useState(0)
  const [terms,          setTerms]          = useState(DEFAULT_TERMS)
  const [existingBilling, setExistingBilling] = useState<Billing | null>(null)

  // Load proposals for linking
  useEffect(() => {
    api.getProposals()
      .then(data => setProposals(data as Proposal[]))
      .catch(() => {/* non-critical */})
  }, [])

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
        setItems(b.items?.length ? b.items : [emptyItem()])
        setDiscount(b.discount)
        setTerms(b.terms || DEFAULT_TERMS)
        if (b.proposalId) {
          setSource('proposal')
          setSelectedProposal(b.proposalId)
        }
      })
      .catch(() => toaster.create({ title: 'Failed to load billing', type: 'error' }))
  }, [id, isEdit])

  // Auto-fill from proposal
  const fillFromProposal = useCallback((proposalId: string) => {
    const p = proposals.find(x => x.id === proposalId)
    if (!p) return
    setClientName(p.clientName)
    setClientCompany(p.clientCompany || '')
    setClientAddress(p.clientAddress || '')
    setDiscount(p.discount || 0)
    // Build items from proposal services
    setItems(p.services.map(svc => ({
      description:    svc.name,
      subDescription: svc.notes || '',
      amount:         svc.unitPrice * (svc.qty || 1),
    })))
  }, [proposals])

  useEffect(() => {
    if (source === 'proposal' && selectedProposal && !isEdit) {
      fillFromProposal(selectedProposal)
    }
  }, [source, selectedProposal, fillFromProposal, isEdit])

  // Computed totals
  const subtotal = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0)
  const discountAmt = discount > 0 ? (subtotal * discount) / 100 : 0
  const total = subtotal - discountAmt

  // Item helpers
  function updateItem(idx: number, field: keyof BillingItem, value: string | number) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }
  function addItem() { setItems(prev => [...prev, emptyItem()]) }
  function removeItem(idx: number) {
    setItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev)
  }

  async function buildPayload() {
    const linked = source === 'proposal'
      ? proposals.find(p => p.id === selectedProposal)
      : null
    return {
      clientName,
      clientCompany,
      clientAddress,
      servicePurpose,
      dateIssued,
      items,
      discount,
      subtotal,
      total,
      terms,
      proposalId:  linked?.id  ?? '',
      proposalNo:  linked?.proposalNo ?? '',
    }
  }

  async function handleSave(andPrint = false) {
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

            {/* Source toggle */}
            {!isEdit && (
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>
                  Create from
                </p>
                <div className="flex gap-2">
                  {(['new', 'proposal'] as const).map(s => (
                    <button key={s} onClick={() => setSource(s)}
                      className={cn('px-4 py-1.5 rounded-full text-xs font-medium border transition-colors')}
                      style={{
                        backgroundColor: source === s ? 'var(--primary)' : 'var(--accent)',
                        color: source === s ? 'var(--primary-foreground)' : 'var(--foreground)',
                        borderColor: source === s ? 'var(--primary)' : 'var(--border)',
                      }}>
                      {s === 'new' ? 'New / Manual' : 'From Proposal'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Proposal selector */}
            {source === 'proposal' && !isEdit && (
              <Field label="Select Proposal" required>
                <select value={selectedProposal} onChange={e => setSelectedProposal(e.target.value)}
                  className={inputCls} style={inputStyle}>
                  <option value="">— choose a proposal —</option>
                  {proposals.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.proposalNo} — {p.clientName} ({p.services.length} service{p.services.length !== 1 ? 's' : ''})
                    </option>
                  ))}
                </select>
              </Field>
            )}

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

                  {/* Row number + remove */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                      Item {idx + 1}
                    </span>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(idx)}
                        className="p-1 rounded transition-colors hover:bg-red-100"
                        style={{ color: 'var(--muted-foreground)' }}>
                        <Trash2 size={13} />
                      </button>
                    )}
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
                    <Field label="Amount (PHP)">
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
                <span>Subtotal</span>
                <span>{formatPHP(subtotal)}</span>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm shrink-0" style={{ color: 'var(--muted-foreground)' }}>
                  Discount %
                </label>
                <input type="number" min={0} max={100} value={discount || ''}
                  onChange={e => setDiscount(Number(e.target.value))}
                  className="w-20 px-2 py-1 rounded-lg border text-sm text-right outline-none"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }} />
                {discount > 0 && (
                  <span className="text-sm ml-auto" style={{ color: 'var(--muted-foreground)' }}>
                    − {formatPHP(discountAmt)}
                  </span>
                )}
              </div>

              <div className="flex justify-between text-base font-bold pt-2 border-t"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                <span>Total Amount Due</span>
                <span style={{ color: 'var(--primary)' }}>{formatPHP(total)}</span>
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
