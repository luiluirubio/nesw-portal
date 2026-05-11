import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Pencil, BookmarkPlus, FileText } from 'lucide-react'
import { api } from '@/lib/api'
import { toaster } from '@/components/ui/toast'
import { cn, formatPHP, formatDate } from '@/lib/utils'
import type { Proposal, ProposalStatus } from '@/types/proposal'
import { generateProposalPDF } from '@/lib/proposalPdf'

const STATUS_STYLE: Record<ProposalStatus, string> = {
  draft:    'bg-gray-100 text-gray-600',
  sent:     'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-600',
}


function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
      <span className="text-xs font-semibold w-36 shrink-0 pt-0.5" style={{ color: 'var(--muted-foreground)' }}>
        {label}
      </span>
      <span className="text-sm flex-1" style={{ color: 'var(--foreground)' }}>{value}</span>
    </div>
  )
}

export function ViewProposal() {
  const { id }       = useParams<{ id: string }>()
  const navigate     = useNavigate()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!id) return
    api.getProposal(id)
      .then(data => setProposal(data as Proposal))
      .catch(() => {
        toaster.create({ title: 'Proposal not found', type: 'error' })
        navigate('/proposals')
      })
      .finally(() => setLoading(false))
  }, [id, navigate])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: 'var(--muted-foreground)' }}>
        Loading proposal…
      </div>
    )
  }

  if (!proposal) return null

  const subtotal = proposal.subtotal ?? proposal.services.reduce((s, sv) => s + sv.unitPrice * sv.qty, 0)
  const total    = proposal.total ?? subtotal - proposal.discount

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 flex-wrap gap-3"
        style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/proposals')}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--accent)]"
            style={{ color: 'var(--muted-foreground)' }}>
            <ArrowLeft size={16} />
          </button>
          <FileText size={20} style={{ color: 'var(--primary)' }} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold font-mono" style={{ color: 'var(--primary)' }}>
                {proposal.proposalNo}
              </h1>
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', STATUS_STYLE[proposal.status])}>
                {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {proposal.clientName} · {formatDate(proposal.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(proposal.status === 'draft' || proposal.status === 'sent') && (
            <button onClick={() => navigate(`/add-proposal?edit=${proposal.id}`)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors hover:bg-[var(--accent)]"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              <Pencil size={14} /> Edit
            </button>
          )}
          {proposal.status === 'accepted' && (
            <button onClick={() => navigate(`/add-booking?proposalId=${proposal.id}`)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition-colors hover:bg-[var(--accent)]"
              style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
              <BookmarkPlus size={14} /> Create Booking
            </button>
          )}
          <button onClick={() => generateProposalPDF(proposal).catch(() => {})}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--primary)' }}>
            <Download size={14} /> Download Proposal
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Client Info */}
          <section className="rounded-xl border p-5"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
            <h2 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--muted-foreground)' }}>
              Client Information
            </h2>
            <InfoRow label="Client Name"    value={proposal.clientName} />
            <InfoRow label="Company"        value={proposal.clientCompany} />
            <InfoRow label="Email"          value={proposal.clientEmail} />
            <InfoRow label="Phone"          value={proposal.clientPhone} />
            <InfoRow label="Address"        value={proposal.clientAddress} />
            <InfoRow label="Notes"          value={proposal.clientNotes} />
          </section>

          {/* Services */}
          <section className="rounded-xl border overflow-hidden"
            style={{ borderColor: 'var(--border)' }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--accent)' }}>
              <h2 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
                Scope of Services
              </h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--accent)' }}>
                  <th className="text-left px-4 py-2 text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>Service</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>Category</th>
                  <th className="text-center px-4 py-2 text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>Qty</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>Unit Price</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {proposal.services.map((svc, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>{svc.name}</p>
                      {svc.notes && <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{svc.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>{svc.category}</td>
                    <td className="px-4 py-3 text-xs text-center" style={{ color: 'var(--foreground)' }}>{svc.qty}</td>
                    <td className="px-4 py-3 text-xs text-right" style={{ color: 'var(--foreground)' }}>{formatPHP(svc.unitPrice)}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold" style={{ color: 'var(--foreground)' }}>
                      {formatPHP(svc.unitPrice * svc.qty)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Pricing */}
          <section className="rounded-xl border p-5"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
            <h2 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--muted-foreground)' }}>
              Pricing Summary
            </h2>
            <div className="space-y-2 max-w-xs ml-auto">
              <div className="flex justify-between text-sm" style={{ color: 'var(--muted-foreground)' }}>
                <span>Subtotal</span><span>{formatPHP(subtotal)}</span>
              </div>
              {proposal.discount > 0 && (
                <div className="flex justify-between text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  <span>Discount</span><span>− {formatPHP(proposal.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-2 border-t"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                <span>Total</span>
                <span style={{ color: 'var(--primary)' }}>{formatPHP(total)}</span>
              </div>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                Valid for {proposal.validityDays} days from date of issue
              </p>
            </div>
          </section>

          {/* Terms */}
          {proposal.terms && (
            <section className="rounded-xl border p-5"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
              <h2 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--muted-foreground)' }}>
                Terms & Conditions
              </h2>
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--foreground)' }}>
                {proposal.terms}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
