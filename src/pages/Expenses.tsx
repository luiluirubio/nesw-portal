import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Wallet, Pencil, Trash2, X, Eye, PenLine } from 'lucide-react'
import { toaster } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useAuth } from '@/context/AuthContext'
import { useLogs } from '@/context/LogsContext'
import { cn, formatPHP, formatDate } from '@/lib/utils'
import { loadExpenses, updateExpense, deleteExpense } from '@/lib/expenses'
import { fetchDrafts, deleteDraftCloud } from '@/lib/drafts'
import type { ExpenseDraft } from '@/types/draft'
import {
  CATEGORY_LABELS, METHOD_LABELS, USED_FOR_LABELS,
  type Expense, type ExpenseStatus, type ExpenseCategory, type ExpenseUsedFor,
} from '@/types/expense'

const STATUS_STYLE: Record<ExpenseStatus, string> = {
  pending:   'bg-amber-100 text-amber-700',
  paid:      'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

const STATUS_COLORS: Record<ExpenseStatus, { bg: string; text: string }> = {
  pending:   { bg: '#fef3c7', text: '#b45309' },
  paid:      { bg: '#dcfce7', text: '#15803d' },
  cancelled: { bg: '#fee2e2', text: '#dc2626' },
}

function usedForLabel(e: Expense): string {
  const base = USED_FOR_LABELS[e.usedFor]
  return e.usedFor === 'project' && e.projectName ? `${base}: ${e.projectName}` : base
}

// ── Slide-in Expense Detail Panel ────────────────────────────────────────────
function ExpenseDetailPanel({
  expense, onClose, onStatusChange, onEdit, onDelete,
}: {
  expense: Expense
  onClose: () => void
  onStatusChange: (e: Expense, s: ExpenseStatus) => void
  onEdit: (e: Expense) => void
  onDelete: (e: Expense) => void
}) {
  const sc = STATUS_COLORS[expense.status]
  const receiptSrc = expense.receiptUrl || expense.receiptDataUrl
  const isImage = !!(expense.receiptDataUrl?.startsWith('data:image/') || expense.receiptUrl?.match(/\.(png|jpe?g|webp|gif)$/i))

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        style={{ animation: 'fadeIn 0.15s ease' }}
        onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] md:w-[560px] flex flex-col shadow-2xl"
        style={{ backgroundColor: 'var(--background)', animation: 'slideInRight 0.25s cubic-bezier(0.32,0.72,0,1)' }}>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--border)' }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-base font-bold" style={{ color: 'var(--primary)' }}>
                {expense.expenseNo}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ backgroundColor: sc.bg, color: sc.text }}>
                {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
              </span>
            </div>
            <p className="text-sm font-semibold mt-0.5 truncate" style={{ color: 'var(--foreground)' }}>
              {expense.payee || '—'}
            </p>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {formatDate(expense.date)} · {CATEGORY_LABELS[expense.category]}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onEdit(expense)} title="Edit"
              className="p-2 rounded-lg transition-colors hover:bg-[var(--accent)] text-xs flex items-center gap-1.5 font-medium border"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              <Pencil size={14} /> Edit
            </button>
            <button onClick={() => onDelete(expense)} title="Delete"
              className="p-2 rounded-lg transition-colors hover:bg-red-50 text-xs flex items-center gap-1.5 font-medium border"
              style={{ borderColor: 'var(--border)', color: '#dc2626' }}>
              <Trash2 size={14} /> Delete
            </button>
            <button onClick={onClose}
              className="p-2 rounded-lg transition-colors hover:bg-[var(--accent)]"
              style={{ color: 'var(--muted-foreground)' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Status changer */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Status</span>
            <select
              value={expense.status}
              onChange={e => onStatusChange(expense, e.target.value as ExpenseStatus)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border-0 cursor-pointer"
              style={{ backgroundColor: sc.bg, color: sc.text }}>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Amount */}
          <section>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--muted-foreground)' }}>Amount</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>{formatPHP(expense.amount)}</p>
          </section>

          {/* Details grid */}
          <section>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--muted-foreground)' }}>Details</p>
            <div className="rounded-xl border p-4 grid grid-cols-2 gap-y-3 gap-x-4 text-sm"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
              <Detail label="Date" value={formatDate(expense.date)} />
              <Detail label="Category" value={CATEGORY_LABELS[expense.category]} />
              <Detail label="Used For" value={usedForLabel(expense)} />
              <Detail label="Payment Method" value={METHOD_LABELS[expense.paymentMethod]} />
              {expense.paidToAccount && <Detail label="Account No. (paid to)" value={expense.paidToAccount} />}
              <Detail label="Payee" value={expense.payee || '—'} />
              <Detail label="Recorded By" value={expense.agentName || '—'} />
            </div>
          </section>

          {/* Notes */}
          {expense.notes && (
            <section>
              <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--muted-foreground)' }}>Notes</p>
              <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--foreground)' }}>
                {expense.notes}
              </p>
            </section>
          )}

          {/* Receipt */}
          {receiptSrc && (
            <section>
              <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--muted-foreground)' }}>Receipt</p>
              {isImage ? (
                <a href={receiptSrc} target="_blank" rel="noreferrer">
                  <img src={receiptSrc} alt={expense.receiptName || 'Receipt'}
                    className="max-h-72 rounded-xl border object-contain" style={{ borderColor: 'var(--border)' }} />
                </a>
              ) : (
                <a href={receiptSrc} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors hover:bg-[var(--accent)]"
                  style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}>
                  <Eye size={14} /> View {expense.receiptName || 'receipt'}
                </a>
              )}
            </section>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn       { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideInRight { from { transform: translateX(100%); opacity:.6 } to { transform: translateX(0); opacity:1 } }
      `}</style>
    </>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{label}</p>
      <p className="font-medium truncate" style={{ color: 'var(--foreground)' }}>{value}</p>
    </div>
  )
}


export function Expenses() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addLog } = useLogs()
  const [expenses, setExpenses]       = useState<Expense[]>([])
  const [statusFilter, setStatusFilter]     = useState<ExpenseStatus | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all')
  const [usedForFilter, setUsedForFilter]   = useState<ExpenseUsedFor | 'all'>('all')
  const [selected, setSelected]       = useState<Expense | null>(null)
  const [toDelete, setToDelete]       = useState<Expense | null>(null)
  const [drafts, setDrafts]           = useState<ExpenseDraft[]>([])

  useEffect(() => {
    setExpenses(loadExpenses())
    fetchDrafts('expense').then(d => setDrafts(d as ExpenseDraft[])).catch(() => {})
  }, [])

  const filtered = useMemo(() => expenses.filter(e =>
    (statusFilter === 'all'   || e.status   === statusFilter) &&
    (categoryFilter === 'all' || e.category === categoryFilter) &&
    (usedForFilter === 'all'  || e.usedFor  === usedForFilter)
  ), [expenses, statusFilter, categoryFilter, usedForFilter])

  const totalSpent = useMemo(
    () => filtered.filter(e => e.status !== 'cancelled').reduce((s, e) => s + (Number(e.amount) || 0), 0),
    [filtered],
  )

  function handleStatusChange(exp: Expense, status: ExpenseStatus) {
    if (status === exp.status) return
    const updated = updateExpense(exp.id, { status })
    if (!updated) return
    setExpenses(es => es.map(x => x.id === exp.id ? updated : x))
    if (selected?.id === exp.id) setSelected(updated)
    // Audit-log the status change (who + when recorded by LogsContext)
    addLog({
      action: 'edited', propertyId: exp.expenseNo, propertyTitle: `Expense · ${exp.payee}`,
      agentId: user?.id ?? '', agentName: user?.name ?? '',
      changes: [{
        field: 'Status',
        oldValue: exp.status.charAt(0).toUpperCase() + exp.status.slice(1),
        newValue: status.charAt(0).toUpperCase() + status.slice(1),
      }],
    })
  }

  function handleDelete(exp: Expense) {
    deleteExpense(exp.id)
    setExpenses(es => es.filter(x => x.id !== exp.id))
    if (selected?.id === exp.id) setSelected(null)
    addLog({
      action: 'edited', propertyId: exp.expenseNo, propertyTitle: `Expense · ${exp.payee}`,
      agentId: user?.id ?? '', agentName: user?.name ?? '',
      changes: [{ field: 'Deleted', oldValue: formatPHP(exp.amount), newValue: 'Removed' }],
    })
    toaster.create({ title: 'Expense deleted', type: 'success' })
  }

  const tabs: { label: string; value: ExpenseStatus | 'all' }[] = [
    { label: 'All',       value: 'all' },
    { label: 'Pending',   value: 'pending' },
    { label: 'Paid',      value: 'paid' },
    { label: 'Cancelled', value: 'cancelled' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <Wallet size={20} style={{ color: 'var(--primary)' }} />
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>Expenses</h1>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {filtered.length} expense{filtered.length !== 1 ? 's' : ''} · Total {formatPHP(totalSpent)}
            </p>
          </div>
        </div>
        <button onClick={() => navigate('/add-expense')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--primary)' }}>
          <Plus size={15} /> New Expense
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-6 py-3 border-b overflow-x-auto shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        <div className="flex gap-1">
          {tabs.map(t => (
            <button key={t.value} onClick={() => setStatusFilter(t.value)}
              className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
              style={{
                backgroundColor: statusFilter === t.value ? 'var(--primary)' : 'var(--accent)',
                color: statusFilter === t.value ? 'var(--primary-foreground)' : 'var(--foreground)',
              }}>
              {t.label}
              {t.value !== 'all' && (
                <span className="ml-1 opacity-70">({expenses.filter(e => e.status === t.value).length})</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as ExpenseCategory | 'all')}
            className="px-3 py-1.5 rounded-lg border text-xs outline-none"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
            <option value="all">All categories</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={usedForFilter} onChange={e => setUsedForFilter(e.target.value as ExpenseUsedFor | 'all')}
            className="px-3 py-1.5 rounded-lg border text-xs outline-none"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
            <option value="all">All uses</option>
            {Object.entries(USED_FOR_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">

        {/* Draft expenses banner */}
        {drafts.length > 0 && (
          <div className="rounded-xl border overflow-hidden mb-4" style={{ borderColor: '#f59e0b', backgroundColor: '#fffbeb' }}>
            <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: '#fde68a', backgroundColor: '#fef3c7' }}>
              <PenLine size={14} style={{ color: '#b45309' }} />
              <p className="text-xs font-bold" style={{ color: '#b45309' }}>
                {drafts.length} Incomplete Expense{drafts.length > 1 ? 's' : ''} — Draft
              </p>
              <span className="text-xs" style={{ color: '#92400e' }}>· Auto-saved. Continue where you left off.</span>
            </div>
            <div className="divide-y" style={{ borderColor: '#fde68a' }}>
              {drafts.map(d => {
                const diff = Date.now() - new Date(d.savedAt).getTime()
                const mins = Math.floor(diff / 60000), hrs = Math.floor(mins / 60)
                const savedAgo = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`
                return (
                  <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: '#92400e' }}>
                        {d.payee || 'Untitled Expense'}
                        {d.amount ? <span className="ml-2 text-xs">({formatPHP(Number(d.amount))})</span> : null}
                      </p>
                      <p className="text-xs" style={{ color: '#b45309' }}>Saved {savedAgo}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => navigate(`/add-expense?draft=${d.id}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-90"
                        style={{ backgroundColor: '#b45309' }}>
                        <PenLine size={12} /> Continue
                      </button>
                      <button onClick={() => { deleteDraftCloud(d.id); setDrafts(ds => ds.filter(x => x.id !== d.id)) }}
                        title="Discard draft"
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: '#b45309' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#fde68a')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2" style={{ color: 'var(--muted-foreground)' }}>
            <Wallet size={32} className="opacity-30" />
            <p className="text-sm">No expenses recorded yet</p>
            <button onClick={() => navigate('/add-expense')}
              className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
              + Record your first expense
            </button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: 'var(--card)', color: 'var(--muted-foreground)' }}>
                    <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wide">Expense #</th>
                    <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wide">Date</th>
                    <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wide">Category</th>
                    <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wide">Used For</th>
                    <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wide">Payee</th>
                    <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wide">Method</th>
                    <th className="text-right px-4 py-3 font-bold text-xs uppercase tracking-wide">Amount</th>
                    <th className="text-center px-4 py-3 font-bold text-xs uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id}
                      className="border-b cursor-pointer transition-all"
                      style={{ borderColor: 'var(--border)' }}
                      onMouseEnter={ev => (ev.currentTarget.style.backgroundColor = 'var(--accent)')}
                      onMouseLeave={ev => (ev.currentTarget.style.backgroundColor = '')}
                      onClick={() => setSelected(e)}>
                      <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: 'var(--primary)' }}>{e.expenseNo}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>{formatDate(e.date)}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--foreground)' }}>{CATEGORY_LABELS[e.category]}</td>
                      <td className="px-4 py-3 text-xs max-w-[160px] truncate" style={{ color: 'var(--muted-foreground)' }}>{usedForLabel(e)}</td>
                      <td className="px-4 py-3 max-w-[160px] truncate" style={{ color: 'var(--foreground)' }}>{e.payee || '—'}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>{METHOD_LABELS[e.paymentMethod]}</td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap" style={{ color: 'var(--foreground)' }}>{formatPHP(e.amount)}</td>
                      <td className="px-4 py-3 text-center" onClick={ev => ev.stopPropagation()}>
                        <select
                          value={e.status}
                          onChange={ev => handleStatusChange(e, ev.target.value as ExpenseStatus)}
                          className={cn('px-2 py-0.5 rounded-full text-xs font-semibold border-0 cursor-pointer', STATUS_STYLE[e.status])}>
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <Eye size={15} style={{ color: 'var(--muted-foreground)' }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden flex flex-col gap-3">
              {filtered.map(e => (
                <div key={e.id}
                  className="rounded-xl border p-4 cursor-pointer transition-colors active:opacity-80"
                  style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                  onClick={() => setSelected(e)}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold" style={{ color: 'var(--primary)' }}>{e.expenseNo}</p>
                      <p className="font-semibold text-sm mt-0.5 truncate" style={{ color: 'var(--foreground)' }}>{e.payee || '—'}</p>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{CATEGORY_LABELS[e.category]} · {usedForLabel(e)}</p>
                    </div>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold shrink-0', STATUS_STYLE[e.status])}>
                      {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--muted-foreground)' }}>{formatDate(e.date)} · {METHOD_LABELS[e.paymentMethod]}</span>
                    <span className="font-bold" style={{ color: 'var(--foreground)' }}>{formatPHP(e.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Slide-in detail drawer */}
      {selected && (
        <ExpenseDetailPanel
          expense={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          onEdit={e => { setSelected(null); navigate(`/expenses/${e.id}/edit`) }}
          onDelete={e => setToDelete(e)}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!toDelete}
        onCancel={() => setToDelete(null)}
        onConfirm={() => { if (toDelete) handleDelete(toDelete); setToDelete(null) }}
        title="Delete this expense?"
        description={toDelete ? `${toDelete.expenseNo} — ${formatPHP(toDelete.amount)} will be permanently removed.` : ''}
        confirmLabel="Delete"
      />
    </div>
  )
}
