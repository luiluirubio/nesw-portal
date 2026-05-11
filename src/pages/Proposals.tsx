import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Download, PenLine, Trash2, X, BookmarkPlus } from 'lucide-react'
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

const STATUS_STYLE: Record<ProposalStatus, string> = {
  draft:    'bg-gray-100 text-gray-600',
  sent:     'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-600',
}


export function Proposals() {
  const navigate = useNavigate()
  const [proposals, setProposals]           = useState<Proposal[]>([])
  const [loading, setLoading]               = useState(true)
  const [filter, setFilter]                 = useState<ProposalStatus | 'all'>('all')
  const [drafts, setDrafts]                 = useState<ProposalDraft[]>([])
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null)

  useEffect(() => {
    api.getProposals()
      .then(data => setProposals(data as Proposal[]))
      .catch(() => toaster.create({ title: 'Failed to load proposals', type: 'error' }))
      .finally(() => setLoading(false))
    fetchDrafts('proposal').then(d => setDrafts(d as ProposalDraft[])).catch(() => {})
  }, [])

  const filtered = filter === 'all' ? proposals : proposals.filter(p => p.status === filter)

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
    try {
      generateProposalPDF(p)
    } catch {
      toaster.create({ title: 'Failed to generate PDF', type: 'error' })
    }
  }

  const tabs: { label: string; value: ProposalStatus | 'all' }[] = [
    { label: 'All', value: 'all' },
    { label: 'Draft', value: 'draft' },
    { label: 'Sent', value: 'sent' },
    { label: 'Accepted', value: 'accepted' },
    { label: 'Declined', value: 'declined' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <FileText size={20} style={{ color: 'var(--primary)' }} />
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>Proposals</h1>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {proposals.length} proposal{proposals.length !== 1 ? 's' : ''} · newest first
            </p>
          </div>
        </div>
        <button onClick={() => navigate('/add-proposal')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--primary)' }}>
          <Plus size={15} /> New Proposal
        </button>
      </div>

      {/* Stat cards */}
      {!loading && proposals.length > 0 && (() => {
        const statuses: { value: ProposalStatus; label: string; color: string; bar: string }[] = [
          { value: 'draft',    label: 'Draft',    color: '#6b7280', bar: 'bg-gray-400'  },
          { value: 'sent',     label: 'Sent',     color: '#3b82f6', bar: 'bg-blue-500'  },
          { value: 'accepted', label: 'Accepted', color: '#22c55e', bar: 'bg-green-500' },
          { value: 'declined', label: 'Declined', color: '#ef4444', bar: 'bg-red-500'   },
        ]
        const total = proposals.length
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 py-4 border-b shrink-0"
            style={{ borderColor: 'var(--border)' }}>
            {statuses.map(s => {
              const count = proposals.filter(p => p.status === s.value).length
              const pct   = total > 0 ? Math.round((count / total) * 100) : 0
              const active = filter === s.value
              return (
                <button key={s.value} onClick={() => setFilter(active ? 'all' : s.value)}
                  className="rounded-xl border p-4 text-left transition-all hover:shadow-sm"
                  style={{
                    borderColor:     active ? s.color : 'var(--border)',
                    backgroundColor: active ? `${s.color}10` : 'var(--background)',
                  }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold" style={{ color: s.color }}>{s.label}</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>{pct}%</span>
                  </div>
                  <p className="text-2xl font-black mb-0.5" style={{ color: 'var(--foreground)' }}>{count}</p>
                  <p className="text-xs mb-2" style={{ color: 'var(--muted-foreground)' }}>proposals</p>
                  <div className="h-1 rounded-full" style={{ backgroundColor: 'var(--border)' }}>
                    <div className={cn('h-1 rounded-full transition-all', s.bar)} style={{ width: `${pct}%` }} />
                  </div>
                </button>
              )
            })}
          </div>
        )
      })()}

      {/* Status tabs */}
      <div className="flex gap-1 px-6 py-3 border-b overflow-x-auto shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        {tabs.map(t => (
          <button key={t.value} onClick={() => setFilter(t.value)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors')}
            style={{
              backgroundColor: filter === t.value ? 'var(--primary)' : 'var(--accent)',
              color: filter === t.value ? 'var(--primary-foreground)' : 'var(--foreground)',
            }}>
            {t.label}
            {t.value !== 'all' && (
              <span className="ml-1 opacity-70">
                ({proposals.filter(p => p.status === t.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">

        {/* Draft Proposals Banner */}
        {drafts.length > 0 && (
          <div className="rounded-xl border overflow-hidden mb-4" style={{ borderColor: '#f59e0b', backgroundColor: '#fffbeb' }}>
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
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-90"
                        style={{ backgroundColor: '#b45309' }}>
                        <PenLine size={12} /> Continue
                      </button>
                      <button onClick={() => { deleteDraftCloud(d.id); setDrafts(ds => ds.filter(x => x.id !== d.id)) }}
                        title="Discard draft"
                        className="p-1.5 rounded-lg transition-colors"
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

        {loading ? (
          <div className="flex items-center justify-center h-40" style={{ color: 'var(--muted-foreground)' }}>
            Loading proposals…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2"
            style={{ color: 'var(--muted-foreground)' }}>
            <FileText size={32} className="opacity-30" />
            <p className="text-sm">No proposals yet</p>
            <button onClick={() => navigate('/add-proposal')}
              className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
              + Create your first proposal
            </button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-xl border overflow-hidden"
              style={{ borderColor: 'var(--border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: 'var(--accent)', color: 'var(--muted-foreground)' }}>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Proposal #</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Client</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Services</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">Total</th>
                    <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Date</th>
                    <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr key={p.id}
                      className="border-t cursor-pointer transition-all"
                      style={{ borderColor: 'var(--border)', backgroundColor: i % 2 === 0 ? 'var(--background)' : 'transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = i % 2 === 0 ? 'var(--background)' : 'transparent')}
                      onClick={() => setSelectedProposal(p)}>
                      <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: 'var(--primary)' }}>
                        {p.proposalNo}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium" style={{ color: 'var(--foreground)' }}>{p.clientName}</p>
                        {p.clientCompany && <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{p.clientCompany}</p>}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--muted-foreground)' }}>
                        {p.services.length} service{p.services.length !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold" style={{ color: 'var(--foreground)' }}>
                        {formatPHP(p.total)}
                      </td>
                      <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <select
                          value={p.status}
                          onChange={e => handleStatusChange(p, e.target.value as ProposalStatus)}
                          className={cn('px-2 py-0.5 rounded-full text-xs font-semibold border-0 cursor-pointer', STATUS_STYLE[p.status])}>
                          <option value="draft">Draft</option>
                          <option value="sent">Sent</option>
                          <option value="accepted">Accepted</option>
                          <option value="declined">Declined</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        {formatDate(p.createdAt)}
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleDownload(p)}
                          title="Download Proposal"
                          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--border)]"
                          style={{ color: 'var(--muted-foreground)' }}>
                          <Download size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden flex flex-col gap-3">
              {filtered.map(p => (
                <div key={p.id} className="rounded-xl border p-4 cursor-pointer transition-colors active:opacity-80"
                  style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                  onClick={() => setSelectedProposal(p)}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-mono text-xs font-semibold" style={{ color: 'var(--primary)' }}>{p.proposalNo}</p>
                      <p className="font-semibold text-sm mt-0.5" style={{ color: 'var(--foreground)' }}>{p.clientName}</p>
                      {p.clientCompany && <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{p.clientCompany}</p>}
                    </div>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold shrink-0', STATUS_STYLE[p.status])}>
                      {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--muted-foreground)' }}>{p.services.length} services · {formatDate(p.createdAt)}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold" style={{ color: 'var(--foreground)' }}>{formatPHP(p.total)}</span>
                      <button onClick={e => { e.stopPropagation(); handleDownload(p) }}
                        className="p-1.5 rounded-lg hover:bg-[var(--accent)]"
                        style={{ color: 'var(--muted-foreground)' }}>
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
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
