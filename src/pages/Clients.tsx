import { Users } from 'lucide-react'

export function Clients() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: 'var(--accent)' }}>
        <Users size={28} style={{ color: 'var(--muted-foreground)' }} />
      </div>
      <div className="text-center">
        <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>Clients Module</p>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>Coming soon — client management will be available in a future update.</p>
      </div>
    </div>
  )
}
