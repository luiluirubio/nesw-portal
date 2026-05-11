import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  open:            boolean
  title:           string
  description:     string
  confirmLabel?:   string
  confirmVariant?: 'danger' | 'primary'
  onConfirm:       () => void
  onCancel:        () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={o => { if (!o) onCancel() }}>
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
          style={{ animation: 'fadeIn 0.15s ease' }}
        />

        {/* Panel */}
        <Dialog.Content
          className="fixed z-[61] left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border shadow-2xl p-6 focus:outline-none"
          style={{
            backgroundColor: 'var(--background)',
            borderColor:     'var(--border)',
            animation:       'slideUp 0.2s ease',
          }}
        >
          <div className="flex items-start gap-4 mb-5">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-red-500" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <Dialog.Title
                className="text-sm font-bold mb-1"
                style={{ color: 'var(--foreground)' }}>
                {title}
              </Dialog.Title>
              <Dialog.Description
                className="text-xs leading-relaxed"
                style={{ color: 'var(--muted-foreground)' }}>
                {description}
              </Dialog.Description>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold border transition-all hover:opacity-80"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)', backgroundColor: 'var(--accent)' }}>
              Cancel
            </button>
            <button
              onClick={() => { onConfirm(); }}
              className={`flex-1 py-2.5 rounded-[var(--radius-sm)] text-sm font-bold text-white transition-colors hover:opacity-90 ${confirmVariant === 'primary' ? 'bg-[var(--primary)]' : 'bg-red-500'}`}>
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translate(-50%, calc(-50% + 12px)) } to { opacity: 1; transform: translate(-50%, -50%) } }
      `}</style>
    </Dialog.Root>
  )
}
