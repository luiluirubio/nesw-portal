import { useState, useRef, type KeyboardEvent } from 'react'
import { X, Mail, Send } from 'lucide-react'

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())
}

interface Props {
  open: boolean
  onClose: () => void
  initialEmails: string[]
  subject: string
  initialBody: string
  onSend: (to: string[], body: string) => Promise<void>
}

export function SendEmailDialog({ open, onClose, initialEmails, subject, initialBody, onSend }: Props) {
  const [chips, setChips]       = useState<string[]>(() => initialEmails.filter(isValidEmail))
  const [inputVal, setInputVal] = useState('')
  const [inputErr, setInputErr] = useState('')
  const [body, setBody]         = useState(initialBody)
  const [sending, setSending]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function addChip(raw: string) {
    const email = raw.trim().replace(/,+$/, '')
    if (!email) return
    if (!isValidEmail(email)) { setInputErr('Invalid email address'); return }
    if (chips.includes(email)) { setInputErr('Already added'); return }
    setChips(c => [...c, email])
    setInputVal('')
    setInputErr('')
  }

  function removeChip(email: string) {
    setChips(c => c.filter(x => x !== email))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      e.preventDefault()
      addChip(inputVal)
    } else if (e.key === 'Backspace' && !inputVal) {
      setChips(c => c.slice(0, -1))
    }
  }

  async function handleSend() {
    if (inputVal.trim()) addChip(inputVal)
    const recipients = inputVal.trim() && isValidEmail(inputVal)
      ? [...chips, inputVal.trim()]
      : chips
    if (recipients.length === 0) { setInputErr('Add at least one recipient'); return }
    setSending(true)
    try {
      await onSend(recipients, body)
      onClose()
    } finally {
      setSending(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <Mail size={15} style={{ color: 'var(--primary)' }} />
            <h2 className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>Send to Email</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--accent)]"
            style={{ color: 'var(--muted-foreground)' }}>
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Subject */}
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Subject</p>
            <p className="text-sm px-3 py-2 rounded-lg"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--foreground)' }}>
              {subject}
            </p>
          </div>

          {/* To */}
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>To</p>
            <div
              className="flex flex-wrap gap-1.5 px-3 py-2 rounded-lg border min-h-[44px] cursor-text"
              style={{ borderColor: inputErr ? '#ef4444' : 'var(--border)', backgroundColor: 'var(--background)' }}
              onClick={() => inputRef.current?.focus()}>
              {chips.map(email => (
                <span key={email}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--primary)' }}>
                  {email}
                  <button type="button" onClick={() => removeChip(email)}
                    className="opacity-60 hover:opacity-100 ml-0.5">
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                ref={inputRef}
                value={inputVal}
                onChange={e => { setInputVal(e.target.value); setInputErr('') }}
                onKeyDown={handleKeyDown}
                onBlur={() => { if (inputVal.trim()) addChip(inputVal) }}
                placeholder={chips.length === 0 ? 'Type email and press Enter…' : ''}
                className="flex-1 min-w-[140px] text-sm outline-none bg-transparent"
                style={{ color: 'var(--foreground)' }}
              />
            </div>
            {inputErr
              ? <p className="text-xs text-red-500 mt-1">{inputErr}</p>
              : <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                  Press Enter, comma, or Tab to add each recipient
                </p>
            }
          </div>

          {/* Body */}
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Message</p>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={7}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none focus:ring-2"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end px-5 py-4 border-t shrink-0"
          style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm border transition-colors hover:bg-[var(--accent)]"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
            Cancel
          </button>
          <button onClick={handleSend} disabled={sending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: 'var(--primary)' }}>
            <Send size={13} />
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
