import * as Select from '@radix-ui/react-select'
import React, { useState, useEffect } from 'react'
import { Check, ChevronsUpDown, Search, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  sublabel?: string
}

interface SelectMenuProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  error?: boolean
  /** Allow user to type a new value and add it to the list */
  creatable?: boolean
  className?: string
}

export function SelectMenu({
  value,
  onChange,
  options: initialOptions,
  placeholder = 'Select…',
  error = false,
  creatable = false,
  className,
}: SelectMenuProps) {
  const [search, setSearch]   = useState('')
  const [options, setOptions] = useState<SelectOption[]>(initialOptions)
  const [open, setOpen]       = useState(false)

  useEffect(() => {
    setOptions(prev => {
      const keys = new Set(initialOptions.map(o => o.value))
      const local = prev.filter(o => !keys.has(o.value))
      return [...initialOptions, ...local]
    })
  }, [initialOptions])

  const filtered = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase()) ||
    (opt.sublabel?.toLowerCase().includes(search.toLowerCase()) ?? false)
  )

  const displayLabel = options.find(o => o.value === value)?.label ?? value

  function addCustom() {
    const trimmed = search.trim()
    if (!trimmed) return
    const existing = options.find(o => o.label.toLowerCase() === trimmed.toLowerCase())
    if (existing) {
      onChange(existing.value)
    } else {
      const newOpt: SelectOption = { value: trimmed, label: trimmed }
      setOptions(prev => [...prev, newOpt])
      onChange(trimmed)
    }
    setSearch('')
    setOpen(false)
  }

  return (
    <Select.Root
      value={value}
      onValueChange={val => { onChange(val); setSearch('') }}
      open={open}
      onOpenChange={o => { setOpen(o); if (o) setSearch('') }}
    >
      <Select.Trigger
        className={cn(
          'w-full inline-flex items-center justify-between px-3 py-2.5 text-sm rounded-[var(--radius-sm)] transition-colors focus:outline-none',
          className
        )}
        style={{
          border: `1px solid ${error ? '#ef4444' : 'var(--border)'}`,
          backgroundColor: 'var(--background)',
          color: 'var(--foreground)',
        }}
      >
        <Select.Value placeholder={placeholder}>
          {value
            ? <span style={{ color: 'var(--foreground)' }}>{displayLabel}</span>
            : <span style={{ color: 'var(--muted-foreground)' }}>{placeholder}</span>
          }
        </Select.Value>
        <Select.Icon className="shrink-0 ml-2">
          <ChevronsUpDown size={13} style={{ color: 'var(--muted-foreground)' }} />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          position="popper"
          avoidCollisions={false}
          className="z-50 overflow-hidden rounded-[var(--radius-sm)] shadow-lg"
          style={{
            width: 'var(--radix-select-trigger-width)',
            marginTop: '4px',
            backgroundColor: 'var(--popover)',
            border: '1px solid var(--border)',
          }}
        >
          {/* Search box */}
          <div
            className="flex items-center px-3 py-2 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <Search size={13} className="shrink-0 mr-2" style={{ color: 'var(--muted-foreground)' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && creatable) addCustom() }}
              placeholder="Search…"
              className="flex-1 text-sm outline-none bg-transparent"
              style={{ color: 'var(--foreground)' }}
              onMouseDown={e => e.stopPropagation()}
            />
          </div>

          <Select.Viewport className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 && !(creatable && search.trim()) && (
              <div className="px-3 py-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                No results found.
              </div>
            )}

            {filtered.map((opt, idx) => (
              <SelectItem key={`${opt.value}-${idx}`} value={opt.value} sublabel={opt.sublabel}>
                {opt.label}
              </SelectItem>
            ))}

            {creatable && search.trim() &&
              !filtered.some(o => o.label.toLowerCase() === search.trim().toLowerCase()) && (
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); addCustom() }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-sm transition-colors"
                style={{ color: 'var(--primary)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
              >
                <Plus size={13} /> Add "{search.trim()}"
              </button>
            )}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

const SelectItem = React.forwardRef<
  HTMLDivElement,
  { children: React.ReactNode; sublabel?: string } & React.ComponentPropsWithRef<typeof Select.Item>
>(({ children, sublabel, ...props }, ref) => (
  <Select.Item
    ref={ref}
    className="flex items-center justify-between px-3 py-2 text-sm rounded-sm cursor-default outline-none transition-colors"
    style={{ color: 'var(--foreground)' }}
    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--accent)' }}
    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '' }}
    onFocus={e => { e.currentTarget.style.backgroundColor = 'var(--accent)' }}
    onBlur={e => { e.currentTarget.style.backgroundColor = '' }}
    {...props}
  >
    <Select.ItemText>
      <div className="flex items-center gap-1.5 pr-3">
        <span>{children}</span>
        {sublabel && (
          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            — {sublabel}
          </span>
        )}
      </div>
    </Select.ItemText>
    <Select.ItemIndicator>
      <Check size={13} style={{ color: 'var(--primary)' }} />
    </Select.ItemIndicator>
  </Select.Item>
))
SelectItem.displayName = 'SelectItem'
