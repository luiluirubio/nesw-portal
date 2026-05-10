import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { api } from '@/lib/api'
import { toaster } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import type { Proposal } from '@/types/proposal'
import type { Booking } from '@/types/booking'

const inputCls = 'w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors focus:ring-2'
const inputStyle = { borderColor: 'var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

export function AddBooking() {
  const navigate        = useNavigate()
  const [params]        = useSearchParams()
  const preselectedId   = params.get('proposalId') ?? ''

  const [saving, setSaving]       = useState(false)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [selectedProposalId, setSelectedProposalId] = useState(preselectedId)

  const [clientName,    setClientName]    = useState('')
  const [clientCompany, setClientCompany] = useState('')
  const [clientEmail,   setClientEmail]   = useState('')
  const [clientPhone,   setClientPhone]   = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [scopeNotes,    setScopeNotes]    = useState('')
  const [startDate,     setStartDate]     = useState(new Date().toISOString().slice(0, 10))
  const [notes,         setNotes]         = useState('')

  useEffect(() => {
    api.getProposals()
      .then(data => setProposals(data as Proposal[]))
      .catch(() => {/* non-critical */})
  }, [])

  const fillFromProposal = useCallback((proposalId: string) => {
    const p = proposals.find(x => x.id === proposalId)
    if (!p) return
    setClientName(p.clientName)
    setClientCompany(p.clientCompany || '')
    setClientEmail(p.clientEmail || '')
    setClientPhone(p.clientPhone || '')
    setClientAddress(p.clientAddress || '')
    setScopeNotes(p.clientNotes || '')
  }, [proposals])

  useEffect(() => {
    if (selectedProposalId) fillFromProposal(selectedProposalId)
  }, [selectedProposalId, fillFromProposal])

  const selectedProposal = proposals.find(p => p.id === selectedProposalId)

  async function handleSave() {
    if (!clientName.trim()) {
      toaster.create({ title: 'Client name is required', type: 'error' }); return
    }
    if (!selectedProposalId) {
      toaster.create({ title: 'Please link a proposal', type: 'error' }); return
    }
    setSaving(true)
    try {
      const payload = {
        proposalId:    selectedProposal?.id     ?? '',
        proposalNo:    selectedProposal?.proposalNo ?? '',
        clientName,
        clientCompany,
        clientEmail,
        clientPhone,
        clientAddress,
        scopeNotes,
        services:      selectedProposal?.services ?? [],
        totalAmount:   selectedProposal?.total    ?? 0,
        startDate,
        notes,
      }
      const booking = await api.createBooking(payload) as Booking

      // Mark proposal as accepted if it isn't already
      if (selectedProposal && selectedProposal.status !== 'accepted') {
        await api.updateProposal(selectedProposal.id, { status: 'accepted' }).catch(() => {})
      }

      toaster.create({ title: `Booking ${booking.bookingNo} created`, type: 'success' })
      navigate(`/bookings/${booking.id}`)
    } catch (err) {
      toaster.create({ title: (err as Error).message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const sortedProposals = [...proposals].sort((a, b) => {
    // accepted proposals first, then by date
    if (a.status === 'accepted' && b.status !== 'accepted') return -1
    if (b.status === 'accepted' && a.status !== 'accepted') return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/bookings')}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--accent)]"
            style={{ color: 'var(--muted-foreground)' }}>
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>New Booking</h1>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--primary)' }}>
          <Save size={15} />
          {saving ? 'Creating…' : 'Create Booking'}
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Link to Proposal */}
          <section className="rounded-xl border p-5 space-y-4"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
            <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>
              Link to Proposal
            </h2>
            <Field label="Select Proposal" required>
              <select value={selectedProposalId}
                onChange={e => setSelectedProposalId(e.target.value)}
                className={inputCls} style={inputStyle}>
                <option value="">— choose a proposal —</option>
                {sortedProposals.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.proposalNo} — {p.clientName}
                    {p.status === 'accepted' ? ' ✓ Accepted' : ` (${p.status})`}
                  </option>
                ))}
              </select>
            </Field>
            {selectedProposal && (
              <div className="rounded-lg px-3 py-2 text-xs"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--muted-foreground)' }}>
                {selectedProposal.services.length} service{selectedProposal.services.length !== 1 ? 's' : ''} ·
                Total: PHP {selectedProposal.total.toLocaleString()}
              </div>
            )}
          </section>

          {/* Client Info */}
          <section className="rounded-xl border p-5 space-y-4"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
            <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>
              Client Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field label="Client Name" required>
                  <input value={clientName} onChange={e => setClientName(e.target.value)}
                    placeholder="Full name" className={inputCls} style={inputStyle} />
                </Field>
              </div>
              <Field label="Company">
                <input value={clientCompany} onChange={e => setClientCompany(e.target.value)}
                  placeholder="Company name" className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Start Date">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Email">
                <input value={clientEmail} onChange={e => setClientEmail(e.target.value)}
                  placeholder="email@example.com" className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Phone">
                <input value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                  placeholder="+63 9XX XXX XXXX" className={inputCls} style={inputStyle} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Address">
                  <input value={clientAddress} onChange={e => setClientAddress(e.target.value)}
                    placeholder="Full address" className={inputCls} style={inputStyle} />
                </Field>
              </div>
            </div>
          </section>

          {/* Scope + Notes */}
          <section className="rounded-xl border p-5 space-y-4"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
            <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>
              Engagement Details
            </h2>
            <Field label="Scope / Purpose">
              <textarea value={scopeNotes} onChange={e => setScopeNotes(e.target.value)}
                rows={3} placeholder="Describe the scope of the engagement…"
                className={cn(inputCls, 'resize-none')} style={inputStyle} />
            </Field>
            <Field label="Internal Notes">
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                rows={2} placeholder="Internal notes (not shown to client)"
                className={cn(inputCls, 'resize-none')} style={inputStyle} />
            </Field>
          </section>

          <div className="flex justify-end gap-3 pb-4">
            <button onClick={() => navigate('/bookings')}
              className="px-4 py-2 rounded-lg text-sm border transition-colors hover:bg-[var(--accent)]"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--primary)' }}>
              <Save size={15} />
              {saving ? 'Creating…' : 'Create Booking'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
