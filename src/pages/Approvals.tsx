import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Eye, Clock, Building2, MapPin } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { formatPHP, daysSince, cn } from '@/lib/utils'
import { toaster } from '@/components/ui/toast'
import { api } from '@/lib/api'
import type { Property } from '@/types/property'

const typeLabels: Record<string, string> = {
  house_and_lot: 'House & Lot',
  condo:         'Condo',
  lot_only:      'Lot Only',
  commercial:    'Commercial',
  townhouse:     'Townhouse',
  warehouse:     'Warehouse',
  farm_lot:      'Farm Lot',
}

export function Approvals() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin'

  const [properties, setProperties] = useState<Property[]>([])
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set())
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set())
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)

  useEffect(() => {
    api.getProperties().then(d => setProperties(d as Property[])).catch(() => {})
  }, [])

  const pending  = properties.filter(p => p.status === 'available' && !approvedIds.has(p.id) && !rejectedIds.has(p.id))
  const approved = properties.filter(p => approvedIds.has(p.id))
  const rejected = properties.filter(p => rejectedIds.has(p.id))

  function handleApprove(id: string) {
    setApprovedIds(prev => new Set([...prev, id]))
    const prop = properties.find(p => p.id === id)
    toaster.create({ type: 'success', title: 'Listing Approved', description: `"${prop?.title}" has been approved and published.` })
  }

  function handleReject(id: string) {
    setRejectedIds(prev => new Set([...prev, id]))
    const prop = properties.find(p => p.id === id)
    toaster.create({ type: 'error', title: 'Listing Rejected', description: `"${prop?.title}" has been sent back for revision.` })
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Approvals</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
          Review and approve new property listings before they go live
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending Review', count: pending.length, color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700' },
          { label: 'Approved',       count: approved.length, color: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700' },
          { label: 'Rejected',       count: rejected.length, color: '#ef4444', bg: 'bg-red-50',     text: 'text-red-700'     },
        ].map(({ label, count, bg, text }) => (
          <div key={label} className="rounded-[var(--radius)] border p-4"
            style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted-foreground)' }}>{label}</p>
            <p className="text-3xl font-black" style={{ color: 'var(--foreground)' }}>{count}</p>
            <div className="mt-2">
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', bg, text)}>{label}</span>
            </div>
          </div>
        ))}
      </div>

      {!isAdmin && (
        <div className="rounded-[var(--radius)] border p-8 text-center"
          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
          <Building2 size={32} className="mx-auto mb-3" style={{ color: 'var(--muted-foreground)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Access Restricted</p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Only Senior Agents, Branch Managers, and Super Admins can approve listings.
          </p>
        </div>
      )}

      {isAdmin && (
        <>
          {/* Pending */}
          <div className="rounded-[var(--radius)] border overflow-hidden"
            style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
            <div className="px-4 py-3 border-b flex items-center gap-2"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
              <Clock size={15} style={{ color: '#f59e0b' }} />
              <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                Pending Review
              </p>
              {pending.length > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-black bg-amber-500 text-white">
                  {pending.length}
                </span>
              )}
            </div>

            {pending.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle size={28} className="mx-auto mb-2 text-emerald-500" />
                <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>All caught up!</p>
                <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>No listings pending review.</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {pending.map(p => {
                  const days = daysSince(p.dateListed)
                  return (
                    <div key={p.id} className="px-4 py-4 flex items-center gap-4 transition-colors"
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>

                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: 'var(--accent)', border: '1px solid var(--border)' }}>
                        <Building2 size={18} style={{ color: 'var(--primary)' }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{p.title}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                            style={{ backgroundColor: 'var(--accent)', color: 'var(--muted-foreground)' }}>
                            {typeLabels[p.type]}
                          </span>
                          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                            <MapPin size={10} />{p.location.city}
                          </span>
                          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                            <Clock size={10} />{days}d ago
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                          {p.listingType === 'for_rent' ? `${formatPHP(p.price)}/mo` : formatPHP(p.price)}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{p.agentName ?? p.agentId}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setSelectedProperty(p)}
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: 'var(--muted-foreground)', backgroundColor: 'var(--accent)' }}
                          title="Preview">
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handleApprove(p.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
                          style={{ backgroundColor: '#10b981' }}>
                          <CheckCircle size={13} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(p.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
                          style={{ backgroundColor: '#ef4444' }}>
                          <XCircle size={13} />
                          Reject
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Approved */}
          {approved.length > 0 && (
            <div className="rounded-[var(--radius)] border overflow-hidden"
              style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
              <div className="px-4 py-3 border-b flex items-center gap-2"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
                <CheckCircle size={15} className="text-emerald-500" />
                <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>Approved This Session</p>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {approved.map(p => (
                  <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                    <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                    <span className="text-sm font-medium flex-1 truncate" style={{ color: 'var(--foreground)' }}>{p.title}</span>
                    <span className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>
                      {p.listingType === 'for_rent' ? `${formatPHP(p.price)}/mo` : formatPHP(p.price)}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">Approved</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejected */}
          {rejected.length > 0 && (
            <div className="rounded-[var(--radius)] border overflow-hidden"
              style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
              <div className="px-4 py-3 border-b flex items-center gap-2"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
                <XCircle size={15} className="text-red-500" />
                <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>Rejected This Session</p>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {rejected.map(p => (
                  <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                    <XCircle size={16} className="text-red-500 shrink-0" />
                    <span className="text-sm font-medium flex-1 truncate" style={{ color: 'var(--foreground)' }}>{p.title}</span>
                    <span className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>
                      {p.listingType === 'for_rent' ? `${formatPHP(p.price)}/mo` : formatPHP(p.price)}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">Rejected</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Preview panel placeholder */}
      {selectedProperty && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedProperty(null)} />
          <div className="fixed inset-y-0 right-0 z-50 w-96 flex flex-col shadow-2xl p-6"
            style={{ backgroundColor: 'var(--background)', animation: 'slideInRight 0.25s cubic-bezier(0.32,0.72,0,1)' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold" style={{ color: 'var(--foreground)' }}>Listing Preview</p>
              <button onClick={() => setSelectedProperty(null)} style={{ color: 'var(--muted-foreground)' }}>
                <XCircle size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{selectedProperty.title}</p>
              <p className="text-xl font-black" style={{ color: 'var(--primary)' }}>
                {selectedProperty.listingType === 'for_rent' ? `${formatPHP(selectedProperty.price)}/mo` : formatPHP(selectedProperty.price)}
              </p>
              <p className="text-xs flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                <MapPin size={10} />
                {selectedProperty.location.address}, {selectedProperty.location.city}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>{selectedProperty.description}</p>
              <div className="flex flex-wrap gap-1.5 pt-2">
                {selectedProperty.features.map(f => (
                  <span key={f} className="px-2 py-0.5 rounded-full text-xs"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--foreground)', border: '1px solid var(--border)' }}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <style>{`
            @keyframes slideInRight { from { transform: translateX(100%); opacity:.6 } to { transform: translateX(0); opacity:1 } }
          `}</style>
        </>
      )}
    </div>
  )
}
