import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, Check, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ComboBoxOption {
  value: string
  label: string
  sublabel?: string
}

interface ComboBoxProps {
  value: string
  /** Receives the selected value and full option object */
  onChange: (value: string, option?: ComboBoxOption) => void
  options: ComboBoxOption[]
  placeholder?: string
  error?: boolean
  /** Allow user to type a free-text value and add it as a new option */
  creatable?: boolean
  className?: string
}

const VISIBLE_LIMIT = 80   // max rows rendered at once (performance on large lists)

export function ComboBox({
  value,
  onChange,
  options: externalOptions,
  placeholder = 'Search…',
  error = false,
  creatable = false,
  className,
}: ComboBoxProps) {
  const [isOpen, setIsOpen]     = useState(false)
  const [inputValue, setInput]  = useState('')
  const [localOpts, setLocal]   = useState<ComboBoxOption[]>([])   // user-added entries
  const containerRef            = useRef<HTMLDivElement>(null)
  const inputRef                = useRef<HTMLInputElement>(null)

  // Merged option list: external + locally-added creatable entries
  const options = [...externalOptions, ...localOpts]

  // Display label for the currently-selected value
  const selectedLabel = options.find(o => o.value === value)?.label ?? value

  // Keep the input showing the selected label when closed
  useEffect(() => {
    if (!isOpen) setInput(selectedLabel)
  }, [isOpen, selectedLabel])

  // Filter: when input is empty show top VISIBLE_LIMIT; otherwise filter all
  const filtered = (
    inputValue.trim()
      ? options.filter(o =>
          o.label.toLowerCase().includes(inputValue.toLowerCase()) ||
          (o.sublabel?.toLowerCase().includes(inputValue.toLowerCase()) ?? false)
        )
      : options
  ).slice(0, VISIBLE_LIMIT)

  const showAdd =
    creatable &&
    inputValue.trim().length > 0 &&
    !options.some(o => o.label.toLowerCase() === inputValue.trim().toLowerCase())

  // ── Event handlers ──────────────────────────────────────────────────────────

  function open() {
    setInput('')   // clear so user sees full list on focus
    setIsOpen(true)
  }

  function close() {
    setIsOpen(false)
    // restores the selected label (handled by the useEffect above)
  }

  function handleBlur() {
    // Short delay so onPointerDown on an option fires before blur closes the list
    setTimeout(close, 160)
  }

  function handleSelect(opt: ComboBoxOption) {
    onChange(opt.value, opt)
    setInput(opt.label)
    setIsOpen(false)
  }

  function handleAddNew() {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    const newOpt: ComboBoxOption = { value: trimmed, label: trimmed }
    setLocal(prev => [...prev, newOpt])
    onChange(trimmed, newOpt)
    setInput(trimmed)
    setIsOpen(false)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('', undefined)
    setInput('')
    inputRef.current?.focus()
  }

  // Close on outside click/touch
  const handleContainerBlur = useCallback((e: React.FocusEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      handleBlur()
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      onBlur={handleContainerBlur}
    >
      {/* ── Input row ─────────────────────────────────────────────────────── */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => { setInput(e.target.value); setIsOpen(true) }}
          onFocus={open}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          inputMode="search"
          className="w-full px-3 py-3 pr-16 text-sm rounded-[var(--radius-sm)] focus:outline-none transition-colors"
          style={{
            border:           `1px solid ${error ? '#ef4444' : isOpen ? 'var(--primary)' : 'var(--border)'}`,
            backgroundColor:  'var(--background)',
            color:            'var(--foreground)',
            // Comfortable minimum touch height
            minHeight: '44px',
          }}
        />

        {/* Clear button — only when something is selected */}
        {value && (
          <button
            type="button"
            onPointerDown={handleClear}
            tabIndex={-1}
            className="absolute inset-y-0 right-8 flex items-center px-1.5 touch-manipulation"
            style={{ color: 'var(--muted-foreground)' }}
            aria-label="Clear selection">
            <X size={13} />
          </button>
        )}

        {/* Chevron toggle */}
        <button
          type="button"
          onPointerDown={e => { e.preventDefault(); isOpen ? close() : (open(), inputRef.current?.focus()) }}
          tabIndex={-1}
          className="absolute inset-y-0 right-0 flex items-center px-2.5 touch-manipulation"
          style={{ color: 'var(--muted-foreground)' }}
          aria-label="Toggle dropdown">
          <ChevronDown
            size={15}
            className={cn('transition-transform duration-200', isOpen ? 'rotate-180' : '')}
          />
        </button>
      </div>

      {/* ── Dropdown ──────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="absolute z-50 left-0 right-0 mt-1 rounded-[var(--radius-sm)] border shadow-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--popover)',
            borderColor:     'var(--border)',
            // Cap at 40 % of viewport so it never goes below the keyboard on mobile
            maxHeight: 'min(260px, 40vh)',
          }}>

          <div className="overflow-y-auto" style={{ maxHeight: 'inherit' }}>
            {/* Empty state */}
            {filtered.length === 0 && !showAdd && (
              <p className="px-4 py-4 text-sm text-center" style={{ color: 'var(--muted-foreground)' }}>
                No results found.
              </p>
            )}

            {/* Options */}
            {filtered.map((opt, i) => {
              const selected = value === opt.value
              return (
                <div
                  key={`${opt.value}-${i}`}
                  onPointerDown={e => { e.preventDefault(); handleSelect(opt) }}
                  className={cn(
                    'flex items-center gap-3 px-4 cursor-pointer select-none transition-colors',
                    // Generous touch target
                    opt.sublabel ? 'py-2.5' : 'py-3',
                    selected ? 'font-medium' : ''
                  )}
                  style={{
                    color:           'var(--foreground)',
                    backgroundColor: selected ? 'var(--accent)' : undefined,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = selected ? 'var(--accent)' : '')}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug truncate">{opt.label}</p>
                    {opt.sublabel && (
                      <p className="text-xs leading-tight mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                        {opt.sublabel}
                      </p>
                    )}
                  </div>
                  {selected && (
                    <Check size={14} className="shrink-0" style={{ color: 'var(--primary)' }} />
                  )}
                </div>
              )
            })}

            {/* Add new (creatable) */}
            {showAdd && (
              <div
                onPointerDown={e => { e.preventDefault(); handleAddNew() }}
                className="flex items-center gap-2.5 px-4 py-3 cursor-pointer border-t select-none transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
              >
                <Plus size={14} className="shrink-0" />
                <span className="text-sm font-medium">Add "{inputValue.trim()}"</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ComboBox
