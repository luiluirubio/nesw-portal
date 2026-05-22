import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL as string

type VerifyResult = {
  verified: true
  billingNo: string
  clientName: string
  total: number
  paidAt: string
}

function php(n: number) {
  return `₱ ${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function PaymentSuccess() {
  const [params]  = useSearchParams()
  const ref       = params.get('ref') ?? ''

  const [status,  setStatus]  = useState<'loading' | 'success' | 'error'>('loading')
  const [data,    setData]    = useState<VerifyResult | null>(null)

  useEffect(() => {
    if (!ref) { setStatus('error'); return }

    fetch(`${API}/billing/public/verify?ref=${encodeURIComponent(ref)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: VerifyResult) => { setData(d); setStatus('success') })
      .catch(() => setStatus('error'))
  }, [ref])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f2044 0%, #1b3864 60%, #0f2044 100%)',
      fontFamily: 'system-ui, sans-serif',
      padding: '24px',
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '48px 40px',
        maxWidth: '480px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Logo */}
        <img
          src="/nesw-logo.png"
          alt="NESW"
          style={{ height: '40px', marginBottom: '24px', objectFit: 'contain' }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />

        {status === 'loading' && (
          <>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              border: '4px solid #e5e7eb', borderTopColor: '#1b3864',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }} />
            <p style={{ color: '#6b7280', fontSize: '15px' }}>Verifying your payment…</p>
          </>
        )}

        {status === 'success' && data && (
          <>
            {/* Check circle */}
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: '#dcfce7', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 20px',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1b3864', marginBottom: '6px' }}>
              Payment Received
            </h1>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '28px' }}>
              Thank you! Your payment has been confirmed.
            </p>

            {/* Details card */}
            <div style={{
              background: '#f8fafc', borderRadius: '10px',
              padding: '20px', marginBottom: '28px', textAlign: 'left',
            }}>
              {[
                { label: 'Billing No.',  value: data.billingNo },
                { label: 'Client',       value: data.clientName },
                { label: 'Amount Paid',  value: php(data.total) },
                { label: 'Date',         value: formatDate(data.paidAt) },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  padding: '8px 0', borderBottom: '1px solid #e5e7eb',
                }}>
                  <span style={{ color: '#9ca3af', fontSize: '13px', fontWeight: 500 }}>{label}</span>
                  <span style={{ color: '#1b3864', fontSize: '14px', fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>

            <p style={{ color: '#6b7280', fontSize: '13px', lineHeight: 1.6 }}>
              We'll prepare your documents for release shortly.<br />
              For inquiries, contact{' '}
              <a href="mailto:jrubio@neswcorp.com" style={{ color: '#1b3864', fontWeight: 600 }}>
                jrubio@neswcorp.com
              </a>
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: '#fef2f2', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 20px',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#dc2626" strokeWidth="2"/>
                <path d="M12 8v4m0 4h.01" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>

            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1b3864', marginBottom: '8px' }}>
              Payment Not Verified
            </h1>
            <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
              We couldn't verify your payment at this time.<br />
              This link may have expired or the payment is still being processed.
            </p>
            <p style={{ color: '#6b7280', fontSize: '13px' }}>
              Please contact{' '}
              <a href="mailto:jrubio@neswcorp.com" style={{ color: '#1b3864', fontWeight: 600 }}>
                jrubio@neswcorp.com
              </a>
              {' '}for assistance.
            </p>
          </>
        )}

        <p style={{ marginTop: '32px', color: '#d1d5db', fontSize: '12px' }}>
          NESW Property &amp; Planning Consultancy OPC
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
