import { useState, useEffect } from 'react'
import { Pencil, ToggleLeft, ToggleRight, Users2, X, Search } from 'lucide-react'
import { api } from '@/lib/api'
import { toaster } from '@/components/ui/toast'
import { useAuth } from '@/context/AuthContext'
import { useLogs } from '@/context/LogsContext'
import { cn, inputCls, inputStyle } from '@/lib/utils'
import type { Client, ClientStatus } from '@/types/client'
import type { FieldChange } from '@/types/activityLog'
import { ComboBox } from '@/components/ui/combo-box'
import type { ComboBoxOption } from '@/components/ui/combo-box'
import { phLgusSorted } from '@/data/philippines'

const CITY_OPTIONS: ComboBoxOption[] = phLgusSorted.map(l => ({
  value: `${l.name}|||${l.province}`, label: l.name, sublabel: l.province,
}))

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

function ClientForm({ initial, onSave, onClose }: {
  initial?: Client | null
  onSave: (data: Partial<Client>) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState({
    name:     initial?.name     ?? '',
    company:  initial?.company  ?? '',
    email:    initial?.email    ?? '',
    phone:    initial?.phone    ?? '',
    street:   initial?.street   ?? '',
    barangay: initial?.barangay ?? '',
    city:     initial?.city     ?? '',
    province: initial?.province ?? '',
    notes:    initial?.notes    ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
    setErrors(e => ({ ...e, [key]: '' }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>
          {initial ? 'Edit Client' : 'New Client'}
        </h2>
        <button type="button" onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[var(--accent)]"
          style={{ color: 'var(--muted-foreground)' }}>
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-auto px-5 py-5 space-y-4">
        {initial?.clientCode && (
          <div className="flex gap-2 flex-wrap">
            <span className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--primary)' }}>
              Client Code: {initial.clientCode}
            </span>
          </div>
        )}
        <Field label="Full Name / Contact Person" required>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="e.g. SPS Lui and Jessamn Rubio"
            className={inputCls} style={inputStyle} />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </Field>
        <Field label="Company / Organization">
          <input value={form.company} onChange={e => set('company', e.target.value)}
            placeholder="Company name (optional)"
            className={inputCls} style={inputStyle} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email">
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="email@example.com"
              className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Phone">
            <input value={form.phone} onChange={e => set('phone', e.target.value)}
              placeholder="09189116269"
              className={inputCls} style={inputStyle} />
          </Field>
        </div>
        <Field label="Street / House No.">
          <input value={form.street} onChange={e => set('street', e.target.value)}
            placeholder="e.g. Lot 12 Blk 5, Sampaguita St."
            className={inputCls} style={inputStyle} />
        </Field>
        <Field label="Barangay">
          <input value={form.barangay} onChange={e => set('barangay', e.target.value)}
            placeholder="e.g. Barangay Plainview"
            className={inputCls} style={inputStyle} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City / Municipality">
            <ComboBox
              value={form.city ? `${form.city}|||${form.province}` : ''}
              onChange={(_val, opt) => {
                if (!opt) { setForm(f => ({ ...f, city: '', province: '' })); return }
                const [city, province] = opt.value.split('|||')
                setForm(f => ({ ...f, city: city ?? '', province: province ?? '' }))
              }}
              options={CITY_OPTIONS}
              placeholder="Search city…"
            />
          </Field>
          <Field label="Province">
            <input value={form.province} readOnly placeholder="Auto-filled"
              className={inputCls}
              style={{ ...inputStyle, backgroundColor: 'var(--accent)', cursor: 'default' }} />
          </Field>
        </div>
        <Field label="Notes">
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
            rows={3} placeholder="Internal notes (optional)"
            className={cn(inputCls, 'resize-none')} style={inputStyle} />
        </Field>
      </div>

      <div className="px-5 py-4 border-t shrink-0 flex gap-2 justify-end"
        style={{ borderColor: 'var(--border)' }}>
        <button type="button" onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm border transition-colors hover:bg-[var(--accent)]"
          style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--primary)' }}>
          {saving ? 'Saving…' : initial ? 'Save Changes' : 'Create Client'}
        </button>
      </div>
    </form>
  )
}

export function Clients() {
  const { user } = useAuth()
  const { addLog } = useLogs()
  const [clients, setClients]   = useState<Client[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<ClientStatus | 'all'>('all')
  const [search, setSearch]     = useState('')
  const [drawerOpen, setDrawer] = useState(false)
  const [editing, setEditing]   = useState<Client | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    api.getClients()
      .then(data => setClients(data as Client[]))
      .catch(() => toaster.create({ title: 'Failed to load clients', type: 'error' }))
      .finally(() => setLoading(false))
  }, [])

  const filtered = clients
    .filter(c => filter === 'all' || c.status === filter)
    .filter(c => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return c.name.toLowerCase().includes(q)
        || (c.company ?? '').toLowerCase().includes(q)
        || (c.clientCode ?? '').toLowerCase().includes(q)
    })

  function openEdit(c: Client) { setEditing(c); setDrawer(true) }
  function closeDrawer() { setDrawer(false); setEditing(null) }

  async function handleSave(data: Partial<Client>) {
    if (!editing) return
    try {
      const before = editing
      const updated = await api.updateClient(editing.id, data) as Client
      setClients(cs => cs.map(c => c.id === editing.id ? { ...c, ...updated } : c))
      // Field-level diff for the audit log
      const labels: Record<string, string> = {
        name: 'Name', company: 'Company', email: 'Email', phone: 'Phone',
        street: 'Street', barangay: 'Barangay', city: 'City', province: 'Province', notes: 'Notes',
      }
      const changes: FieldChange[] = []
      for (const k of Object.keys(labels)) {
        const oldVal = String((before as unknown as Record<string, unknown>)[k] ?? '')
        const newVal = String((data as Record<string, unknown>)[k] ?? oldVal)
        if (newVal !== oldVal) changes.push({ field: labels[k], oldValue: oldVal || '—', newValue: newVal || '—' })
      }
      if (changes.length) {
        addLog({
          action: 'edited', propertyId: before.clientCode || before.id, propertyTitle: `Client · ${updated.name || before.name}`,
          agentId: user?.id ?? '', agentName: user?.name ?? '', changes,
        })
      }
      toaster.create({ title: 'Client updated', type: 'success' })
      closeDrawer()
    } catch (err) {
      toaster.create({ title: (err as Error).message, type: 'error' })
      throw err
    }
  }

  async function handleToggle(c: Client) {
    setToggling(c.id)
    try {
      const newStatus: ClientStatus = c.status === 'active' ? 'inactive' : 'active'
      await api.updateClient(c.id, { status: newStatus })
      setClients(cs => cs.map(x => x.id === c.id ? { ...x, status: newStatus } : x))
      addLog({
        action: 'edited', propertyId: c.clientCode || c.id, propertyTitle: `Client · ${c.name}`,
        agentId: user?.id ?? '', agentName: user?.name ?? '',
        changes: [{
          field: 'Status',
          oldValue: c.status.charAt(0).toUpperCase() + c.status.slice(1),
          newValue: newStatus.charAt(0).toUpperCase() + newStatus.slice(1),
        }],
      })
    } catch (err) {
      toaster.create({ title: (err as Error).message, type: 'error' })
    } finally {
      setToggling(null)
    }
  }

  const tabs: { label: string; value: ClientStatus | 'all' }[] = [
    { label: 'All',      value: 'all' },
    { label: 'Active',   value: 'active' },
    { label: 'Inactive', value: 'inactive' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <Users2 size={20} style={{ color: 'var(--primary)' }} />
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>Clients</h1>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {clients.length} client{clients.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Filter + Search row */}
      <div className="flex items-center gap-3 px-6 py-3 border-b shrink-0 flex-wrap"
        style={{ borderColor: 'var(--border)' }}>
        <div className="flex gap-1">
          {tabs.map(t => (
            <button key={t.value} onClick={() => setFilter(t.value)}
              className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
              style={{
                backgroundColor: filter === t.value ? 'var(--primary)' : 'var(--accent)',
                color: filter === t.value ? 'var(--primary-foreground)' : 'var(--foreground)',
              }}>
              {t.label}
              {t.value !== 'all' && (
                <span className="ml-1 opacity-70">({clients.filter(c => c.status === t.value).length})</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--muted-foreground)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, company, code…"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs outline-none"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-40" style={{ color: 'var(--muted-foreground)' }}>
            Loading clients…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2"
            style={{ color: 'var(--muted-foreground)' }}>
            <Users2 size={32} className="opacity-30" />
            <p className="text-sm">{search ? 'No clients match your search' : 'No clients yet'}</p>
            {!search && (
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                Clients are added automatically when a proposal is created.
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-xl border overflow-hidden"
              style={{ borderColor: 'var(--border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: 'var(--accent)', color: 'var(--muted-foreground)' }}>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Client Code</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Company</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Email</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Phone</th>
                    <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wide">Status</th>
                    <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <tr key={c.id}
                      className="border-t transition-colors hover:bg-[var(--accent)]"
                      style={{ borderColor: 'var(--border)', backgroundColor: i % 2 === 0 ? 'var(--background)' : 'transparent' }}>
                      <td className="px-4 py-3" style={{ color: 'var(--primary)' }}>
                        <div className="font-mono text-xs font-semibold">{c.clientCode}</div>
                      </td>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--foreground)' }}>{c.name}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>{c.company || '—'}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>{c.email || '—'}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>{c.phone || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold',
                          c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                          {c.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(c)} title="Edit"
                            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--border)]"
                            style={{ color: 'var(--muted-foreground)' }}>
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleToggle(c)} disabled={toggling === c.id}
                            title={c.status === 'active' ? 'Deactivate' : 'Activate'}
                            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--border)]"
                            style={{ color: 'var(--muted-foreground)' }}>
                            {c.status === 'active'
                              ? <ToggleRight size={16} style={{ color: 'var(--primary)' }} />
                              : <ToggleLeft size={16} />}
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
              {filtered.map(c => (
                <div key={c.id} className="rounded-xl border p-4"
                  style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <span className="font-mono text-xs font-semibold" style={{ color: 'var(--primary)' }}>
                        {c.clientCode}
                      </span>
                      <p className="font-semibold text-sm mt-0.5" style={{ color: 'var(--foreground)' }}>{c.name}</p>
                      {c.company && <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{c.company}</p>}
                    </div>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold shrink-0',
                      c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                      {c.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {[c.email, c.phone].filter(Boolean).join(' · ') || 'No contact info'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(c)}
                        className="p-1.5 rounded-lg hover:bg-[var(--accent)]"
                        style={{ color: 'var(--muted-foreground)' }}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleToggle(c)} disabled={toggling === c.id}
                        className="p-1.5 rounded-lg hover:bg-[var(--accent)]"
                        style={{ color: 'var(--muted-foreground)' }}>
                        {c.status === 'active'
                          ? <ToggleRight size={16} style={{ color: 'var(--primary)' }} />
                          : <ToggleLeft size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Drawer overlay */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={closeDrawer} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md z-50 shadow-2xl flex flex-col"
            style={{ backgroundColor: 'var(--background)' }}>
            <ClientForm initial={editing} onSave={handleSave} onClose={closeDrawer} />
          </div>
        </>
      )}
    </div>
  )
}
