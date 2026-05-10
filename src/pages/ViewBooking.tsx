import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, Plus, Download } from 'lucide-react'
import { api } from '@/lib/api'
import { toaster } from '@/components/ui/toast'
import { cn, formatPHP } from '@/lib/utils'
import type { Booking, BookingStatus } from '@/types/booking'
import type { Billing, BillingStatus } from '@/types/billing'
import { generateBillingPDF } from '@/lib/billingPdf'

const BOOKING_STATUS_STYLE: Record<BookingStatus, string> = {
  draft:     'bg-gray-100 text-gray-600',
  active:    'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-600',
}

const BILLING_STATUS_STYLE: Record<BillingStatus, string> = {
  draft:     'bg-gray-100 text-gray-600',
  sent:      'bg-blue-100 text-blue-700',
  paid:      'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-1.5">
      <span className="text-xs font-semibold w-28 shrink-0" style={{ color: 'var(--muted-foreground)' }}>{label}</span>
      <span className="text-sm" style={{ color: 'var(--foreground)' }}>{value}</span>
    </div>
  )
}

export function ViewBooking() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const [booking,  setBooking]  = useState<Booking | null>(null)
  const [billings, setBillings] = useState<Billing[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.getBooking(id),
      api.getBillings(),
    ])
      .then(([bkg, bills]) => {
        setBooking(bkg as Booking)
        const linked = (bills as Billing[]).filter(b => b.bookingId === id)
        setBillings(linked)
      })
      .catch(() => {
        toaster.create({ title: 'Failed to load booking', type: 'error' })
        navigate('/bookings')
      })
      .finally(() => setLoading(false))
  }, [id, navigate])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: 'var(--muted-foreground)' }}>
        Loading booking…
      </div>
    )
  }

  if (!booking) return null

  // Compute billing totals
  const totalDebits  = billings.reduce((sum, b) => {
    const debits = b.items.filter(i => (i as { type?: string }).type !== 'credit')
      .reduce((s, i) => s + i.amount, 0)
    return sum + debits
  }, 0)
  const totalCredits = billings.reduce((sum, b) => {
    const credits = b.items.filter(i => (i as { type?: string }).type === 'credit')
      .reduce((s, i) => s + i.amount, 0)
    return sum + credits
  }, 0)
  const netBalance = totalDebits - totalCredits

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 flex-wrap gap-3"
        style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/bookings')}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--accent)]"
            style={{ color: 'var(--muted-foreground)' }}>
            <ArrowLeft size={16} />
          </button>
          <BookOpen size={20} style={{ color: 'var(--primary)' }} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold font-mono" style={{ color: 'var(--primary)' }}>
                {booking.bookingNo}
              </h1>
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', BOOKING_STATUS_STYLE[booking.status])}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {booking.clientName} · Started {booking.startDate ? formatDate(booking.startDate) : '—'}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/add-billing?bookingId=${booking.id}&bookingNo=${booking.bookingNo}&clientName=${encodeURIComponent(booking.clientName)}`)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--primary)' }}>
          <Plus size={15} /> New Billing
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Booking details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="rounded-xl border p-5"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
              <h2 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--muted-foreground)' }}>
                Client
              </h2>
              <InfoRow label="Name"     value={booking.clientName} />
              <InfoRow label="Company"  value={booking.clientCompany} />
              <InfoRow label="Email"    value={booking.clientEmail} />
              <InfoRow label="Phone"    value={booking.clientPhone} />
              <InfoRow label="Address"  value={booking.clientAddress} />
            </section>

            <section className="rounded-xl border p-5"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
              <h2 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--muted-foreground)' }}>
                Engagement
              </h2>
              <InfoRow label="Proposal"   value={booking.proposalNo} />
              <InfoRow label="Start Date" value={booking.startDate ? formatDate(booking.startDate) : ''} />
              <InfoRow label="Scope"      value={booking.scopeNotes} />
              <InfoRow label="Notes"      value={booking.notes} />
              <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--muted-foreground)' }}>Contract Value</span>
                  <span className="font-bold" style={{ color: 'var(--foreground)' }}>{formatPHP(booking.totalAmount)}</span>
                </div>
              </div>
            </section>
          </div>

          {/* Services */}
          {booking.services?.length > 0 && (
            <section className="rounded-xl border overflow-hidden"
              style={{ borderColor: 'var(--border)' }}>
              <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--accent)' }}>
                <h2 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
                  Services ({booking.services.length})
                </h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: 'var(--accent)' }}>
                    <th className="text-left px-4 py-2 text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>Service</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>Category</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {booking.services.map((svc, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>{svc.name}</p>
                        {svc.notes && <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{svc.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>{svc.category}</td>
                      <td className="px-4 py-3 text-right font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                        {formatPHP(svc.unitPrice * svc.qty)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Billing summary */}
          <section className="rounded-xl border overflow-hidden"
            style={{ borderColor: 'var(--border)' }}>
            <div className="px-5 py-3 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--accent)' }}>
              <h2 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
                Billing Statements ({billings.length})
              </h2>
              <button
                onClick={() => navigate(`/add-billing?bookingId=${booking.id}&bookingNo=${booking.bookingNo}&clientName=${encodeURIComponent(booking.clientName)}`)}
                className="flex items-center gap-1 text-xs font-medium"
                style={{ color: 'var(--primary)' }}>
                <Plus size={12} /> Add Billing
              </button>
            </div>

            {billings.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
                No billing statements yet for this booking.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: 'var(--accent)' }}>
                    <th className="text-left px-4 py-2 text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>Billing #</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>Date</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>Debits</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>Credits</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>Status</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {billings.map((b, i) => {
                    const debits  = b.items.filter(it => (it as { type?: string }).type !== 'credit').reduce((s, it) => s + it.amount, 0)
                    const credits = b.items.filter(it => (it as { type?: string }).type === 'credit').reduce((s, it) => s + it.amount, 0)
                    return (
                      <tr key={b.id} className="border-t"
                        style={{ borderColor: 'var(--border)', backgroundColor: i % 2 === 0 ? 'var(--background)' : 'transparent' }}>
                        <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: 'var(--primary)' }}>
                          {b.billingNo}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          {b.dateIssued ? formatDate(b.dateIssued) : formatDate(b.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
                          {debits > 0 ? formatPHP(debits) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          {credits > 0 ? `(${formatPHP(credits)})` : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', BILLING_STATUS_STYLE[b.status])}>
                            {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => generateBillingPDF(b)}
                            className="p-1 rounded hover:bg-[var(--accent)]"
                            style={{ color: 'var(--muted-foreground)' }}>
                            <Download size={13} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}

            {/* Running totals */}
            <div className="border-t px-5 py-4 space-y-1" style={{ borderColor: 'var(--border)' }}>
              <div className="flex justify-between text-sm" style={{ color: 'var(--muted-foreground)' }}>
                <span>Total Billed (Debits)</span>
                <span>{formatPHP(totalDebits)}</span>
              </div>
              <div className="flex justify-between text-sm" style={{ color: 'var(--muted-foreground)' }}>
                <span>Total Received (Credits)</span>
                <span>({formatPHP(totalCredits)})</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                <span>Outstanding Balance</span>
                <span style={{ color: netBalance > 0 ? 'var(--primary)' : 'var(--foreground)' }}>
                  {formatPHP(netBalance)}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
