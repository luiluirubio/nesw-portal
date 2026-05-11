import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Download, PenLine, Trash2, X, BookmarkPlus, Search, ChevronDown, Eye } from 'lucide-react'
import { api } from '@/lib/api'
import { toaster } from '@/components/ui/toast'
import { cn, formatPHP, formatDate } from '@/lib/utils'
import type { Proposal, ProposalStatus } from '@/types/proposal'
import { generateProposalPDF } from '@/lib/proposalPdf'
import { fetchDrafts, deleteDraftCloud } from '@/lib/drafts'
import type { ProposalDraft } from '@/types/draft'

// ── Slide-in Proposal Detail Panel ───────────────────────────────────────────
function ProposalDetailPanel({
  proposal,
  onClose,
  onStatusChange,
  onNavigate,
}: {
  proposal: Proposal
  onClose: () => void
  onStatusChange: (p: Proposal, s: ProposalStatus) => void
  onNavigate: (id: string) => void
}) {
  const STATUS_COLORS: Record<ProposalStatus, { bg: string; text: string }> = {
    draft:    { bg: '#f3f4f6', text: '#4b5563' },
    sent:     { bg: '#dbeafe', text: '#1d4ed8' },
    accepted: { bg: '#dcfce7', text: '#15803d' },
    declined: { bg: '#fee2e2', text: '#dc2626' },
  }
  const sc = STATUS_COLORS[proposal.status]

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        style={{ animation: 'fadeIn 0.15s ease' }}
        onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[520px] md:w-[600px] flex flex-col shadow-2xl"
        style={{ backgroundColor: 'var(--background)', animation: 'slideInRight 0.25s cubic-bezier(0.32,0.72,0,1)' }}>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--border)' }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-base font-bold" style={{ color: 'var(--primary)' }}>
                {proposal.proposalNo}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ backgroundColor: sc.bg, color: sc.text }}>
                {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
              </span>
            </div>
            <p className="text-sm font-semibold mt-0.5 truncate" style={{ color: 'var(--foreground)' }}>
              {proposal.clientName}
            </p>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {formatDate(proposal.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => generateProposalPDF(proposal)}
              title="Download Proposal"
              className="p-2 rounded-lg transition-colors hover:bg-[var(--accent)] text-xs flex items-center gap-1.5 font-medium border"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              <Download size={14} /> Download
            </button>
            {proposal.status === 'accepted' && (
              <button onClick={() => onNavigate(proposal.id)}
                title="Create Booking"
                className="p-2 rounded-lg transition-colors font-medium text-xs flex items-center gap-1.5 border"
                style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                <BookmarkPlus size={14} /> Book
              </button>
            )}
            <button onClick={onClose}
              className="p-2 rounded-lg transition-colors hover:bg-[var(--accent)]"
              style={{ color: 'var(--muted-foreground)' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Status changer */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Status</span>
            <select
              value={proposal.status}
              onChange={e => onStatusChange(proposal, e.target.value as ProposalStatus)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border-0 cursor-pointer"
              style={{ backgroundColor: sc.bg, color: sc.text }}>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="declined">Declined</option>
            </select>
          </div>

          {/* Client */}
          <section>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--muted-foreground)' }}>Client</p>
            <div className="rounded-xl border p-4 space-y-1"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
              <p className="font-semibold" style={{ color: 'var(--foreground)' }}>{proposal.clientName}</p>
              {proposal.clientCompany && <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{proposal.clientCompany}</p>}
              {proposal.clientEmail && <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{proposal.clientEmail}</p>}
              {proposal.clientPhone && <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{proposal.clientPhone}</p>}
              {proposal.clientAddress && <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{proposal.clientAddress}</p>}
              {proposal.clientNotes && (
                <p className="text-sm mt-1 pt-1 border-t" style={{ color: 'var(--muted-foreground)', borderColor: 'var(--border)' }}>{proposal.clientNotes}</p>
              )}
            </div>
          </section>

          {/* Services */}
          <section>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--muted-foreground)' }}>
              Services ({proposal.services.length})
            </p>
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: 'var(--accent)' }}>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>Service</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>Qty</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {proposal.services.map((svc, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-4 py-2.5">
                        <p className="font-medium" style={{ color: 'var(--foreground)' }}>{svc.name}</p>
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{svc.category}</p>
                      </td>
                      <td className="px-3 py-2.5 text-center text-xs" style={{ color: 'var(--foreground)' }}>{svc.qty}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-xs" style={{ color: 'var(--foreground)' }}>
                        {formatPHP(svc.unitPrice * svc.qty)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Pricing */}
          <section>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--muted-foreground)' }}>Pricing</p>
            <div className="rounded-xl border p-4 space-y-1.5" style={{ borderColor: 'var(--border)' }}>
              <div className="flex justify-between text-sm" style={{ color: 'var(--muted-foreground)' }}>
                <span>Subtotal</span><span style={{ color: 'var(--foreground)' }}>{formatPHP(proposal.subtotal)}</span>
              </div>
              {proposal.discount > 0 && (
                <div className="flex justify-between text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  <span>Discount</span><span className="text-red-500">− {formatPHP(proposal.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-1.5 border-t"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                <span>Total</span>
                <span style={{ color: 'var(--primary)' }}>{formatPHP(proposal.total)}</span>
              </div>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                Valid for {proposal.validityDays} days · VAT Exclusive
              </p>
            </div>
          </section>

          {/* Terms */}
          {proposal.terms && (
            <section>
              <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--muted-foreground)' }}>Terms & Conditions</p>
              <p className="text-xs whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                {proposal.terms}
              </p>
            </section>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn       { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideInRight { from { transform: translateX(100%); opacity:.6 } to { transform: translateX(0); opacity:1 } }
      `}</style>
    </>
  )
}


// Status config matching Listings pattern
const STATUS_CFG: Record<ProposalStatus, { bg: string; text: string; dot: string; bar: string }> = {
  draft:    { bg: 'bg-gray-100',  text: 'text-gray-600',  dot: 'bg-gray-400',  bar: '#9ca3af' },
  sent:     { bg: 'bg-blue-100',  text: 'text-blue-700',  dot: 'bg-blue-500',  bar: '#3b82f6' },
  accepted: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', bar: '#22c55e' },
  declined: { bg: 'bg-red-100',   text: 'text-red-600',   dot: 'bg-red-500',   bar: '#ef4444' },
}

export function Proposals() {
  const navigate = useNavigate()
  const [proposals, setProposals]               = useState<Proposal[]>([])
  const [loading, setLoading]                   = useState(true)
  const [filterStatus, setFilterStatus]         = useState<ProposalStatus | 'all'>('all')
  const [search, setSearch]                     = useState('')
  const [drafts, setDrafts]                     = useState<ProposalDraft[]>([])
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null)

  useEffect(() => {
    api.getProposals()
      .then(data => setProposals(data as Proposal[]))
      .catch(() => toaster.create({ title: 'Failed to load proposals', type: 'error' }))
      .finally(() => setLoading(false))
    fetchDrafts('proposal').then(d => setDrafts(d as ProposalDraft[])).catch(() => {})
  }, [])

  async function handleStatusChange(p: Proposal, status: ProposalStatus) {
    try {
      await api.updateProposal(p.id, { status })
      const updated = { ...p, status }
      setProposals(ps => ps.map(x => x.id === p.id ? updated : x))
      if (selectedProposal?.id === p.id) setSelectedProposal(updated)
    } catch (err) {
      toaster.create({ title: (err as Error).message, type: 'error' })
    }
  }

  function handleDownload(p: Proposal) {
    try { generateProposalPDF(p) }
    catch { toaster.create({ title: 'Failed to generate PDF', type: 'error' }) }
  }

  const filtered = proposals.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false
    const q = search.toLowerCase()
    if (q && !p.clientName.toLowerCase().includes(q) && !p.proposalNo.toLowerCase().includes(q) &&
        !(p.clientCompany ?? '').toLowerCase().includes(q)) return false
    return true
  })

  const total = proposals.length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 gap-3">
        <div className="w-5 h-5 border-2 border-t-[var(--primary)] border-[var(--muted)] rounded-full animate-spin" />
        <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Loading proposals…</span>
      </div>
    )
  }

  return (
    <div className="space-y-4 px-6 py-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Proposals</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            {filtered.length} of {total} proposal{total !== 1 ? 's' : ''} · newest first
          </p>
        </div>
        <button onClick={() => navigate('/add-proposal')}
          className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] text-sm font-bold text-white transition-all hover:opacity-90"
          style={{ backgroundColor: 'var(--primary)' }}>
          <Plus size={15} /> New Proposal
        </button>
      </div>

      {/* Draft Proposals Banner */}
      {drafts.length > 0 && (
        <div className="rounded-[var(--radius)] border overflow-hidden"
          style={{ borderColor: '#f59e0b', backgroundColor: '#fffbeb' }}>
          <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: '#fde68a', backgroundColor: '#fef3c7' }}>
            <PenLine size={14} style={{ color: '#b45309' }} />
            <p className="text-xs font-bold" style={{ color: '#b45309' }}>
              {drafts.length} Incomplete Proposal{drafts.length > 1 ? 's' : ''} — Draft
            </p>
            <span className="text-xs" style={{ color: '#92400e' }}>· Auto-saved. Continue where you left off.</span>
          </div>
          <div className="divide-y" style={{ borderColor: '#fde68a' }}>
            {drafts.map(d => {
              const stepLabel = ['Client Details', 'Select Services', 'Pricing', 'Review'][d.lastStep - 1] ?? `Step ${d.lastStep}`
              const diff = Date.now() - new Date(d.savedAt).getTime()
              const mins = Math.floor(diff / 60000), hrs = Math.floor(mins / 60)
              const savedAgo = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`
              return (
                <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#92400e' }}>
                      {d.client?.name || 'Untitled Proposal'}
                    </p>
                    <p className="text-xs" style={{ color: '#b45309' }}>
                      Stopped at <strong>{stepLabel}</strong> · Saved {savedAgo}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-800">
                      Step {d.lastStep}/4
                    </span>
                    <button onClick={() => navigate(`/add-proposal?draft=${d.id}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold text-white transition-all hover:opacity-90"
                      style={{ backgroundColor: '#b45309' }}>
                      <PenLine size={12} /> Continue
                    </button>
                    <button onClick={() => { deleteDraftCloud(d.id); setDrafts(ds => ds.filter(x => x.id !== d.id)) }}
                      title="Discard draft"
                      className="p-1.5 rounded-[var(--radius-sm)] transition-colors"
                      style={{ color: '#b45309' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#fde68a')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {(['draft', 'sent', 'accepted', 'declined'] as ProposalStatus[]).map(key => {
          const cfg    = STATUS_CFG[key]
          const count  = proposals.filter(p => p.status === key).length
          const pct    = total > 0 ? Math.round((count / total) * 100) : 0
          const active = filterStatus === key
          return (
            <button key={key} onClick={() => setFilterStatus(active ? 'all' : key)}
              className={cn('rounded-[var(--radius)] border p-4 text-left transition-all hover:shadow-md', active ? 'ring-2' : '')}
              style={{ backgroundColor: 'var(--background)', borderColor: active ? cfg.bar : 'var(--border)', outline: active ? `2px solid ${cfg.bar}` : undefined }}>
              <div className="flex items-center justify-between mb-2">
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', cfg.bg, cfg.text)}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </span>
                <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>{pct}%</span>
              </div>
              <p className="text-3xl font-black" style={{ color: 'var(--foreground)' }}>{count}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>proposals</p>
              <div className="mt-3 w-full rounded-full h-1.5" style={{ backgroundColor: 'var(--muted)' }}>
                <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: cfg.bar }} />
              </div>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search client, proposal #…"
            className="pl-8 pr-8 py-2 text-sm rounded-[var(--radius-sm)] focus:outline-none w-56"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }} />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X size={13} style={{ color: 'var(--muted-foreground)' }} />
            </button>
          )}
        </div>

        <div className="relative">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as ProposalStatus | 'all')}
            className="appearance-none pl-3 pr-8 py-2 text-sm rounded-[var(--radius-sm)] focus:outline-none cursor-pointer"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)', minWidth: '140px' }}>
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted-foreground)' }} />
        </div>

        {(filterStatus !== 'all' || search) && (
          <button onClick={() => { setFilterStatus('all'); setSearch('') }}
            className="px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold flex items-center gap-1.5 transition-all"
            style={{ border: '1px solid var(--destructive)', color: 'var(--destructive)', backgroundColor: 'transparent' }}>
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-[var(--radius)] border overflow-hidden"
        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
                {['Proposal #', 'Client', 'Services', 'Total', 'Status', 'Date', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide whitespace-nowrap"
                    style={{ color: 'var(--muted-foreground)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
                    No proposals match your filters.
                  </td>
                </tr>
              ) : filtered.map(p => {
                const sc = STATUS_CFG[p.status]
                return (
                  <tr key={p.id}
                    className="border-b cursor-pointer transition-all"
                    style={{ borderColor: 'var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                    onClick={() => setSelectedProposal(p)}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: 'var(--primary)' }}>
                      {p.proposalNo}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{p.clientName}</p>
                      {p.clientCompany && <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{p.clientCompany}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {p.services.length} service{p.services.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3 font-semibold whitespace-nowrap" style={{ color: 'var(--foreground)' }}>
                      {formatPHP(p.total)}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1', sc.bg, sc.text)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', sc.dot)} />
                        {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--muted-foreground)' }}>
                      {formatDate(p.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <button className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--muted-foreground)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted-foreground)')}>
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {filtered.map(p => {
          const sc = STATUS_CFG[p.status]
          return (
            <div key={p.id} className="rounded-[var(--radius)] border p-4 cursor-pointer transition-colors active:opacity-80"
              style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
              onClick={() => setSelectedProposal(p)}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-mono text-xs font-semibold" style={{ color: 'var(--primary)' }}>{p.proposalNo}</p>
                  <p className="font-semibold text-sm mt-0.5" style={{ color: 'var(--foreground)' }}>{p.clientName}</p>
                  {p.clientCompany && <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{p.clientCompany}</p>}
                </div>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 shrink-0', sc.bg, sc.text)}>
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', sc.dot)} />
                  {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--muted-foreground)' }}>{p.services.length} services · {formatDate(p.createdAt)}</span>
                <span className="font-bold" style={{ color: 'var(--foreground)' }}>{formatPHP(p.total)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Slide-in detail drawer */}
      {selectedProposal && (
        <ProposalDetailPanel
          proposal={selectedProposal}
          onClose={() => setSelectedProposal(null)}
          onStatusChange={handleStatusChange}
          onNavigate={id => { setSelectedProposal(null); navigate(`/add-booking?proposalId=${id}`) }}
        />
      )}
    </div>
  )
}
