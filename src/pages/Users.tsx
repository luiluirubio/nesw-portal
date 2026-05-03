import { useState, useEffect } from 'react'
import { Search, X, Plus, Shield, Clock, Eye, EyeOff, RefreshCw,
         CheckCircle, XCircle, Pencil, KeyRound, ChevronDown, Lock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Navigate } from 'react-router-dom'

interface PortalUser {
  id: string; name: string; email: string; role: 'Admin' | 'Agent'
  branch: string; licenseNo: string; status: 'active' | 'inactive'
  createdAt?: string; lastLoginAt?: string
}

const BRANCHES = ['Headquarters','Cebu City','Mandaue','Lapu-Lapu','Talisay']
const roleBadge: Record<string, string> = {
  Admin: 'bg-amber-100 text-amber-700',
  Agent: 'bg-blue-100 text-blue-700',
}

function timeAgo(iso?: string) {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000); const hrs = Math.floor(mins / 60); const days = Math.floor(hrs / 24)
  if (mins < 1) return 'just now'; if (mins < 60) return `${mins}m ago`
  if (hrs < 24) return `${hrs}h ago`; return `${days}d ago`
}

// ── Change Password Modal ─────────────────────────────────────────────────────
function ChangePasswordModal({ user, onClose }: { user: PortalUser; onClose: () => void }) {
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [error, setError]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [done, setDone]           = useState(false)

  const inputCls = 'w-full px-3 py-2.5 text-sm rounded-[var(--radius-sm)] focus:outline-none transition-colors'
  const inputSty = { border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }

  async function handleSave() {
    if (!password) { setError('New password is required.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setError(''); setSaving(true)
    try {
      await api.updateUser(user.id, { password })
      setDone(true)
      setTimeout(onClose, 1500)
    } catch (e) { setError((e as Error).message) }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" style={{ animation: 'fadeIn 0.15s ease' }}>
        <div className="w-full max-w-sm rounded-[var(--radius)] border shadow-2xl" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', animation: 'slideUp 0.2s ease' }}>
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <Lock size={16} style={{ color: 'var(--primary)' }} />
              <p className="text-base font-bold" style={{ color: 'var(--foreground)' }}>Change Password</p>
            </div>
            <button onClick={onClose} style={{ color: 'var(--muted-foreground)' }} className="hover:opacity-70"><X size={18} /></button>
          </div>

          <div className="px-6 py-5 space-y-4">
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Setting new password for <strong style={{ color: 'var(--foreground)' }}>{user.name}</strong> ({user.email})
            </p>

            {done ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <CheckCircle size={16} className="text-emerald-600" />
                <p className="text-sm font-semibold text-emerald-700">Password updated successfully!</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>New Password</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError('') }}
                      placeholder="Min. 8 characters" className={cn(inputCls, 'pr-9')} style={inputSty}
                      onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
                    <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }}>
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Confirm Password</label>
                  <input type={showPw ? 'text' : 'password'} value={confirm} onChange={e => { setConfirm(e.target.value); setError('') }}
                    placeholder="Repeat new password" className={inputCls} style={inputSty}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
                </div>
                {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              </>
            )}
          </div>

          {!done && (
            <div className="flex gap-2 px-6 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 rounded-[var(--radius-sm)] text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: 'var(--primary)' }}>
                {saving ? 'Saving…' : 'Update Password'}
              </button>
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold border transition-all hover:opacity-80"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)', backgroundColor: 'var(--accent)' }}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn  { from{opacity:0}to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)} }
      `}</style>
    </>
  )
}

// ── Create / Edit User Modal ──────────────────────────────────────────────────
function UserModal({ user, onClose, onSaved }: {
  user: PortalUser | null
  onClose: () => void
  onSaved:  () => void
}) {
  const isEdit = !!user
  const [form, setForm] = useState({
    name:      user?.name      ?? '',
    email:     user?.email     ?? '',
    role:      user?.role      ?? 'Agent',
    branch:    user?.branch    ?? 'Cebu City',
    licenseNo: user?.licenseNo ?? '',
    password:  '',
    confirmPw: '',
  })
  const [showPw, setShowPw]   = useState(false) // kept for new user creation
  const [error, setError]     = useState('')
  const [saving, setSaving]   = useState(false)

  const inputCls = 'w-full px-3 py-2.5 text-sm rounded-[var(--radius-sm)] focus:outline-none transition-colors'
  const inputSty = { border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }
  const lbl = 'block text-xs font-semibold mb-1.5'
  const lblS = { color: 'var(--foreground)' }

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) { setError('Name and email are required.'); return }
    if (!isEdit && !form.password) { setError('Password is required for new users.'); return }
    if (form.password && form.password !== form.confirmPw) { setError('Passwords do not match.'); return }
    if (form.password && form.password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setError(''); setSaving(true)
    try {
      if (isEdit) {
        const body: Record<string, string> = { name: form.name, role: form.role, branch: form.branch, licenseNo: form.licenseNo }
        if (form.password) body.password = form.password
        await api.updateUser(user!.id, body)
      } else {
        await api.createUser({ name: form.name, email: form.email, role: form.role, branch: form.branch, licenseNo: form.licenseNo, password: form.password })
      }
      onSaved(); onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
        style={{ animation: 'fadeIn 0.15s ease' }}>
        <div className="w-full max-w-md rounded-[var(--radius)] border shadow-2xl"
          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', animation: 'slideUp 0.2s ease' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <p className="text-base font-bold" style={{ color: 'var(--foreground)' }}>
              {isEdit ? 'Edit User' : 'Create New User'}
            </p>
            <button onClick={onClose} style={{ color: 'var(--muted-foreground)' }} className="hover:opacity-70"><X size={18} /></button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={lbl} style={lblS}>Full Name <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                  placeholder="e.g. Juan dela Cruz" className={inputCls} style={inputSty}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
              </div>
              {!isEdit && (
                <div className="col-span-2">
                  <label className={lbl} style={lblS}>Email Address <span className="text-red-500">*</span></label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
                    placeholder="name@nesw.com" className={inputCls} style={inputSty}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
                </div>
              )}
              <div>
                <label className={lbl} style={lblS}>Role</label>
                <div className="relative">
                  <select value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value as 'Admin'|'Agent'}))}
                    className={cn(inputCls,'appearance-none cursor-pointer pr-8')} style={inputSty}>
                    <option value="Admin">Admin</option>
                    <option value="Agent">Agent</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted-foreground)' }} />
                </div>
              </div>
              <div>
                <label className={lbl} style={lblS}>Branch</label>
                <div className="relative">
                  <select value={form.branch} onChange={e => setForm(f => ({...f, branch: e.target.value}))}
                    className={cn(inputCls,'appearance-none cursor-pointer pr-8')} style={inputSty}>
                    {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted-foreground)' }} />
                </div>
              </div>
              <div className="col-span-2">
                <label className={lbl} style={lblS}>PRC License No.</label>
                <input value={form.licenseNo} onChange={e => setForm(f => ({...f, licenseNo: e.target.value}))}
                  placeholder="e.g. REB-2024-001234" className={inputCls} style={inputSty}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
              </div>
              {!isEdit && (
                <>
                  <div>
                    <label className={lbl} style={lblS}>Password <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} value={form.password}
                        onChange={e => setForm(f => ({...f, password: e.target.value}))}
                        placeholder="Min. 8 characters" className={cn(inputCls,'pr-9')} style={inputSty}
                        onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
                      <button type="button" onClick={() => setShowPw(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }}>
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={lbl} style={lblS}>Confirm Password</label>
                    <input type={showPw ? 'text' : 'password'} value={form.confirmPw}
                      onChange={e => setForm(f => ({...f, confirmPw: e.target.value}))}
                      placeholder="Repeat password" className={inputCls} style={inputSty}
                      onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
                  </div>
                </>
              )}
              {isEdit && (
                <div className="col-span-2 flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <Lock size={14} className="text-blue-600 shrink-0" />
                  <p className="text-xs text-blue-700">To change this user's password, use the <strong>🔒 key icon</strong> in the users table.</p>
                </div>
              )}
            </div>

            {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          </div>

          {/* Footer */}
          <div className="flex gap-2 px-6 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 rounded-[var(--radius-sm)] text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: 'var(--primary)' }}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}
            </button>
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold border transition-all hover:opacity-80"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)', backgroundColor: 'var(--accent)' }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn  { from{opacity:0}to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)} }
      `}</style>
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function Users() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin'
  if (!isAdmin) return <Navigate to="/listings" replace />

  const [users, setUsers]         = useState<PortalUser[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterRole, setFilterRole] = useState<'all'|'Admin'|'Agent'>('all')
  const [filterStatus, setFilterStatus] = useState<'all'|'active'|'inactive'>('all')
  const [editTarget, setEditTarget] = useState<PortalUser | null | 'new'>(null)
  const [pwTarget, setPwTarget]   = useState<PortalUser | null>(null)
  const [toggling, setToggling]   = useState<string | null>(null)

  async function loadUsers() {
    setLoading(true)
    try { setUsers(await api.getUsers() as PortalUser[]) } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { loadUsers() }, [])

  async function toggleStatus(u: PortalUser) {
    setToggling(u.id)
    const newStatus = u.status === 'active' ? 'inactive' : 'active'
    try {
      await api.setUserStatus(u.id, newStatus)
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: newStatus } : x))
    } catch { /* ignore */ } finally { setToggling(null) }
  }

  const filtered = users.filter(u => {
    if (filterRole   !== 'all' && u.role   !== filterRole)   return false
    if (filterStatus !== 'all' && u.status !== filterStatus) return false
    const q = search.toLowerCase()
    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.branch.toLowerCase().includes(q)
  })

  const activeCount = users.filter(u => u.status === 'active').length
  const adminCount  = users.filter(u => u.role === 'Admin').length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>User Management</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            Manage portal accounts, roles, and access
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadUsers} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold border"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)', backgroundColor: 'var(--accent)' }}>
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />Refresh
          </button>
          <button onClick={() => setEditTarget('new')}
            className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] text-sm font-bold text-white hover:opacity-90 transition-all"
            style={{ backgroundColor: 'var(--primary)' }}>
            <Plus size={15} />Create User
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Users',  value: users.length,  icon: Shield,       color: 'var(--primary)', bg: 'bg-emerald-50' },
          { label: 'Active',       value: activeCount,   icon: CheckCircle,  color: '#10b981',         bg: 'bg-emerald-50' },
          { label: 'Inactive',     value: users.length - activeCount, icon: XCircle, color: '#ef4444', bg: 'bg-red-50' },
          { label: 'Admins',       value: adminCount,    icon: KeyRound,     color: '#f59e0b',         bg: 'bg-amber-50'   },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-[var(--radius)] border p-4 flex items-center gap-3"
            style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', bg)}>
              <Icon size={16} style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-black" style={{ color: 'var(--foreground)' }}>{value}</p>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, branch…"
            className="pl-8 pr-8 py-2 text-sm rounded-[var(--radius-sm)] focus:outline-none w-56"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }} />
          {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2"><X size={13} style={{ color: 'var(--muted-foreground)' }} /></button>}
        </div>
        {(['all','Admin','Agent'] as const).map(r => (
          <button key={r} onClick={() => setFilterRole(r)}
            className="px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold border transition-all"
            style={{
              backgroundColor: filterRole === r ? 'var(--primary)' : 'var(--background)',
              color:           filterRole === r ? 'white'           : 'var(--foreground)',
              borderColor:     filterRole === r ? 'var(--primary)'  : 'var(--border)',
            }}>
            {r === 'all' ? 'All Roles' : r}
          </button>
        ))}
        {(['all','active','inactive'] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className="px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold border transition-all"
            style={{
              backgroundColor: filterStatus === s ? (s === 'inactive' ? '#ef4444' : 'var(--primary)') : 'var(--background)',
              color:           filterStatus === s ? 'white' : 'var(--foreground)',
              borderColor:     filterStatus === s ? (s === 'inactive' ? '#ef4444' : 'var(--primary)') : 'var(--border)',
            }}>
            {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-[var(--radius)] border overflow-hidden"
        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
        {loading ? (
          <div className="py-16 flex items-center justify-center gap-3">
            <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--muted-foreground)' }} />
            <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Loading users…</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
                  {['User','Email','Role','Branch','Status','Last Login','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide whitespace-nowrap"
                      style={{ color: 'var(--muted-foreground)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} className="border-b transition-colors"
                    style={{ borderColor: 'var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0',
                          u.status === 'inactive' && 'opacity-40')}
                          style={{ backgroundColor: u.role === 'Admin' ? 'var(--gold)' : 'var(--primary)' }}>
                          {u.name.split(' ').slice(0,2).map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: u.status === 'inactive' ? 'var(--muted-foreground)' : 'var(--foreground)' }}>
                            {u.name}
                          </p>
                          <p className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>{u.id}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>{u.email}</td>

                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', roleBadge[u.role] ?? 'bg-slate-100 text-slate-600')}>
                        {u.role}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--muted-foreground)' }}>{u.branch}</td>

                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold',
                        u.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600')}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', u.status === 'active' ? 'bg-emerald-500' : 'bg-red-400')} />
                        {u.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                        <Clock size={11} />{timeAgo(u.lastLoginAt)}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* Change Password */}
                        <button onClick={() => setPwTarget(u)}
                          title="Change password"
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: 'var(--muted-foreground)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#f59e0b')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted-foreground)')}>
                          <Lock size={14} />
                        </button>

                        {/* Edit */}
                        <button onClick={() => setEditTarget(u)}
                          title="Edit user"
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: 'var(--muted-foreground)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted-foreground)')}>
                          <Pencil size={14} />
                        </button>

                        {/* Activate / Deactivate — cannot deactivate yourself */}
                        {u.id !== user?.id && (
                          <button
                            onClick={() => toggleStatus(u)}
                            disabled={toggling === u.id}
                            title={u.status === 'active' ? 'Deactivate user' : 'Activate user'}
                            className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
                            style={{ color: u.status === 'active' ? '#ef4444' : '#10b981' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                            {toggling === u.id
                              ? <RefreshCw size={14} className="animate-spin" />
                              : u.status === 'active'
                                ? <XCircle size={14} />
                                : <CheckCircle size={14} />
                            }
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr><td colSpan={7} className="py-12 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>No users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Change Password modal */}
      {pwTarget && (
        <ChangePasswordModal user={pwTarget} onClose={() => setPwTarget(null)} />
      )}

      {/* Create / Edit modal */}
      {editTarget !== null && (
        <UserModal
          user={editTarget === 'new' ? null : editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={loadUsers}
        />
      )}
    </div>
  )
}
