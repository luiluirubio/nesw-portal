import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, X, ChevronRight, ArrowLeft, Loader } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { agents } from '@/data/agents'

// Microsoft logo SVG
function MicrosoftLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
      <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
      <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
    </svg>
  )
}

// ── Microsoft SSO Modal ───────────────────────────────────────────────────────
function MicrosoftSSOModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (agentId: string) => void }) {
  const [step, setStep] = useState<'email' | 'password' | 'loading' | 'error'>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const matchedAgent = agents.find(a => a.email.toLowerCase() === email.toLowerCase())

  function handleEmailNext(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    if (!matchedAgent) {
      setErrorMsg(`The Microsoft account ${email} was not found in this organization.`)
      setStep('error')
      return
    }
    setStep('password')
  }

  function handlePasswordNext(e: React.FormEvent) {
    e.preventDefault()
    if (!password) return
    setStep('loading')
    setTimeout(() => {
      if (matchedAgent) onSuccess(matchedAgent.id)
    }, 1800)
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        style={{ animation: 'fadeIn 0.15s ease' }}>

        {/* Microsoft-style dialog */}
        <div className="w-full max-w-sm bg-white rounded-sm shadow-2xl overflow-hidden"
          style={{ animation: 'slideUp 0.2s ease' }}>

          {/* Microsoft top bar */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <MicrosoftLogo size={22} />
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={16} />
            </button>
          </div>

          {step === 'email' && (
            <form onSubmit={handleEmailNext} className="px-8 pb-8 pt-2">
              <h2 className="text-2xl font-light text-gray-900 mb-1">Sign in</h2>
              <p className="text-sm text-gray-500 mb-6">Use your Microsoft 365 account</p>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                autoFocus
                className="w-full border-b-2 border-gray-300 focus:border-[#0078d4] outline-none py-2 text-sm text-gray-900 mb-6 transition-colors"
                style={{ backgroundColor: 'transparent' }}
              />
              <div className="text-xs text-gray-500 mb-6">
                By signing in, you agree to the{' '}
                <span className="text-[#0078d4] cursor-pointer hover:underline">Terms of use</span>
                {' '}and{' '}
                <span className="text-[#0078d4] cursor-pointer hover:underline">Privacy & cookies</span>.
              </div>
              <div className="flex justify-end">
                <button type="submit"
                  className="px-7 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#0078d4' }}>
                  Next
                </button>
              </div>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handlePasswordNext} className="px-8 pb-8 pt-2">
              {/* Account pill */}
              <div className="flex items-center gap-2 mb-5">
                <button type="button" onClick={() => setStep('email')}
                  className="p-1 text-gray-400 hover:text-gray-600">
                  <ArrowLeft size={14} />
                </button>
                <div className="flex items-center gap-2 border border-gray-200 rounded-full px-3 py-1">
                  <div className="w-5 h-5 rounded-full bg-[#0078d4] flex items-center justify-center text-white text-xs font-bold">
                    {matchedAgent?.name.split(' ').slice(0, 2).map(n => n[0]).join('') ?? email[0]?.toUpperCase()}
                  </div>
                  <span className="text-xs text-gray-700">{email}</span>
                </div>
              </div>

              <h2 className="text-2xl font-light text-gray-900 mb-1">Enter password</h2>
              <p className="text-xs text-gray-500 mb-6">{matchedAgent?.name} · NESW Corporation</p>

              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                autoFocus
                className="w-full border-b-2 border-gray-300 focus:border-[#0078d4] outline-none py-2 text-sm text-gray-900 mb-2 transition-colors"
                style={{ backgroundColor: 'transparent' }}
              />
              <div className="text-right mb-6">
                <span className="text-xs text-[#0078d4] cursor-pointer hover:underline">Forgot password?</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-[#0078d4] cursor-pointer hover:underline">Sign-in options</span>
                <button type="submit"
                  className="px-7 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#0078d4' }}>
                  Sign in
                </button>
              </div>
            </form>
          )}

          {step === 'loading' && (
            <div className="px-8 pb-10 pt-4 flex flex-col items-center gap-4">
              <Loader size={28} className="animate-spin" style={{ color: '#0078d4' }} />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-800">Signing you in…</p>
                <p className="text-xs text-gray-500 mt-1">Authenticating with Microsoft 365</p>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="px-8 pb-8 pt-2">
              <h2 className="text-xl font-light text-gray-900 mb-2">Account not found</h2>
              <p className="text-sm text-red-600 mb-6">{errorMsg}</p>
              <div className="text-xs text-gray-500 mb-6">
                Make sure you are using your NESW Corporation Microsoft 365 account (e.g. <span className="font-mono">yourname@nesw.com</span>).
              </div>
              <button onClick={() => { setStep('email'); setEmail(''); setErrorMsg('') }}
                className="flex items-center gap-1.5 text-xs text-[#0078d4] hover:underline">
                <ArrowLeft size={12} /> Try a different account
              </button>
            </div>
          )}

          {/* Microsoft footer */}
          <div className="bg-gray-50 border-t border-gray-100 px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <MicrosoftLogo size={12} />
              <span className="text-xs text-gray-400">Microsoft 365</span>
            </div>
            <div className="flex gap-3 text-xs text-gray-400">
              <span className="cursor-pointer hover:text-gray-600">Terms of use</span>
              <span className="cursor-pointer hover:text-gray-600">Privacy</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
    </>
  )
}

// ── Main Login Page ───────────────────────────────────────────────────────────
export function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [showSSO, setShowSSO] = useState(false)

  function handleSSOSuccess(agentId: string) {
    login(agentId, 'microsoft_sso')
    setShowSSO(false)
    navigate('/')
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F4F6FA' }}>

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ backgroundColor: '#0D1F12' }}>
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-5" style={{ backgroundColor: '#1A6B3C' }} />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-5" style={{ backgroundColor: '#C9973A' }} />

        <div className="relative z-10">
          <div className="mb-6 flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ backgroundColor: '#1A6B3C' }}>
              <Home size={28} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-black text-white leading-tight">NESW Realty</p>
              <p className="text-xs font-semibold tracking-widest" style={{ color: '#4B7A5C' }}>PROPERTY PORTAL</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed max-w-xs" style={{ color: '#6B9A7C' }}>
            A centralized platform for NESW real estate agents to manage, upload, and track property listings.
          </p>

          <div className="flex items-center gap-6 mt-10">
            {[{ label: 'Active Listings', value: '20+' }, { label: 'Agents', value: '10' }, { label: 'Cities Covered', value: '8' }].map(s => (
              <div key={s.label}>
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-xs" style={{ color: '#4B7A5C' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-xs font-semibold tracking-widest mb-4" style={{ color: '#4B7A5C' }}>PROPERTY TYPES</p>
          <div className="flex flex-wrap gap-2">
            {['House & Lot', 'Condominium', 'Lot Only', 'Commercial', 'Townhouse', 'Warehouse', 'Farm Lot'].map(t => (
              <span key={t} className="px-3 py-1 rounded-full text-xs font-semibold border"
                style={{ color: '#8BB89C', borderColor: '#1A3D22', backgroundColor: '#0F2A16' }}>{t}</span>
            ))}
          </div>
          <div className="mt-8 pt-6 border-t" style={{ borderColor: '#1A2E1D' }}>
            <p className="text-xs" style={{ color: '#2E4D35' }}>© 2025 NESW Corporation · Prototype v1.0</p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-16">
        <div className="lg:hidden mb-8 text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
            style={{ backgroundColor: '#1A6B3C' }}>
            <Home size={28} className="text-white" />
          </div>
          <p className="text-xl font-black text-slate-900">NESW Realty</p>
          <p className="text-xs font-semibold tracking-widest text-slate-400">PROPERTY PORTAL</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Welcome</h2>
            <p className="text-slate-500 mt-1 text-sm">Sign in to access the Property Portal</p>
          </div>

          {/* Microsoft SSO button */}
          <button
            onClick={() => setShowSSO(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-lg border-2 bg-white transition-all hover:shadow-md hover:border-[#0078d4] group mb-4"
            style={{ borderColor: '#e1e8ed' }}>
            <MicrosoftLogo size={20} />
            <span className="flex-1 text-sm font-semibold text-slate-700 text-left group-hover:text-[#0078d4] transition-colors">
              Sign in with Microsoft 365
            </span>
            <ChevronRight size={15} className="text-slate-400 group-hover:text-[#0078d4] transition-colors" />
          </button>

          {/* SSO info badge */}
          <div className="flex items-start gap-2 p-3 rounded-lg mb-6"
            style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
            <div className="mt-0.5 shrink-0">
              <MicrosoftLogo size={14} />
            </div>
            <p className="text-xs text-blue-700 leading-relaxed">
              Use your <strong>@nesw.com</strong> Microsoft 365 account. Single sign-on keeps you logged in across NESW applications.
            </p>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px" style={{ backgroundColor: '#e1e8ed' }} />
            <span className="text-xs text-slate-400">OR</span>
            <div className="flex-1 h-px" style={{ backgroundColor: '#e1e8ed' }} />
          </div>

          {/* Demo fallback — select any agent */}
          <div className="p-4 rounded-xl border" style={{ backgroundColor: '#FAFBFC', borderColor: '#e1e8ed' }}>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Demo / Prototype Login</p>
            <p className="text-xs text-slate-400 mb-3">No Microsoft account? Select an agent below to explore the portal.</p>
            <select
              onChange={e => { if (e.target.value) { login(e.target.value, 'manual'); navigate('/') } }}
              defaultValue=""
              className="w-full appearance-none px-3 py-2.5 text-sm text-slate-800 rounded-lg focus:outline-none cursor-pointer border"
              style={{ borderColor: '#e1e8ed', backgroundColor: 'white' }}>
              <option value="">— Select an agent —</option>
              {agents.map(a => (
                <option key={a.id} value={a.id}>
                  {a.role === 'Super Admin' ? '⭐ ' : ''}{a.name} ({a.role})
                </option>
              ))}
            </select>
          </div>

          <p className="text-center text-xs text-slate-400 mt-5">
            NESW Corporation · Secure Portal Access
          </p>
        </div>
      </div>

      {showSSO && (
        <MicrosoftSSOModal
          onClose={() => setShowSSO(false)}
          onSuccess={handleSSOSuccess}
        />
      )}
    </div>
  )
}
