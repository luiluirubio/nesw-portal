import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Plus, Users2, Pencil, Trash2, Search, X } from 'lucide-react'
import { toaster } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { cn, inputCls, inputStyle } from '@/lib/utils'
import { loadPayees, createPayee, updatePayee, deletePayee } from '@/lib/payees'
import type { Payee } from '@/types/payee'

function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const EMPTY = { name: '', company: '', contact: '', phone: '', email: '', address: '', notes: '', status: 'active' as 'active' | 'inactive' }

export function Payees() {
  const [payees, setPayees]     = useState<Payee[]>([])
  const [search, setSearch]     = useState('')
  const [editing, setEditing]   = useState<Payee | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm]         = useState({ ...EMPTY })
  const [toDelete, setToDelete] = useState<Payee | null>(null)

  useEffect(() => { setPayees(loadPayees()) }, [])

  const q = search.trim().toLowerCase()
  const filtered = q
    ? payees.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.company || '').toLowerCase().includes(q) ||
        (p.contact || '').toLowerCase().includes(q))
    : payees

  function openNew() {
    setEditing(null)
    setForm({ ...EMPTY })
    setFormOpen(true)
  }

  function openEdit(p: Payee) {
    setEditing(p)
    setForm({
      name: p.name, company: p.company ?? '', contact: p.contact ?? '', phone: p.phone ?? '',
      email: p.email ?? '', address: p.address ?? '', notes: p.notes ?? '', status: p.status,
    })
    setFormOpen(true)
  }

  function handleSave() {
    if (!form.name.trim()) {
      toaster.create({ title: 'Payee name is required', type: 'error' }); return
    }
    if (editing) {
      updatePayee(editing.id, form)
      toaster.create({ title: 'Payee updated', type: 'success' })
    } else {
      createPayee(form)
      toaster.create({ title: 'Payee added', type: 'success' })
    }
    setPayees(loadPayees())
    setFormOpen(false)
  }

  function handleDelete(p: Payee) {
    deletePayee(p.id)
    setPayees(loadPayees())
    toaster.create({ title: 'Payee deleted', type: 'success' })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <Users2 size={20} style={{ color: 'var(--primary)' }} />
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>Payees</h1>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {payees.length} payee{payees.length !== 1 ? 's' : ''} / vendor{payees.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--primary)' }}>
          <Plus size={15} /> New Payee
        </button>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, company, or contact…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2" style={{ color: 'var(--muted-foreground)' }}>
            <Users2 size={32} className="opacity-30" />
            <p className="text-sm">No payees yet</p>
            <button onClick={openNew} className="text-xs font-medium" style={{ color: 'var(--primary)' }}>+ Add your first payee</button>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--card)', color: 'var(--muted-foreground)' }}>
                  <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wide">Company</th>
                  <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wide">Contact</th>
                  <th className="text-center px-4 py-3 font-bold text-xs uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b transition-colors" style={{ borderColor: 'var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                    <td className="px-4 py-3 font-semibold" style={{ color: 'var(--foreground)' }}>{p.name}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--muted-foreground)' }}>{p.company || '—'}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--muted-foreground)' }}>
                      {p.contact || '—'}{p.phone ? ` · ${p.phone}` : ''}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold',
                        p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                        {p.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(p)} title="Edit"
                          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--background)]" style={{ color: 'var(--muted-foreground)' }}>
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setToDelete(p)} title="Delete"
                          className="p-1.5 rounded-lg transition-colors hover:bg-red-50" style={{ color: '#dc2626' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit dialog */}
      <Dialog.Root open={formOpen} onOpenChange={setFormOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" style={{ animation: 'fadeIn 0.15s ease' }} />
          <Dialog.Content
            className="fixed z-[61] left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] focus:outline-none"
            style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
              <Dialog.Title className="text-base font-bold" style={{ color: 'var(--foreground)' }}>
                {editing ? 'Edit Payee' : 'New Payee'}
              </Dialog.Title>
              <Dialog.Close className="p-1.5 rounded-lg transition-colors hover:bg-[var(--accent)]" style={{ color: 'var(--muted-foreground)' }}>
                <X size={18} />
              </Dialog.Close>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto">
              <Field label="Name" required>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Payee or vendor name" className={inputCls} style={inputStyle} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Company">
                  <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className={inputCls} style={inputStyle} />
                </Field>
                <Field label="Contact Person">
                  <input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} className={inputCls} style={inputStyle} />
                </Field>
                <Field label="Phone">
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} style={inputStyle} />
                </Field>
                <Field label="Email">
                  <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls} style={inputStyle} />
                </Field>
              </div>
              <Field label="Address">
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Notes">
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className={cn(inputCls, 'resize-none')} style={inputStyle} />
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}
                  className={inputCls} style={inputStyle}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
            </div>
            <div className="flex gap-2 justify-end px-6 py-4 border-t shrink-0" style={{ borderColor: 'var(--border)' }}>
              <button onClick={() => setFormOpen(false)}
                className="px-4 py-2 rounded-lg text-sm border transition-colors hover:bg-[var(--accent)]"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                Cancel
              </button>
              <button onClick={handleSave}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--primary)' }}>
                {editing ? 'Save Changes' : 'Add Payee'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!toDelete}
        onCancel={() => setToDelete(null)}
        onConfirm={() => { if (toDelete) handleDelete(toDelete); setToDelete(null) }}
        title="Delete this payee?"
        description={toDelete ? `${toDelete.name} will be removed from your payee list. Existing expenses keep their payee name.` : ''}
        confirmLabel="Delete"
      />

      <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
    </div>
  )
}
