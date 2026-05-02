import { Construction } from 'lucide-react'

export function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: 'var(--accent)' }}>
        <Construction size={24} style={{ color: 'var(--primary)' }} />
      </div>
      <div className="text-center">
        <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{title}</p>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>This module is under development.</p>
      </div>
    </div>
  )
}
