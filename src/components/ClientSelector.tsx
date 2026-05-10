/**
 * ClientSelector — search existing clients by code or name, or create a new
 * client inline. Used in Proposal, Booking, and Billing forms.
 */
import { useState, useEffect, useRef } from 'react'
import { Search, X, Plus, UserCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { cn, inputCls, inputStyle } from '@/lib/utils'
import type { Client } from '@/types/client'

interface ClientSelectorProps {
  value?:    Client | null
  onSelect:  (c: Client) => void
  onClear:   () => void
  disabled?: boolean
  label?:    string
}

export function ClientSelector({ value, onSelect, onClear, disabled, label = 'Client' }: ClientSelectorProps) {
  const [clients,  setClients]  = useState<Client[]>([])
  const [query,    setQuery]    = useState('')
  const [open,     setOpen]     = useState(false)
  const [creating, setCreating] = useState(false)
  const [saving,   setSaving]   = useState(false)

  const [newForm, setNewForm] = useState({ name: '', company: '', email: '', phone: '', address: '', notes: '' })
  const [nameErr, setNameErr] = useState('')
  const setNew = (k: keyof typeof newForm) => (v: string) => setNewForm(f => ({ ...f, [k]: v }))

  const containerRef = useRef<HTMLDivElement>(null)

  // Load active clients once
  useEffect(() => {
    api.getClients(true)
      .then(data => setClients(data as Client[]))
      .catch(() => {})
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setCreating(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = clients.filter(c => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      c.clientCode?.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      (c.company ?? '').toLowerCase().includes(q)
    )
  }).slice(0, 8)

  function selectClient(c: Client) {
    onSelect(c)
    setQuery('')
    setOpen(false)
    setCreating(false)
  }

  async function handleCreate() {
    if (!newForm.name.trim()) { setNameErr('Name is required'); return }
    setNameErr('')
    setSaving(true)
    try {
      const created = await api.createClient({
        name:    newForm.name.trim(),
        company: newForm.company.trim(),
        email:   newForm.email.trim(),
        phone:   newForm.phone.trim(),
        address: newForm.address.trim(),
        notes:   newForm.notes.trim(),
      }) as Client
      setClients(cs => [created, ...cs])
      selectClient(created)
      setNewForm({ name: '', company: '', email: '', phone: '', address: '', notes: '' })
    } catch (err) {
      setNameErr((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (value && !open) {
    return (
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
          {label}
        </label>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border"
          style={{ borderColor: 'var(--primary)', backgroundColor: 'var(--background)' }}>
          <UserCheck size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <div className="flex-1 min-w-0">
            <span className="font-mono text-xs font-semibold" style={{ color: 'var(--primary)' }}>
              {value.clientCode}
            </span>
            <span className="text-sm font-medium ml-2" style={{ color: 'var(--foreground)' }}>
              {value.name}
            </span>
            {value.company && (
              <span className="text-xs ml-1" style={{ color: 'var(--muted-foreground)' }}>
                ({value.company})
              </span>
            )}
          </div>
          {!disabled && (
            <button type="button" onClick={() => { onClear(); setQuery('') }}
              className="p-0.5 rounded hover:bg-[var(--accent)] shrink-0"
              style={{ color: 'var(--muted-foreground)' }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Search / create state ────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
        {label}<span className="text-red-500 ml-0.5">*</span>
      </label>

      {/* Search input */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--muted-foreground)' }} />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setCreating(false) }}
          onFocus={() => setOpen(true)}
          disabled={disabled}
          placeholder="Search by client code or name…"
          className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm outline-none transition-colors focus:ring-2"
          style={inputStyle}
        />
      </div>

      {/* Dropdown */}
      {open && !creating && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border shadow-xl overflow-hidden"
          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>

          {filtered.length > 0 ? (
            <div className="max-h-48 overflow-y-auto divide-y" style={{ borderColor: 'var(--border)' }}>
              {filtered.map(c => (
                <button key={c.id} type="button"
                  onClick={() => selectClient(c)}
                  className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[var(--accent)]">
                  <span className="font-mono text-xs font-semibold mr-2" style={{ color: 'var(--primary)' }}>
                    {c.clientCode}
                  </span>
                  <span className="font-medium" style={{ color: 'var(--foreground)' }}>{c.name}</span>
                  {c.company && (
                    <span className="text-xs ml-1" style={{ color: 'var(--muted-foreground)' }}>— {c.company}</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-3 text-sm" style={{ color: 'var(--muted-foreground)' }}>
              {query ? 'No clients match your search.' : 'Type to search clients…'}
            </div>
          )}

          {/* + New Client button */}
          <button type="button"
            onClick={() => { setCreating(true); setOpen(false) }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-t transition-colors hover:bg-[var(--accent)]"
            style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}>
            <Plus size={14} /> New Client
          </button>
        </div>
      )}

      {/* Inline new-client mini form */}
      {creating && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border shadow-xl p-4 space-y-3"
          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>
            New Client
          </p>

          <div className="space-y-2">
            <div>
              <input value={newForm.name} onChange={e => { setNew('name')(e.target.value); setNameErr('') }}
                placeholder="Full name / contact person *"
                className={inputCls} style={inputStyle} />
              {nameErr && <p className="text-xs text-red-500 mt-0.5">{nameErr}</p>}
            </div>
            <input value={newForm.company} onChange={e => setNew('company')(e.target.value)}
              placeholder="Company (optional)"
              className={inputCls} style={inputStyle} />
            <div className="grid grid-cols-2 gap-2">
              <input value={newForm.email} onChange={e => setNew('email')(e.target.value)}
                placeholder="Email" type="email"
                className={inputCls} style={inputStyle} />
              <input value={newForm.phone} onChange={e => setNew('phone')(e.target.value)}
                placeholder="Phone"
                className={inputCls} style={inputStyle} />
            </div>
            <input value={newForm.address} onChange={e => setNew('address')(e.target.value)}
              placeholder="Address (optional)"
              className={inputCls} style={inputStyle} />
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button type="button"
              onClick={() => { setCreating(false); setOpen(true) }}
              className="px-3 py-1.5 rounded-lg text-xs border transition-colors hover:bg-[var(--accent)]"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              Back
            </button>
            <button type="button" onClick={handleCreate} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--primary)' }}>
              <Plus size={12} />
              {saving ? 'Creating…' : 'Add Client'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
