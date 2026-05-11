import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  User, ListChecks, DollarSign, Eye,
  CheckCircle, ArrowLeft, ArrowRight, Download, Save,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { toaster } from '@/components/ui/toast'
import { cn, formatPHP } from '@/lib/utils'
import { generateProposalPDF } from '@/lib/proposalPdf'
import type { Service } from '@/types/service'
import type { Proposal, ProposalService } from '@/types/proposal'
import type { Client } from '@/types/client'
import { saveDraftCloud, fetchDraft, deleteDraftCloud, generateProposalDraftId } from '@/lib/drafts'
import type { ProposalDraft } from '@/types/draft'
import { ClientSelector } from '@/components/ClientSelector'
import { ComboBox } from '@/components/ui/combo-box'
import type { ComboBoxOption } from '@/components/ui/combo-box'
import { phLgusSorted } from '@/data/philippines'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

// Static — computed once at module load, not per render
const CITY_OPTIONS: ComboBoxOption[] = phLgusSorted.map(l => ({
  value: `${l.name}|||${l.province}`, label: l.name, sublabel: l.province,
}))

// ── Email domain suggestions ──────────────────────────────────────────────────
const EMAIL_DOMAINS = ['@gmail.com', '@yahoo.com', '@outlook.com', '@hotmail.com', '@icloud.com', '@neswcorp.com']

function EmailInput({ value, onChange, error, placeholder }: {
  value: string; onChange: (v: string) => void; error?: boolean; placeholder?: string
}) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleChange(v: string) {
    onChange(v)
    const atIdx = v.indexOf('@')
    const afterAt = atIdx >= 0 ? v.slice(atIdx + 1) : ''
    setShowSuggestions(atIdx >= 0 && !afterAt.includes('.'))
  }

  const atIdx   = value.indexOf('@')
  const prefix  = atIdx >= 0 ? value.slice(0, atIdx) : value
  const filtered = showSuggestions
    ? EMAIL_DOMAINS.filter(d => d.toLowerCase().includes(atIdx >= 0 ? value.slice(atIdx).toLowerCase() : ''))
    : []

  return (
    <div ref={ref} className="relative">
      <input
        type="email"
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => { const ai = value.indexOf('@'); if (ai >= 0 && !value.slice(ai+1).includes('.')) setShowSuggestions(true) }}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors focus:ring-2"
        style={{ borderColor: error ? '#ef4444' : 'var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
      />
      {showSuggestions && filtered.length > 0 && (
        <div className="absolute z-40 left-0 right-0 mt-1 rounded-lg border shadow-lg overflow-hidden"
          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
          {filtered.map(domain => (
            <button key={domain} type="button"
              onMouseDown={e => { e.preventDefault(); onChange(prefix + domain); setShowSuggestions(false) }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--accent)] transition-colors"
              style={{ color: 'var(--foreground)' }}>
              <span style={{ color: 'var(--muted-foreground)' }}>{prefix}</span>
              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{domain}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Country codes ─────────────────────────────────────────────────────────────
const COUNTRY_CODES = [
  { code: '+63', label: '🇵🇭 +63' },
  { code: '+1',  label: '🇺🇸 +1'  },
  { code: '+44', label: '🇬🇧 +44' },
  { code: '+65', label: '🇸🇬 +65' },
  { code: '+61', label: '🇦🇺 +61' },
  { code: '+81', label: '🇯🇵 +81' },
  { code: '+82', label: '🇰🇷 +82' },
  { code: '+86', label: '🇨🇳 +86' },
  { code: '+971',label: '🇦🇪 +971'},
]

// ── Validation helpers ────────────────────────────────────────────────────────
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
function isValidMobile(mobile: string, countryCode: string): boolean {
  if (!mobile.trim()) return true
  const c = mobile.replace(/\s/g, '')
  if (countryCode === '+63') return /^9\d{9}$/.test(c)
  return /^\d{6,12}$/.test(c)
}

const DEFAULT_TERMS = `1. Prices are in Philippine Peso (₱) and are exclusive of applicable taxes unless stated.
2. Quotation is valid for the number of days specified from the date of issue.
3. A 50% down payment is required upon acceptance of this proposal.
4. NESW Realty Corporation reserves the right to revise pricing based on actual scope of work.
5. Services will commence upon receipt of down payment and signed agreement.`

const STEPS = [
  { number: 1, label: 'Client Details',  icon: User        },
  { number: 2, label: 'Select Services', icon: ListChecks  },
  { number: 3, label: 'Pricing',         icon: DollarSign  },
  { number: 4, label: 'Review & Submit', icon: Eye         },
]

// ── Step Indicator ─────────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((step, i) => {
        const done   = current > step.number
        const active = current === step.number
        const Icon   = step.icon
        return (
          <div key={step.number} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                done ? 'text-white' : '',
                active ? 'text-white ring-4 ring-offset-2' : '',
                !done && !active ? 'border-2' : '',
              )} style={{
                backgroundColor: done || active ? 'var(--primary)' : 'var(--background)',
                borderColor:     !done && !active ? 'var(--border)' : undefined,
              }}>
                {done
                  ? <CheckCircle size={16} className="text-white" />
                  : active
                    ? <Icon size={15} />
                    : <span style={{ color: 'var(--muted-foreground)' }}>{step.number}</span>
                }
              </div>
              <span className="text-xs font-medium hidden sm:block text-center" style={{
                color: active ? 'var(--primary)' : 'var(--muted-foreground)',
              }}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px mx-2 transition-colors"
                style={{ backgroundColor: current > step.number ? 'var(--primary)' : 'var(--border)' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Field helpers ──────────────────────────────────────────────────────────────
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

function TextInput({ value, onChange, placeholder, type = 'text', error, maxLength }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; error?: boolean; maxLength?: number
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className={cn(
        'w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors',
        error ? 'border-red-400' : 'border-[var(--border)]'
      )}
      style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
    />
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function AddProposal() {
  const navigate = useNavigate()
  const { user }  = useAuth()
  const [searchParams] = useSearchParams()

  // Draft ID — stable for this session
  const draftIdRef      = useRef<string>(searchParams.get('draft') ?? generateProposalDraftId())
  const draftId         = draftIdRef.current
  const [loadingDraft, setLoadingDraft] = useState(!!searchParams.get('draft'))
  const [submitted, setSubmitted]       = useState(false)

  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Step 1 — client
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [client, setClient] = useState({
    name: '', company: '', email: '', mobile: '', countryCode: '+63',
    street: '', barangay: '', city: '', province: '',
    notes: '', clientId: '', clientCode: '',
  })
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Step 2
  const [catalog, setCatalog]           = useState<Service[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(false)
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set())

  // Step 3
  const [lineItems, setLineItems] = useState<Record<string, { qty: number; unitPrice: number; notes: string }>>({})
  const [discountPct, setDiscountPct] = useState('0')
  const [validity, setValidity]   = useState('30')
  const [terms, setTerms]         = useState(DEFAULT_TERMS)


  // Load draft on resume
  useEffect(() => {
    const id = searchParams.get('draft')
    if (!id) return
    fetchDraft<ProposalDraft>(id).then(d => {
      if (d) {
        setStep(d.lastStep)
        setClient(prev => ({ ...prev, ...d.client }))
        setSelectedIds(new Set(d.selectedIds))
        setLineItems(d.lineItems)
        setDiscountPct(d.discountPct ?? '0')
        setValidity(d.validity)
        setTerms(d.terms)
      }
    }).finally(() => setLoadingDraft(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save on any field change (debounced 800ms)
  const autoSave = useCallback(() => {
    if (!user || submitted || loadingDraft) return
    saveDraftCloud({
      id:        draftId,
      agentId:   user.id,
      agentName: user.name,
      draftType: 'proposal',
      savedAt:   new Date().toISOString(),
      lastStep:  step,
      client,
      selectedIds: Array.from(selectedIds),
      lineItems,
      discountPct,
      validity,
      terms,
    })
  }, [draftId, user, step, client, selectedIds, lineItems, discountPct, validity, terms, submitted, loadingDraft])

  useEffect(() => {
    if (submitted || loadingDraft) return
    const t = setTimeout(autoSave, 800)
    return () => clearTimeout(t)
  }, [autoSave, submitted, loadingDraft])

  useEffect(() => {
    if (!submitted && !loadingDraft) autoSave()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  useEffect(() => {
    setLoadingCatalog(true)
    api.getServices(true)
      .then(data => setCatalog(data as Service[]))
      .catch(() => toaster.create({ title: 'Failed to load services', type: 'error' }))
      .finally(() => setLoadingCatalog(false))
  }, [])

  // Keep lineItems in sync when selections change
  useEffect(() => {
    setLineItems(prev => {
      const next = { ...prev }
      for (const id of Array.from(selectedIds)) {
        if (!next[id]) {
          const svc = catalog.find(s => s.id === id)
          if (svc) next[id] = { qty: 1, unitPrice: svc.defaultPrice, notes: '' }
        }
      }
      for (const id of Object.keys(next)) {
        if (!selectedIds.has(id)) delete next[id]
      }
      return next
    })
  }, [selectedIds, catalog])

  // ── Computed totals ──────────────────────────────────────────────────────────
  const subtotal = Array.from(selectedIds).reduce((sum, id) => {
    const li = lineItems[id]
    return sum + (li ? li.qty * li.unitPrice : 0)
  }, 0)
  const discountAmt = subtotal * (Math.min(100, Math.max(0, Number(discountPct) || 0)) / 100)
  const total       = Math.max(0, subtotal - discountAmt)

  // ── Validation ───────────────────────────────────────────────────────────────
  function validate(s: number) {
    const e: Record<string, string> = {}
    if (s === 1) {
      if (!client.name.trim())                               e.name   = 'Client name is required'
      if (client.email.trim() && !isValidEmail(client.email)) e.email = 'Enter a valid email address'
      if (client.mobile.trim() && !isValidMobile(client.mobile, client.countryCode))
        e.mobile = client.countryCode === '+63' ? 'Enter 10 digits starting with 9 (e.g. 9171234567)' : 'Enter a valid mobile number'
    }
    if (s === 2) {
      if (selectedIds.size === 0) e.services = 'Select at least one service'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleNext() {
    if (!validate(step)) return
    setStep(s => s + 1)
    window.scrollTo(0, 0)
  }

  function handleBack() {
    setStep(s => s - 1)
    window.scrollTo(0, 0)
  }

  // ── Build proposal payload ───────────────────────────────────────────────────
  function buildServices(): ProposalService[] {
    return Array.from(selectedIds).map(id => {
      const svc = catalog.find(s => s.id === id)!
      const li  = lineItems[id] ?? { qty: 1, unitPrice: svc.defaultPrice, notes: '' }
      return {
        serviceId: id,
        category:  svc.category,
        name:      svc.name,
        qty:       li.qty,
        unitPrice: li.unitPrice,
        timeline:  svc.timeline,
        notes:     li.notes,
      }
    })
  }

  function buildProposalForPdf(proposalNo: string, id: string): Proposal {
    return {
      id,
      proposalNo,
      agentId:       user?.id ?? '',
      agentName:     user?.name ?? '',
      status:        'draft',
      clientName:    client.name,
      clientCompany: client.company,
      clientEmail:   client.email,
      clientPhone:   client.mobile ? `${client.countryCode} ${client.mobile}` : '',
      clientAddress: [client.street, client.barangay, client.city, client.province].filter(Boolean).join(', '),
      clientNotes:   client.notes,
      services:      buildServices(),
      discount:      discountAmt,
      validityDays:  Number(validity) || 30,
      terms,
      subtotal,
      total,
      createdAt:     new Date().toISOString(),
      updatedAt:     new Date().toISOString(),
    }
  }

  async function handleSave() {
    setSubmitting(true)
    try {
      const result = await api.createProposal({
        clientId:      client.clientId,
        clientCode:    client.clientCode,
        clientName:    client.name,
        clientCompany: client.company,
        clientEmail:   client.email,
        clientPhone:   client.mobile ? `${client.countryCode} ${client.mobile}` : '',
        clientAddress: [client.street, client.barangay, client.city, client.province].filter(Boolean).join(', '),
        clientNotes:   client.notes,
        services:      buildServices(),
        discount:      discountAmt,
        validityDays:  Number(validity) || 30,
        terms,
        subtotal,
        total,
      }) as Proposal
      setSubmitted(true)
      deleteDraftCloud(draftId)
      toaster.create({ title: `Proposal ${result.proposalNo} saved`, type: 'success' })
      setTimeout(() => navigate('/proposals'), 1200)
    } catch (err) {
      toaster.create({ title: (err as Error).message, type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDownload() {
    const draft = buildProposalForPdf('DRAFT', 'draft')
    try {
      await generateProposalPDF(draft)
    } catch {
      toaster.create({ title: 'Failed to generate PDF', type: 'error' })
    }
  }

  // ── Grouped catalog ──────────────────────────────────────────────────────────
  const grouped = catalog.reduce((acc, svc) => {
    if (!acc[svc.category]) acc[svc.category] = []
    acc[svc.category].push(svc)
    return acc
  }, {} as Record<string, Service[]>)

  // ── Render steps ─────────────────────────────────────────────────────────────
  function renderStep1() {
    const set = (k: keyof typeof client) => (v: string) => setClient(c => ({ ...c, [k]: v }))
    return (
      <div className="flex flex-col gap-4">

        {/* Client lookup / create */}
        <ClientSelector
          value={selectedClient}
          onSelect={c => {
            setSelectedClient(c)
            setClient(prev => ({
              ...prev,
              name: c.name, company: c.company ?? '', email: c.email ?? '',
              mobile: '', countryCode: '+63',
              street: c.address ?? '', barangay: '', city: '', province: '',
              notes: c.notes ?? '', clientId: c.id, clientCode: c.clientCode,
            }))
            setErrors(e => ({ ...e, name: '' }))
          }}
          onClear={() => { setSelectedClient(null); setClient(prev => ({ ...prev, clientId: '', clientCode: '' })) }}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Client Name" required error={errors.name}>
            <TextInput value={client.name} onChange={set('name')} placeholder="Juan dela Cruz" error={!!errors.name} />
          </Field>
          <Field label="Company / Organization">
            <TextInput value={client.company} onChange={set('company')} placeholder="ABC Corporation (optional)" />
          </Field>
          <Field label="Email" error={errors.email}>
            <EmailInput value={client.email} onChange={set('email')} placeholder="juan@example.com" error={!!errors.email} />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </Field>
        </div>

        {/* Mobile with country code */}
        <Field label="Mobile Number" error={errors.mobile}>
          <div className="flex gap-2">
            <select
              value={client.countryCode}
              onChange={e => setClient(c => ({ ...c, countryCode: e.target.value }))}
              className="shrink-0 px-2 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
              {COUNTRY_CODES.map(cc => (
                <option key={cc.code} value={cc.code}>{cc.label}</option>
              ))}
            </select>
            <TextInput value={client.mobile} onChange={set('mobile')} placeholder="9171234567" error={!!errors.mobile} maxLength={10} />
          </div>
          {errors.mobile && <p className="text-xs text-red-500 mt-1">{errors.mobile}</p>}
        </Field>

        {/* Structured address */}
        <Field label="Street / House No.">
          <TextInput value={client.street} onChange={set('street')} placeholder="e.g. Lot 12 Blk 5, Sampaguita St." />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Barangay">
            <TextInput value={client.barangay} onChange={set('barangay')} placeholder="e.g. Barangay Plainview" />
          </Field>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
              City / Municipality
            </label>
            <ComboBox
              value={client.city ? `${client.city}|||${client.province}` : ''}
              onChange={(_val, opt) => {
                if (!opt) { setClient(c => ({ ...c, city: '', province: '' })); return }
                const [city, province] = opt.value.split('|||')
                setClient(c => ({ ...c, city: city ?? '', province: province ?? '' }))
              }}
              options={CITY_OPTIONS}
              placeholder="Search city or municipality…"
            />
          </div>
          <Field label="Province">
            <input value={client.province} readOnly placeholder="Auto-filled from city"
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--accent)', color: 'var(--foreground)', cursor: 'default' }} />
          </Field>
        </div>
        <Field label="Notes / Property Description">
          <textarea
            value={client.notes}
            onChange={e => setClient(c => ({ ...c, notes: e.target.value }))}
            placeholder="Additional context about the client or property"
            rows={3}
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
            style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
          />
        </Field>
      </div>
    )
  }

  function renderStep2() {
    if (loadingCatalog) return (
      <div className="flex items-center justify-center h-40" style={{ color: 'var(--muted-foreground)' }}>
        Loading services…
      </div>
    )
    return (
      <div className="flex flex-col gap-4">
        {errors.services && (
          <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg">{errors.services}</p>
        )}
        {Object.entries(grouped).map(([cat, svcs]) => (
          <div key={cat} className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <div className="px-4 py-2.5 font-semibold text-sm"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--foreground)' }}>
              {cat}
            </div>
            {svcs.map(svc => {
              const checked = selectedIds.has(svc.id)
              return (
                <label key={svc.id}
                  className="flex items-center gap-3 px-4 py-3 border-t cursor-pointer transition-colors hover:bg-[var(--accent)]"
                  style={{ borderColor: 'var(--border)' }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setSelectedIds(prev => {
                      const next = new Set(prev)
                      checked ? next.delete(svc.id) : next.add(svc.id)
                      return next
                    })}
                    className="w-4 h-4 accent-[var(--primary)] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{svc.name}</p>
                    {svc.description && (
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{svc.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
                      Starting at {formatPHP(svc.defaultPrice)}
                    </p>
                    {svc.timeline && (
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{svc.timeline}</p>
                    )}
                  </div>
                </label>
              )
            })}
          </div>
        ))}
        <p className="text-xs text-right" style={{ color: 'var(--muted-foreground)' }}>
          {selectedIds.size} service{selectedIds.size !== 1 ? 's' : ''} selected
        </p>
      </div>
    )
  }

  function renderStep3() {
    const selectedSvcs = catalog.filter(s => selectedIds.has(s.id))
    return (
      <div className="flex flex-col gap-6">
        {/* Line items table */}
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--accent)', color: 'var(--muted-foreground)' }}>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Service</th>
                <th className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wide w-20">Qty</th>
                <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wide w-36">Unit Price (₱)</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide w-32">Amount</th>
              </tr>
            </thead>
            <tbody>
              {selectedSvcs.map(svc => {
                const li = lineItems[svc.id] ?? { qty: 1, unitPrice: svc.defaultPrice, notes: '' }
                const amount = li.qty * li.unitPrice
                return (
                  <tr key={svc.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: 'var(--foreground)' }}>{svc.name}</p>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{svc.category} · {svc.timeline}</p>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number" min="1" value={li.qty}
                        onChange={e => setLineItems(prev => ({ ...prev, [svc.id]: { ...li, qty: Math.max(1, Number(e.target.value)) } }))}
                        className="w-full text-center px-2 py-1.5 rounded border text-sm outline-none"
                        style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number" min="0" value={li.unitPrice}
                        onChange={e => setLineItems(prev => ({ ...prev, [svc.id]: { ...li, unitPrice: Number(e.target.value) } }))}
                        className="w-full text-right px-2 py-1.5 rounded border text-sm outline-none"
                        style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold" style={{ color: 'var(--foreground)' }}>
                      {formatPHP(amount)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 flex flex-col gap-2">
            <div className="flex justify-between text-sm" style={{ color: 'var(--muted-foreground)' }}>
              <span>Subtotal</span>
              <span style={{ color: 'var(--foreground)' }}>{formatPHP(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm gap-3">
              <span style={{ color: 'var(--muted-foreground)' }}>Discount (%)</span>
              <div className="flex items-center gap-1">
                <input
                  type="number" min="0" max="100" value={discountPct}
                  onChange={e => setDiscountPct(e.target.value)}
                  className="w-20 text-right px-2 py-1 rounded border text-sm outline-none"
                  style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
                />
                <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>%</span>
              </div>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between text-sm" style={{ color: 'var(--muted-foreground)' }}>
                <span>Discount amount</span>
                <span className="text-red-500">− {formatPHP(discountAmt)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold border-t pt-2"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              <span>Total</span>
              <span style={{ color: 'var(--primary)' }}>{formatPHP(total)}</span>
            </div>
          </div>
        </div>

        {/* Validity + Terms */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Valid for (days)">
            <TextInput value={validity} onChange={setValidity} type="number" placeholder="30" />
          </Field>
        </div>
        <Field label="Terms & Conditions">
          <textarea
            value={terms}
            onChange={e => setTerms(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
            style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
          />
        </Field>
      </div>
    )
  }

  function renderStep4() {
    const selectedSvcs = catalog.filter(s => selectedIds.has(s.id))
    return (
      <div className="flex flex-col gap-6">
        {/* Client summary */}
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--accent)' }}>
          <p className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>Client</p>
          <p className="font-semibold" style={{ color: 'var(--foreground)' }}>{client.name}</p>
          {client.company && <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{client.company}</p>}
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            {[client.email, client.mobile ? `${client.countryCode} ${client.mobile}` : ''].filter(Boolean).join(' · ')}
          </p>
          {[client.street, client.barangay, client.city, client.province].filter(Boolean).join(', ') && (
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              {[client.street, client.barangay, client.city, client.province].filter(Boolean).join(', ')}
            </p>
          )}
        </div>

        {/* Services summary */}
        <div>
          <p className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>Services</p>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--accent)', color: 'var(--muted-foreground)' }}>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold">Service</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold">Qty</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold">Unit Price</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {selectedSvcs.map(svc => {
                  const li = lineItems[svc.id] ?? { qty: 1, unitPrice: svc.defaultPrice }
                  return (
                    <tr key={svc.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-4 py-2.5" style={{ color: 'var(--foreground)' }}>
                        <p>{svc.name}</p>
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{svc.timeline}</p>
                      </td>
                      <td className="px-3 py-2.5 text-center" style={{ color: 'var(--foreground)' }}>{li.qty}</td>
                      <td className="px-3 py-2.5 text-right" style={{ color: 'var(--foreground)' }}>{formatPHP(li.unitPrice)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold" style={{ color: 'var(--foreground)' }}>{formatPHP(li.qty * li.unitPrice)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals summary */}
        <div className="flex justify-end">
          <div className="w-64 flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between" style={{ color: 'var(--muted-foreground)' }}>
              <span>Subtotal</span><span style={{ color: 'var(--foreground)' }}>{formatPHP(subtotal)}</span>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between" style={{ color: 'var(--muted-foreground)' }}>
                <span>Discount</span><span className="text-red-500">- {formatPHP(discountAmt)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-2"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              <span>Total</span>
              <span style={{ color: 'var(--primary)' }}>{formatPHP(total)}</span>
            </div>
            <p className="text-xs text-right" style={{ color: 'var(--muted-foreground)' }}>
              Valid for {validity || 30} days
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <button onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors hover:bg-[var(--accent)]"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
            <Download size={16} /> View Draft Proposal
          </button>
          <button onClick={() => setConfirmOpen(true)} disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: 'var(--primary)' }}>
            <Save size={16} /> {submitting ? 'Submitting…' : 'Submit Proposal'}
          </button>
        </div>

        <ConfirmDialog
          open={confirmOpen}
          title="Submit Proposal?"
          description="Once submitted, this proposal will be saved and assigned a proposal number. Are you sure you want to proceed?"
          confirmLabel="Submit"
          confirmVariant="primary"
          onConfirm={() => { setConfirmOpen(false); handleSave() }}
          onCancel={() => setConfirmOpen(false)}
        />
      </div>
    )
  }

  // ── Layout ────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/proposals')}
          className="p-2 rounded-lg hover:bg-[var(--accent)] transition-colors"
          style={{ color: 'var(--muted-foreground)' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>New Proposal</h1>
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Create a service quotation for your client</p>
        </div>
      </div>

      <div className="rounded-2xl border p-6 shadow-sm"
        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
        <StepIndicator current={step} />

        <div className="min-h-64">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>

        {/* Navigation */}
        {step < 4 && (
          <div className="flex justify-between mt-8 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button onClick={handleBack} disabled={step === 1}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-40"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              <ArrowLeft size={15} /> Back
            </button>
            <button onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--primary)' }}>
              Next <ArrowRight size={15} />
            </button>
          </div>
        )}
        {step === 4 && (
          <div className="flex justify-start mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              <ArrowLeft size={15} /> Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
