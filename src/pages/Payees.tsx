import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Users2, Pencil, Trash2, Search, X, Paperclip, ExternalLink } from 'lucide-react'
import { toaster } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { cn, inputCls, inputStyle } from '@/lib/utils'
import { loadPayees, updatePayee, deletePayee } from '@/lib/payees'
import type { Payee } from '@/types/payee'

// Email / phone validation (kept in sync with AddExpense)
function isValidEmail(v: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) }
function isValidPhone(v: string): boolean {
  const c = v.replace(/[\s-]/g, '')
  return /^(\+?63)?9\d{9}$/.test(c) || /^\+?\d{7,15}$/.test(c)
}

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

export function Payees() {
  const [payees, setPayees]     = useState<Payee[]>([])
  const [search, setSearch]     = useState('')
  const [editing, setEditing]   = useState<Payee | null>(null)
  const [form, setForm]         = useState({ name: '', company: '', contactPerson: '', contactNumber: '', email: '', address: '', notes: '', status: 'active' as 'active' | 'inactive' })
  const [errors, setErrors]     = useState<Record<string, string>>({})
  const [toDelete, setToDelete] = useState<Payee | null>(null)

  useEffect(() => { setPayees(loadPayees()) }, [])

  const q = search.trim().toLowerCase()
  const filtered = q
    ? payees.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.company || '').toLowerCase().includes(q) ||
        (p.contactPerson || '').toLowerCase().includes(q) ||
        (p.accountNumber || '').toLowerCase().includes(q))
    : payees

  function openEdit(p: Payee) {
    setEditing(p)
    setErrors({})
    setForm({
      name: p.name, company: p.company ?? '', contactPerson: p.contactPerson ?? '',
      contactNumber: p.contactNumber ?? '', email: p.email ?? '', address: p.address ?? '',
      notes: p.notes ?? '', status: p.status,
    })
  }

  function handleSave() {
    if (!editing) return
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (form.email.trim() && !isValidEmail(form.email.trim())) e.email = 'Enter a valid email address'
    if (form.contactNumber.trim() && !isValidPhone(form.contactNumber.trim())) e.contactNumber = 'Enter a valid contact number'
    setErrors(e)
    if (Object.keys(e).length) return
    updatePayee(editing.id, form)
    setPayees(loadPayees())
    setEditing(null)
    toaster.create({ title: 'Payee updated', type: 'success' })
  }

  function handleDelete(p: Payee) {
    deletePayee(p.id)
    setPayees(loadPayees())
    toaster.create({ title: 'Payee deleted', type: 'success' })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header — no "Add Payee"; payees are created from the expense form */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <Users2 size={20} style={{ color: 'var(--primary)' }} />
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>Payees</h1>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {payees.length} payee{payees.length !== 1 ? 's' : ''} · added from the expense form
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by account no., name, company, or contact…"
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
            <p className="text-xs">Payees are created when you record an expense.</p>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--card)', color: 'var(--muted-foreground)' }}>
                  <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wide">Account No.</th>
                  <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wide">Company</th>
                  <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wide">Contact</th>
                  <th className="text-center px-4 py-3 font-bold text-xs uppercase tracking-wide">ID</th>
                  <th className="text-center px-4 py-3 font-bold text-xs uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b transition-colors" style={{ borderColor: 'var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: 'var(--primary)' }}>{p.accountNumber || '—'}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: 'var(--foreground)' }}>{p.name}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--muted-foreground)' }}>{p.company || '—'}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--muted-foreground)' }}>
                      {p.contactPerson || '—'}{p.contactNumber ? ` · ${p.contactNumber}` : ''}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.idUrl ? (
                        <a href={p.idUrl} target="_blank" rel="noreferrer" title={p.idName || 'View ID'}
                          className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--primary)' }}>
                          <ExternalLink size={13} /> View
                        </a>
                      ) : <span style={{ color: 'var(--muted-foreground)' }}>—</span>}
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

      {/* Edit dialog */}
      <Dialog.Root open={!!editing} onOpenChange={open => { if (!open) setEditing(null) }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" style={{ animation: 'fadeIn 0.15s ease' }} />
          <Dialog.Content
            className="fixed z-[61] left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] focus:outline-none"
            style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
              <div>
                <Dialog.Title className="text-base font-bold" style={{ color: 'var(--foreground)' }}>Edit Payee</Dialog.Title>
                {editing?.accountNumber && (
                  <p className="text-xs font-mono" style={{ color: 'var(--primary)' }}>{editing.accountNumber}</p>
                )}
              </div>
              <Dialog.Close className="p-1.5 rounded-lg transition-colors hover:bg-[var(--accent)]" style={{ color: 'var(--muted-foreground)' }}>
                <X size={18} />
              </Dialog.Close>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto">
              <Field label="Name" required error={errors.name}>
                <input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(x => ({ ...x, name: '' })) }}
                  className={cn(inputCls, errors.name && 'border-red-400')} style={inputStyle} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Company">
                  <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className={inputCls} style={inputStyle} />
                </Field>
                <Field label="Contact Person">
                  <input value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} className={inputCls} style={inputStyle} />
                </Field>
                <Field label="Contact Number" error={errors.contactNumber}>
                  <input value={form.contactNumber} onChange={e => { setForm(f => ({ ...f, contactNumber: e.target.value })); setErrors(x => ({ ...x, contactNumber: '' })) }}
                    inputMode="tel" className={cn(inputCls, errors.contactNumber && 'border-red-400')} style={inputStyle} />
                </Field>
                <Field label="Email" error={errors.email}>
                  <input value={form.email} onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(x => ({ ...x, email: '' })) }}
                    type="email" className={cn(inputCls, errors.email && 'border-red-400')} style={inputStyle} />
                </Field>
              </div>
              <Field label="Company Address">
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Notes">
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className={cn(inputCls, 'resize-none')} style={inputStyle} />
              </Field>
              {editing?.idUrl && (
                <Field label="ID Attached">
                  <a href={editing.idUrl} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors hover:bg-[var(--accent)]"
                    style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}>
                    <Paperclip size={14} /> {editing.idName || 'View ID'}
                  </a>
                </Field>
              )}
              <Field label="Status">
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}
                  className={inputCls} style={inputStyle}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
            </div>
            <div className="flex gap-2 justify-end px-6 py-4 border-t shrink-0" style={{ borderColor: 'var(--border)' }}>
              <button onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-lg text-sm border transition-colors hover:bg-[var(--accent)]"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                Cancel
              </button>
              <button onClick={handleSave}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--primary)' }}>
                Save Changes
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
