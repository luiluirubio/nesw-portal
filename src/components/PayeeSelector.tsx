import { useState, useEffect, useRef } from 'react'
import { Search, X, UserCheck } from 'lucide-react'
import { inputStyle } from '@/lib/utils'
import type { Payee } from '@/types/payee'
import { loadPayees } from '@/lib/payees'

// Mirrors ClientSelector (Proposal step 1): search the Payee master data by
// account number or name. Selecting auto-fills details on the next step.
// Creating a brand-new payee is done via the form's "Skip" → Payee Details step.

interface PayeeSelectorProps {
  value:    Payee | null
  onSelect: (payee: Payee) => void
  onClear:  () => void
}

export function PayeeSelector({ value, onSelect, onClear }: PayeeSelectorProps) {
  const [payees, setPayees] = useState<Payee[]>([])
  const [query, setQuery]   = useState('')
  const [open, setOpen]     = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setPayees(loadPayees()) }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = payees.filter(p => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      p.accountNumber?.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      (p.company ?? '').toLowerCase().includes(q)
    )
  }).slice(0, 8)

  // Selected state
  if (value && !open) {
    return (
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
          Payee <span className="text-red-500 ml-0.5">*</span>
        </label>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border"
          style={{ borderColor: 'var(--primary)', backgroundColor: 'var(--background)' }}>
          <UserCheck size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <div className="flex-1 min-w-0">
            <span className="font-mono text-xs font-semibold" style={{ color: 'var(--primary)' }}>{value.accountNumber}</span>
            <span className="text-sm font-medium ml-2" style={{ color: 'var(--foreground)' }}>{value.name}</span>
            {value.company && <span className="text-xs ml-1" style={{ color: 'var(--muted-foreground)' }}>({value.company})</span>}
          </div>
          <button type="button" onClick={() => { onClear(); setQuery('') }}
            className="p-0.5 rounded hover:bg-[var(--accent)] shrink-0" style={{ color: 'var(--muted-foreground)' }}>
            <X size={14} />
          </button>
        </div>
      </div>
    )
  }

  // Search state
  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
        Payee <span className="text-red-500 ml-0.5">*</span>
      </label>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--muted-foreground)' }} />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search by account number or name…"
          className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm outline-none transition-colors focus:ring-2"
          style={inputStyle}
        />
      </div>

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border shadow-xl overflow-hidden"
          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
          {filtered.length > 0 ? (
            <div className="max-h-48 overflow-y-auto divide-y" style={{ borderColor: 'var(--border)' }}>
              {filtered.map(p => (
                <button key={p.id} type="button" onClick={() => { onSelect(p); setQuery(''); setOpen(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[var(--accent)]">
                  <span className="font-mono text-xs font-semibold mr-2" style={{ color: 'var(--primary)' }}>{p.accountNumber}</span>
                  <span className="font-medium" style={{ color: 'var(--foreground)' }}>{p.name}</span>
                  {p.company && <span className="text-xs ml-1" style={{ color: 'var(--muted-foreground)' }}>— {p.company}</span>}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-3 text-sm" style={{ color: 'var(--muted-foreground)' }}>
              {query ? 'No payees match your search. Click Skip to add a new one.' : 'Type to search payees…'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
