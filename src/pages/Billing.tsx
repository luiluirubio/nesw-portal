import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Receipt, Download, Pencil, PenLine, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { toaster } from '@/components/ui/toast'
import { cn, formatPHP } from '@/lib/utils'
import type { Billing, BillingStatus } from '@/types/billing'
import { generateBillingPDF } from '@/lib/billingPdf'
import { fetchDrafts, deleteDraftCloud } from '@/lib/drafts'
import type { BillingDraft } from '@/types/draft'

const STATUS_STYLE: Record<BillingStatus, string> = {
  draft:     'bg-gray-100 text-gray-600',
  sent:      'bg-blue-100 text-blue-700',
  paid:      'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function Billing() {
  const navigate = useNavigate()
  const [billings, setBillings] = useState<Billing[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<BillingStatus | 'all'>('all')
  const [drafts, setDrafts]     = useState<BillingDraft[]>([])

  useEffect(() => {
    api.getBillings()
      .then(data => setBillings(data as Billing[]))
      .catch(() => toaster.create({ title: 'Failed to load billings', type: 'error' }))
      .finally(() => setLoading(false))
    fetchDrafts('billing').then(d => setDrafts(d as BillingDraft[])).catch(() => {})
  }, [])

  const filtered = filter === 'all' ? billings : billings.filter(b => b.status === filter)

  async function handleStatusChange(b: Billing, status: BillingStatus) {
    try {
      await api.updateBilling(b.id, { status })
      setBillings(bs => bs.map(x => x.id === b.id ? { ...x, status } : x))
    } catch (err) {
      toaster.create({ title: (err as Error).message, type: 'error' })
    }
  }

  async function handleDownload(b: Billing) {
    try {
      await generateBillingPDF(b)
    } catch {
      toaster.create({ title: 'Failed to generate PDF', type: 'error' })
    }
  }

  const tabs: { label: string; value: BillingStatus | 'all' }[] = [
    { label: 'All',       value: 'all' },
    { label: 'Draft',     value: 'draft' },
    { label: 'Sent',      value: 'sent' },
    { label: 'Paid',      value: 'paid' },
    { label: 'Cancelled', value: 'cancelled' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <Receipt size={20} style={{ color: 'var(--primary)' }} />
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>Billing</h1>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {billings.length} billing statement{billings.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button onClick={() => navigate('/add-billing')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--primary)' }}>
          <Plus size={15} /> New Billing
        </button>
      </div>

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
                ({billings.filter(b => b.status === t.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">

        {/* Draft Billings Banner */}
        {drafts.length > 0 && (
          <div className="rounded-xl border overflow-hidden mb-4" style={{ borderColor: '#f59e0b', backgroundColor: '#fffbeb' }}>
            <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: '#fde68a', backgroundColor: '#fef3c7' }}>
              <PenLine size={14} style={{ color: '#b45309' }} />
              <p className="text-xs font-bold" style={{ color: '#b45309' }}>
                {drafts.length} Incomplete Billing{drafts.length > 1 ? 's' : ''} — Draft
              </p>
              <span className="text-xs" style={{ color: '#92400e' }}>· Auto-saved. Continue where you left off.</span>
            </div>
            <div className="divide-y" style={{ borderColor: '#fde68a' }}>
              {drafts.map(d => {
                const diff = Date.now() - new Date(d.savedAt).getTime()
                const mins = Math.floor(diff / 60000), hrs = Math.floor(mins / 60)
                const savedAgo = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`
                return (
                  <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: '#92400e' }}>
                        {d.clientName || 'Untitled Billing'}
                        {d.linkedBookingNo && <span className="font-mono ml-2 text-xs">({d.linkedBookingNo})</span>}
                      </p>
                      <p className="text-xs" style={{ color: '#b45309' }}>Saved {savedAgo}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => navigate(`/add-billing?draft=${d.id}`)}
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
            Loading billings…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2"
            style={{ color: 'var(--muted-foreground)' }}>
            <Receipt size={32} className="opacity-30" />
            <p className="text-sm">No billing statements yet</p>
            <button onClick={() => navigate('/add-billing')}
              className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
              + Create your first billing
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
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Billing #</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Client</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Booking / Purpose</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Date Issued</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">Total</th>
                    <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wide">Status</th>
                    <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b, i) => (
                    <tr key={b.id}
                      className="border-t transition-colors hover:bg-[var(--accent)]"
                      style={{ borderColor: 'var(--border)', backgroundColor: i % 2 === 0 ? 'var(--background)' : 'transparent' }}>
                      <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: 'var(--primary)' }}>
                        {b.billingNo}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium" style={{ color: 'var(--foreground)' }}>{b.clientName}</p>
                        {b.clientCompany && <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{b.clientCompany}</p>}
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        {b.bookingNo
                          ? <p className="font-mono text-xs font-semibold" style={{ color: 'var(--primary)' }}>{b.bookingNo}</p>
                          : <p className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>{b.servicePurpose || '—'}</p>
                        }
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        {b.dateIssued ? formatDate(b.dateIssued) : formatDate(b.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold" style={{ color: 'var(--foreground)' }}>
                        {formatPHP(b.total)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <select
                          value={b.status}
                          onChange={e => handleStatusChange(b, e.target.value as BillingStatus)}
                          className={cn('px-2 py-0.5 rounded-full text-xs font-semibold border-0 cursor-pointer', STATUS_STYLE[b.status])}
                          onClick={e => e.stopPropagation()}>
                          <option value="draft">Draft</option>
                          <option value="sent">Sent</option>
                          <option value="paid">Paid</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => navigate(`/billing/${b.id}/edit`)}
                            title="Edit"
                            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--border)]"
                            style={{ color: 'var(--muted-foreground)' }}>
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDownload(b)}
                            title="Download PDF"
                            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--border)]"
                            style={{ color: 'var(--muted-foreground)' }}>
                            <Download size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden flex flex-col gap-3">
              {filtered.map(b => (
                <div key={b.id} className="rounded-xl border p-4"
                  style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-mono text-xs font-semibold" style={{ color: 'var(--primary)' }}>{b.billingNo}</p>
                      <p className="font-semibold text-sm mt-0.5" style={{ color: 'var(--foreground)' }}>{b.clientName}</p>
                      {b.clientCompany && <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{b.clientCompany}</p>}
                    </div>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold shrink-0', STATUS_STYLE[b.status])}>
                      {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                    </span>
                  </div>
                  {b.servicePurpose && (
                    <p className="text-xs mb-2 truncate" style={{ color: 'var(--muted-foreground)' }}>{b.servicePurpose}</p>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--muted-foreground)' }}>
                      {b.items.length} item{b.items.length !== 1 ? 's' : ''} · {b.dateIssued ? formatDate(b.dateIssued) : formatDate(b.createdAt)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold" style={{ color: 'var(--foreground)' }}>{formatPHP(b.total)}</span>
                      <button onClick={() => navigate(`/billing/${b.id}/edit`)}
                        className="p-1.5 rounded-lg hover:bg-[var(--accent)]"
                        style={{ color: 'var(--muted-foreground)' }}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDownload(b)}
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
    </div>
  )
}
