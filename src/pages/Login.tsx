import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

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

export function Login() {
  const { login, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  // redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate('/listings', { replace: true })
  }, [isAuthenticated, isLoading, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F4F6FA' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#1A6B3C]/20 border-t-[#1A6B3C] rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Checking authentication…</p>
        </div>
      </div>
    )
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
            <p className="text-xs" style={{ color: '#2E4D35' }}>© 2025 NESW Corporation · Property Portal</p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-16">

        {/* Mobile logo */}
        <div className="lg:hidden mb-8 text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
            style={{ backgroundColor: '#1A6B3C' }}>
            <Home size={28} className="text-white" />
          </div>
          <p className="text-xl font-black text-slate-900">NESW Realty</p>
          <p className="text-xs font-semibold tracking-widest text-slate-400">PROPERTY PORTAL</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900">Welcome</h2>
            <p className="text-slate-500 mt-1 text-sm">Sign in with your NESW Microsoft 365 account</p>
          </div>

          <button
            onClick={login}
            className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl border-2 bg-white transition-all hover:shadow-md hover:border-[#0078d4] group"
            style={{ borderColor: '#e1e8ed' }}>
            <MicrosoftLogo size={20} />
            <span className="flex-1 text-sm font-semibold text-slate-700 text-left group-hover:text-[#0078d4] transition-colors">
              Sign in with Microsoft 365
            </span>
            <svg className="w-4 h-4 text-slate-300 group-hover:text-[#0078d4] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <p className="text-center text-xs text-slate-400 mt-6">
            Use your <strong className="text-slate-500">@nesw.com</strong> account to access the portal.
            <br />Single sign-on via Microsoft 365.
          </p>
        </div>
      </div>
    </div>
  )
}
