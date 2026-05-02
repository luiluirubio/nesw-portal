import { Toast, Toaster, createToaster } from '@ark-ui/react/toast'
import { Portal } from '@ark-ui/react/portal'
import { CheckCircle, AlertCircle, X, Info, AlertTriangle } from 'lucide-react'

export const toaster = createToaster({
  overlap: true,
  placement: 'top',
  gap: 16,
})

const toastConfig = {
  success: { icon: CheckCircle, colors: 'bg-green-50 border-l-4 border-green-500 text-green-800', iconColor: 'text-green-500' },
  error:   { icon: AlertCircle, colors: 'bg-red-50 border-l-4 border-red-500 text-red-800',       iconColor: 'text-red-500'   },
  warning: { icon: AlertTriangle, colors: 'bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800', iconColor: 'text-yellow-500' },
  info:    { icon: Info, colors: 'bg-blue-50 border-l-4 border-blue-500 text-blue-800', iconColor: 'text-blue-500' },
}

export function AppToaster() {
  return (
    <Portal>
      <Toaster toaster={toaster}>
        {(toast) => {
          const cfg = toastConfig[toast.type as keyof typeof toastConfig] ?? toastConfig.info
          const Icon = cfg.icon
          return (
            <Toast.Root
              className={`rounded-lg shadow-lg min-w-80 p-4 relative overflow-hidden transition-all duration-300 ease-in-out will-change-transform ${cfg.colors}`}
              style={{
                height: 'var(--height)',
                opacity: 'var(--opacity)',
                transform: 'translateX(var(--x)) translateY(var(--y)) scale(var(--scale))',
                zIndex: 'var(--z-index)',
              }}>
              <div className="flex items-start gap-3">
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.iconColor}`} />
                <div className="flex-1 min-w-0">
                  <Toast.Title className="font-semibold text-sm leading-tight">{toast.title}</Toast.Title>
                  <Toast.Description className="text-sm opacity-80 mt-0.5">{toast.description}</Toast.Description>
                </div>
              </div>
              <Toast.CloseTrigger className="absolute top-3 right-3 p-1 hover:bg-black/10 rounded transition-colors">
                <X className="w-3 h-3" />
              </Toast.CloseTrigger>
            </Toast.Root>
          )
        }}
      </Toaster>
    </Portal>
  )
}
