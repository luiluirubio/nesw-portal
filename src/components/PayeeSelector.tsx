import { useState, useEffect, useRef } from 'react'
import { Search, Plus, X, UserCheck } from 'lucide-react'
import { inputStyle } from '@/lib/utils'
import type { Payee } from '@/types/payee'
import { loadPayees } from '@/lib/payees'

// Mirrors ClientSelector, but reads from the localStorage Payee master data and
// lets the user pick an existing payee, type a brand-new one, or skip entirely.

interface PayeeSelectorProps {
  value:     Payee | null
  onSelect:  (payee: Payee) => void
  onUseNew:  (name: string) => void   // user typed a name not in master data
  onClear:   () => void
}

export function PayeeSelector({ value, onSelect, onUseNew, onClear }: PayeeSelectorProps) {
  const [payees, setPayees] = useState<Payee[]>([])
  const [open, setOpen]     = useState(false)
  const [query, setQuery]   = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setPayees(loadPayees()) }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const q = query.trim().toLowerCase()
  const filtered = (q
    ? payees.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.company || '').toLowerCase().includes(q))
    : payees).slice(0, 8)

  const exactMatch = payees.some(p => p.name.toLowerCase() === q)

  function selectPayee(p: Payee) {
    onSelect(p)
    setQuery('')
    setOpen(false)
  }

  function handleUseNew() {
    if (!query.trim()) return
    onUseNew(query.trim())
    setQuery('')
    setOpen(false)
  }

  // Selected state
  if (value && !open) {
    return (
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
          Payee / Vendor
        </label>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border"
          style={{ borderColor: 'var(--primary)', backgroundColor: 'var(--background)' }}>
          <UserCheck size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{value.name}</span>
            {value.company && (
              <span className="text-xs ml-1" style={{ color: 'var(--muted-foreground)' }}>({value.company})</span>
            )}
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
    <div className="relative" ref={ref}>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
        Payee / Vendor <span className="font-normal">(optional — you can skip)</span>
      </label>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--muted-foreground)' }} />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search payees or type a new one…"
          className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm outline-none transition-colors focus:ring-2"
          style={inputStyle}
        />
      </div>

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border shadow-xl overflow-hidden"
          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>

          {filtered.length > 0 && (
            <div className="max-h-48 overflow-y-auto divide-y" style={{ borderColor: 'var(--border)' }}>
              {filtered.map(p => (
                <button key={p.id} type="button" onClick={() => selectPayee(p)}
                  className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[var(--accent)]">
                  <span className="font-medium" style={{ color: 'var(--foreground)' }}>{p.name}</span>
                  {p.company && (
                    <span className="text-xs ml-1" style={{ color: 'var(--muted-foreground)' }}>— {p.company}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Offer to create a new payee from typed text */}
          {query.trim() && !exactMatch && (
            <button type="button" onClick={handleUseNew}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-t transition-colors hover:bg-[var(--accent)]"
              style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}>
              <Plus size={14} /> Use “{query.trim()}” as new payee
            </button>
          )}

          {filtered.length === 0 && !query.trim() && (
            <div className="px-4 py-3 text-sm" style={{ color: 'var(--muted-foreground)' }}>
              No payees yet — type a name to add one.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
