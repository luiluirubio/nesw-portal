import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, ToggleLeft, ToggleRight, Briefcase, X, ChevronDown } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { toaster } from '@/components/ui/toast'
import { cn, formatPHP } from '@/lib/utils'
import type { Service } from '@/types/service'

const CATEGORIES = [
  'RPT Assistance',
  'Title Transfer',
  'Property Appraisal',
  'Property Management',
  'Environmental Planning',
]

const DEFAULT_TERMS = `1. Prices are in Philippine Peso (₱) and are exclusive of applicable taxes unless stated.
2. Quotation is valid for the number of days specified from the date of issue.
3. A 50% down payment is required upon acceptance of this proposal.
4. NESW Realty Corporation reserves the right to revise pricing based on actual scope of work.
5. Services will commence upon receipt of down payment and signed agreement.`

// ── Service Form ──────────────────────────────────────────────────────────────
function ServiceForm({
  initial, onSave, onClose, existingCategories,
}: {
  initial?: Service | null
  onSave: (data: Partial<Service>) => Promise<void>
  onClose: () => void
  existingCategories: string[]
}) {
  const [form, setForm] = useState({
    category:     initial?.category     ?? '',
    name:         initial?.name         ?? '',
    defaultPrice: initial?.defaultPrice != null ? String(initial.defaultPrice) : '',
    timeline:     initial?.timeline     ?? '',
    description:  initial?.description  ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [catOpen, setCatOpen] = useState(false)
  const catRef = useRef<HTMLDivElement>(null)

  const allCategories = Array.from(new Set([...CATEGORIES, ...existingCategories]))

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function validate() {
    const e: Record<string, string> = {}
    if (!form.category.trim())    e.category     = 'Category is required'
    if (!form.name.trim())        e.name         = 'Service name is required'
    if (!form.defaultPrice.trim() || isNaN(Number(form.defaultPrice)))
                                  e.defaultPrice = 'Valid price is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      await onSave({ ...form, defaultPrice: Number(form.defaultPrice) })
    } finally {
      setSaving(false)
    }
  }

  const field = (label: string, key: keyof typeof form, opts?: { type?: string; placeholder?: string }) => (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>{label}</label>
      <input
        type={opts?.type ?? 'text'}
        placeholder={opts?.placeholder}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className={cn(
          'w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors',
          errors[key] ? 'border-red-400' : 'border-[var(--border)]'
        )}
        style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
      />
      {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Category ComboBox */}
      <div ref={catRef} className="relative">
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
          Category <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            value={form.category}
            onChange={e => { setForm(f => ({ ...f, category: e.target.value })); setCatOpen(true) }}
            onFocus={() => setCatOpen(true)}
            placeholder="Select or type category"
            className={cn(
              'w-full px-3 py-2 pr-8 rounded-lg border text-sm outline-none',
              errors.category ? 'border-red-400' : 'border-[var(--border)]'
            )}
            style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
          />
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--muted-foreground)' }} />
        </div>
        {catOpen && (
          <div className="absolute z-50 w-full mt-1 rounded-lg border shadow-lg overflow-auto"
            style={{ backgroundColor: 'var(--popover)', borderColor: 'var(--border)', maxHeight: '200px' }}>
            {allCategories
              .filter(c => c.toLowerCase().includes(form.category.toLowerCase()))
              .map(c => (
                <button key={c} type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--accent)] transition-colors"
                  style={{ color: 'var(--foreground)' }}
                  onPointerDown={() => { setForm(f => ({ ...f, category: c })); setCatOpen(false) }}>
                  {c}
                </button>
              ))}
            {form.category && !allCategories.includes(form.category) && (
              <button type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--accent)] transition-colors"
                style={{ color: 'var(--primary)' }}
                onPointerDown={() => { setCatOpen(false) }}>
                + Create "{form.category}"
              </button>
            )}
          </div>
        )}
        {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
      </div>

      {field('Service Name *', 'name', { placeholder: 'e.g. Title Transfer – Complete Package' })}
      {field('Starting Price (₱) *', 'defaultPrice', { type: 'number', placeholder: '45000' })}
      {field('Est. Timeline', 'timeline', { placeholder: 'e.g. 45-180 days' })}

      {/* Description */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Description</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Optional notes about this service"
          className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
          style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onClose}
          className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-colors"
          style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ backgroundColor: 'var(--primary)' }}>
          {saving ? 'Saving…' : initial ? 'Update Service' : 'Add Service'}
        </button>
      </div>
    </form>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function Services() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin'

  const [services, setServices]     = useState<Service[]>([])
  const [loading, setLoading]       = useState(true)
  const [filterCat, setFilterCat]   = useState('All')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing]       = useState<Service | null>(null)

  useEffect(() => {
    api.getServices().then(data => setServices(data as Service[])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const existingCategories = Array.from(new Set(services.map(s => s.category)))
  const allCats = ['All', ...Array.from(new Set([...CATEGORIES, ...existingCategories]))]
  const filtered = filterCat === 'All' ? services : services.filter(s => s.category === filterCat)

  function openAdd()          { setEditing(null); setDrawerOpen(true) }
  function openEdit(s: Service) { setEditing(s); setDrawerOpen(true) }
  function closeDrawer()      { setDrawerOpen(false); setEditing(null) }

  async function handleSave(data: Partial<Service>) {
    try {
      if (editing) {
        const updated = await api.updateService(editing.id, data) as Service
        setServices(s => s.map(x => x.id === editing.id ? { ...x, ...updated } : x))
        toaster.create({ title: 'Service updated', type: 'success' })
      } else {
        const created = await api.createService(data) as Service
        setServices(s => [created, ...s])
        toaster.create({ title: 'Service added', type: 'success' })
      }
      closeDrawer()
    } catch (err) {
      toaster.create({ title: (err as Error).message, type: 'error' })
    }
  }

  async function handleToggle(svc: Service) {
    try {
      const result = await api.toggleService(svc.id) as { status: 'active' | 'inactive' }
      setServices(s => s.map(x => x.id === svc.id ? { ...x, status: result.status } : x))
      toaster.create({
        title: `Service ${result.status === 'active' ? 'activated' : 'deactivated'}`,
        type: 'success',
      })
    } catch (err) {
      toaster.create({ title: (err as Error).message, type: 'error' })
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <Briefcase size={20} style={{ color: 'var(--primary)' }} />
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>Services</h1>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {services.length} service{services.length !== 1 ? 's' : ''} in catalog
            </p>
          </div>
        </div>
        {isAdmin && (
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--primary)' }}>
            <Plus size={15} /> Add Service
          </button>
        )}
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-1 px-6 py-3 border-b overflow-x-auto shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        {allCats.map(cat => (
          <button key={cat} onClick={() => setFilterCat(cat)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
              filterCat === cat ? 'text-white' : ''
            )}
            style={{
              backgroundColor: filterCat === cat ? 'var(--primary)' : 'var(--accent)',
              color: filterCat === cat ? 'var(--primary-foreground)' : 'var(--foreground)',
            }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-40" style={{ color: 'var(--muted-foreground)' }}>
            Loading services…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2"
            style={{ color: 'var(--muted-foreground)' }}>
            <Briefcase size={32} className="opacity-30" />
            <p className="text-sm">No services found</p>
            {isAdmin && <button onClick={openAdd} className="text-xs font-medium" style={{ color: 'var(--primary)' }}>+ Add the first service</button>}
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--accent)', color: 'var(--muted-foreground)' }}>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Category</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Service</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">Starting Price</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide hidden md:table-cell">Timeline</th>
                  <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wide">Status</th>
                  {isAdmin && <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wide">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((svc, i) => (
                  <tr key={svc.id}
                    className="border-t transition-colors"
                    style={{
                      borderColor: 'var(--border)',
                      backgroundColor: i % 2 === 0 ? 'var(--background)' : 'var(--accent)',
                    }}>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)', opacity: 0.85 }}>
                        {svc.category}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--foreground)' }}>
                      <p className="font-medium">{svc.name}</p>
                      {svc.description && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{svc.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold" style={{ color: 'var(--foreground)' }}>
                      {formatPHP(svc.defaultPrice)}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell" style={{ color: 'var(--muted-foreground)' }}>
                      {svc.timeline || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-semibold',
                        svc.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      )}>
                        {svc.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEdit(svc)}
                            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--accent)]"
                            title="Edit"
                            style={{ color: 'var(--muted-foreground)' }}>
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleToggle(svc)}
                            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--accent)]"
                            title={svc.status === 'active' ? 'Deactivate' : 'Activate'}
                            style={{ color: svc.status === 'active' ? 'var(--muted-foreground)' : 'var(--primary)' }}>
                            {svc.status === 'active' ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={closeDrawer} />
          <div className="w-full max-w-md flex flex-col border-l shadow-2xl overflow-y-auto"
            style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: 'var(--border)' }}>
              <h2 className="font-bold text-base" style={{ color: 'var(--foreground)' }}>
                {editing ? 'Edit Service' : 'Add Service'}
              </h2>
              <button onClick={closeDrawer}
                className="p-1.5 rounded-lg hover:bg-[var(--accent)] transition-colors"
                style={{ color: 'var(--muted-foreground)' }}>
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-4 flex-1">
              <ServiceForm
                initial={editing}
                onSave={handleSave}
                onClose={closeDrawer}
                existingCategories={existingCategories}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export { DEFAULT_TERMS }
