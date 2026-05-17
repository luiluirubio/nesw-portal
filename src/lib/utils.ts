import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPHP(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function formatSqm(sqm: number): string {
  return `${sqm.toLocaleString()} sqm`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function addWorkingDays(from: Date, days: number): string {
  const d = new Date(from)
  let added = 0
  while (added < days) {
    d.setDate(d.getDate() + 1)
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) added++
  }
  return d.toISOString().slice(0, 10)
}

// Shared form input styling — used across add/edit form pages
export const inputCls = 'w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors focus:ring-2'
export const inputStyle = { borderColor: 'var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' } as const
