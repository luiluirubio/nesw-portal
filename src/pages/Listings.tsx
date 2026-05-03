import { useState, useEffect } from 'react'
import {
  Search, X, Eye, MapPin, Home, Calendar, Maximize2,
  Upload, ChevronDown, Paperclip, Pencil, Check, ArrowLeft,
  Phone, Mail, User, PenLine, Trash2,
} from 'lucide-react'
import { properties } from '@/data/properties'
import { getAgent } from '@/data/agents'
import { useAuth } from '@/context/AuthContext'
import { useApp } from '@/context/AppContext'
import { useLogs } from '@/context/LogsContext'
import { formatPHP, daysSince, cn } from '@/lib/utils'
import { fetchDrafts, deleteDraftCloud } from '@/lib/drafts'
import type { ListingDraft } from '@/types/draft'

function pricePerSqm(price: number, floorArea: number, lotArea: number): string {
  const area = floorArea > 0 ? floorArea : lotArea
  if (!area) return '—'
  return formatPHP(Math.round(price / area)) + '/sqm'
}
import type { Property, PropertyStatus, PropertyType } from '@/types/property'
import type { FieldChange } from '@/types/activityLog'
import { useNavigate } from 'react-router-dom'
import { toaster } from '@/components/ui/toast'

const statusConfig: Record<PropertyStatus, { label: string; bg: string; text: string; dot: string; color: string }> = {
  available:      { label: 'Available',      bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', color: '#10b981' },
  reserved:       { label: 'Reserved',       bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   color: '#f59e0b' },
  under_contract: { label: 'Under Contract', bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    color: '#3b82f6' },
  sold:           { label: 'Sold',           bg: 'bg-slate-100',  text: 'text-slate-500',   dot: 'bg-slate-400',   color: '#94a3b8' },
  off_market:     { label: 'Off Market',     bg: 'bg-red-50',     text: 'text-red-400',     dot: 'bg-red-300',     color: '#ef4444' },
}

const typeLabels: Record<PropertyType, string> = {
  house_and_lot: 'House & Lot',
  condo:         'Condo',
  lot_only:      'Lot Only',
  commercial:    'Commercial',
  townhouse:     'Townhouse',
  warehouse:     'Warehouse',
  farm_lot:      'Farm Lot',
}

// ── Editable fields tracked for change log ────────────────────────────────────
const EDITABLE_FIELDS: { key: keyof EditDraft; label: string; type?: 'select' | 'textarea' | 'number' }[] = [
  { key: 'status',          label: 'Status',             type: 'select'   },
  { key: 'price',           label: 'Price',              type: 'number'   },
  { key: 'ownerName',       label: "Owner's Name"                         },
  { key: 'nameInTitle',     label: 'Name in Title'                        },
  { key: 'taxDeclarationNo',label: 'Tax Declaration No.'                  },
  { key: 'description',     label: 'Description',        type: 'textarea' },
]

interface EditDraft {
  status:          PropertyStatus
  price:           string
  ownerName:       string
  nameInTitle:     string
  taxDeclarationNo:string
  description:     string
}

function toDraft(p: Property): EditDraft {
  return {
    status:           p.status,
    price:            String(p.price),
    ownerName:        p.ownerName,
    nameInTitle:      p.nameInTitle,
    taxDeclarationNo: p.taxDeclarationNo,
    description:      p.description,
  }
}

// ── Detail Panel ─────────────────────────────────────────────────────────────
function PropertyDetailPanel({ property: orig, onClose, onSaved }: {
  property: Property
  onClose: () => void
  onSaved: (updated: Property) => void
}) {
  const { user } = useAuth()
  const { addLog } = useLogs()
  const agent = getAgent(orig.agentId)
  const days  = daysSince(orig.dateListed)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState<EditDraft>(toDraft(orig))
  // use a local copy so edits are reflected immediately in this panel
  const [current, setCurrent] = useState<Property>(orig)

  const sc = statusConfig[current.status]

  function update(key: keyof EditDraft, value: string) {
    setDraft(d => ({ ...d, [key]: value }))
  }

  function handleSave() {
    const changes: FieldChange[] = []

    EDITABLE_FIELDS.forEach(({ key, label }) => {
      const oldVal = key === 'price' ? String(current.price) : String(current[key as keyof Property] ?? '')
      const newVal = draft[key]
      if (oldVal !== newVal) {
        changes.push({
          field:    label,
          oldValue: key === 'price' ? formatPHP(Number(oldVal)) : oldVal,
          newValue: key === 'price' ? formatPHP(Number(newVal)) : newVal,
        })
      }
    })

    if (changes.length === 0) {
      toaster.create({ type: 'info', title: 'No Changes', description: 'No fields were modified.' })
      setEditing(false)
      return
    }

    const updated: Property = {
      ...current,
      status:           draft.status,
      price:            Number(draft.price),
      ownerName:        draft.ownerName,
      nameInTitle:      draft.nameInTitle,
      taxDeclarationNo: draft.taxDeclarationNo,
      description:      draft.description,
    }

    addLog({
      action:        'edited',
      propertyId:    orig.id,
      propertyTitle: orig.title,
      agentId:       user?.id ?? '',
      agentName:     user?.name ?? '',
      changes,
    })

    setCurrent(updated)
    setEditing(false)
    onSaved(updated)

    toaster.create({
      type:        'success',
      title:       'Listing Updated',
      description: `${changes.length} field${changes.length > 1 ? 's' : ''} updated and logged.`,
    })
  }

  function handleCancel() {
    setDraft(toDraft(current))
    setEditing(false)
  }

  const inputClass = 'w-full px-2.5 py-1.5 text-xs rounded-[var(--radius-sm)] focus:outline-none transition-colors'
  const inputStyle = { border: '1px solid var(--primary)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }

  const Field = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg border"
      style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
      <p className="text-xs shrink-0 w-36" style={{ color: 'var(--muted-foreground)' }}>{label}</p>
      <p className="text-xs font-semibold text-right truncate" style={{ color: 'var(--foreground)' }}>{value || '—'}</p>
    </div>
  )

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        style={{ animation: 'fadeIn 0.2s ease' }} onClick={onClose} />

      <div className="fixed inset-y-0 right-0 z-50 w-[620px] flex flex-col shadow-2xl"
        style={{ backgroundColor: 'var(--background)', animation: 'slideInRight 0.25s cubic-bezier(0.32,0.72,0,1)' }}>

        {/* Header */}
        <div className="relative px-6 pt-5 pb-4 overflow-hidden shrink-0" style={{ backgroundColor: 'var(--primary)' }}>
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full opacity-10 bg-white" />
          <button onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
            <X size={13} className="text-white" />
          </button>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white">{typeLabels[current.type]}</span>
            <span className={cn('px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1', sc.bg, sc.text)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', sc.dot)} />{sc.label}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white">
              {current.listingType === 'for_rent' ? 'For Rent' : 'For Sale'}
            </span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-xl font-bold text-white leading-tight">{current.title}</h2>
              <p className="text-white/60 text-xs mt-1 flex items-center gap-1">
                <MapPin size={10} /> {current.location.barangay}, {current.location.city}
              </p>
            </div>
            <p className="text-white font-black text-xl">
              {current.listingType === 'for_rent' ? `${formatPHP(current.price)}/mo` : formatPHP(current.price)}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-4 flex flex-col gap-3 overflow-y-auto">

          {/* Property Details */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted-foreground)' }}>Property Details</p>
            <div className="grid grid-cols-4 gap-2">
              {current.bedrooms  > 0 && <Field label="Bedrooms"   value={String(current.bedrooms)}  />}
              {current.bathrooms > 0 && <Field label="Bathrooms"  value={String(current.bathrooms)} />}
              {current.parking   > 0 && <Field label="Parking"    value={String(current.parking)}   />}
              {current.floorArea > 0 && <Field label="Floor Area" value={`${current.floorArea} sqm`} />}
              {current.lotArea   > 0 && <Field label="Lot Area"   value={`${current.lotArea} sqm`}  />}
              <Field label="Commission" value={`${current.commission}%`} />
              {current.listingType === 'for_sale' && (
                <Field label="Price / sqm" value={pricePerSqm(current.price, current.floorArea, current.lotArea)} />
              )}
            </div>
          </div>

          {/* Location */}
          <div className="border-t border-dashed pt-3" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted-foreground)' }}>Location</p>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border"
              style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--primary)' }}>
              <MapPin size={14} style={{ color: 'var(--primary)' }} />
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--primary)' }}>{current.location.address}</p>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {current.location.barangay}, {current.location.city}, {current.location.province}
                </p>
              </div>
            </div>
          </div>

          {/* Ownership Details — view or edit mode */}
          <div className="border-t border-dashed pt-3" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>Ownership Details</p>
              {!editing && (
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-[var(--radius-sm)] transition-all"
                  style={{ color: 'var(--primary)', backgroundColor: 'var(--accent)' }}>
                  <Pencil size={11} />Edit
                </button>
              )}
              {editing && (
                <div className="flex items-center gap-1.5">
                  <button onClick={handleCancel}
                    className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-[var(--radius-sm)]"
                    style={{ color: 'var(--muted-foreground)', backgroundColor: 'var(--accent)' }}>
                    <ArrowLeft size={11} />Cancel
                  </button>
                  <button onClick={handleSave}
                    className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-[var(--radius-sm)] text-white"
                    style={{ backgroundColor: 'var(--primary)' }}>
                    <Check size={11} />Save
                  </button>
                </div>
              )}
            </div>

            {!editing ? (
              <div className="grid grid-cols-1 gap-2">
                <Field label="Owner's Name"       value={current.ownerName} />
                <Field label="Name in Title"      value={current.nameInTitle} />
                <Field label="Tax Declaration No." value={current.taxDeclarationNo} />
              </div>
            ) : (
              <div className="space-y-2 p-3 rounded-lg border" style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--primary)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>Editing ownership fields</p>
                {[
                  { key: 'ownerName'        as keyof EditDraft, label: "Owner's Name" },
                  { key: 'nameInTitle'      as keyof EditDraft, label: 'Name in Title' },
                  { key: 'taxDeclarationNo' as keyof EditDraft, label: 'Tax Declaration No.' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <p className="text-xs mb-1" style={{ color: 'var(--muted-foreground)' }}>{label}</p>
                    <input
                      value={draft[key]}
                      onChange={e => update(key, e.target.value)}
                      className={inputClass} style={inputStyle} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status & Price — edit mode */}
          {editing && (
            <div className="border-t border-dashed pt-3" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted-foreground)' }}>Status & Price</p>
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border" style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--primary)' }}>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--muted-foreground)' }}>Status</p>
                  <div className="relative">
                    <select value={draft.status} onChange={e => update('status', e.target.value as PropertyStatus)}
                      className={cn(inputClass, 'appearance-none cursor-pointer pr-7')} style={inputStyle}>
                      {(Object.keys(statusConfig) as PropertyStatus[]).map(s => (
                        <option key={s} value={s}>{statusConfig[s].label}</option>
                      ))}
                    </select>
                    <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted-foreground)' }} />
                  </div>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--muted-foreground)' }}>Price (PHP)</p>
                  <input type="number" value={draft.price} onChange={e => update('price', e.target.value)}
                    className={inputClass} style={inputStyle} />
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="border-t border-dashed pt-3" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>Description</p>
            </div>
            {!editing ? (
              <p className="text-xs leading-relaxed" style={{ color: 'var(--foreground)' }}>{current.description}</p>
            ) : (
              <textarea
                value={draft.description}
                onChange={e => update('description', e.target.value)}
                rows={4}
                className={cn(inputClass, 'resize-none')} style={inputStyle} />
            )}
          </div>

          {/* Features */}
          {current.features.length > 0 && (
            <div className="border-t border-dashed pt-3" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted-foreground)' }}>Features & Amenities</p>
              <div className="flex flex-wrap gap-1.5">
                {current.features.map(f => (
                  <span key={f} className="px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--foreground)', border: '1px solid var(--border)' }}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              <Calendar size={12} style={{ color: 'var(--primary)' }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Date Listed</p>
                <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{current.dateListed}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              <Calendar size={12} style={{ color: days > 90 ? '#ef4444' : days > 30 ? '#f59e0b' : '#10b981' }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Days Listed</p>
                <p className={`text-xs font-bold ${days > 90 ? 'text-red-500' : days > 30 ? 'text-amber-500' : 'text-emerald-600'}`}>{days} days</p>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="border-t border-dashed pt-3" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted-foreground)' }}>Contact Person</p>
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3 px-3 py-2.5 border-b" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                <User size={13} style={{ color: 'var(--primary)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{current.contactPerson || '—'}</span>
              </div>
              <div className="flex items-center gap-3 px-3 py-2.5 border-b" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                <Mail size={13} style={{ color: 'var(--primary)' }} />
                <a href={`mailto:${current.contactEmail}`}
                  className="text-xs font-medium hover:underline"
                  style={{ color: 'var(--primary)' }}
                  onClick={e => e.stopPropagation()}>
                  {current.contactEmail || '—'}
                </a>
              </div>
              <div className="flex items-center gap-3 px-3 py-2.5" style={{ backgroundColor: 'var(--card)' }}>
                <Phone size={13} style={{ color: 'var(--primary)' }} />
                <a href={`tel:${current.contactPhone}`}
                  className="text-xs font-medium hover:underline"
                  style={{ color: 'var(--primary)' }}
                  onClick={e => e.stopPropagation()}>
                  {current.contactPhone || '—'}
                </a>
              </div>
            </div>
          </div>

          {/* Agent */}
          <div className="border-t border-dashed pt-3" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted-foreground)' }}>Listing Agent</p>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: 'var(--primary)' }}>
                {agent?.name.split(' ').slice(0, 2).map(n => n[0]).join('')}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{agent?.name}</p>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{agent?.role} · {agent?.branch}</p>
              </div>
              <div className="ml-auto text-xs" style={{ color: 'var(--muted-foreground)' }}>{agent?.phone}</div>
            </div>
          </div>

          {/* Documents */}
          {current.documents.length > 0 && (
            <div className="border-t border-dashed pt-3" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted-foreground)' }}>Documents</p>
              <div className="space-y-1.5">
                {current.documents.map((doc, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border px-4 py-2.5 cursor-pointer transition-all hover:shadow-sm"
                    style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--card)')}>
                    <span className="text-lg shrink-0">📄</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{doc.name}</p>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{doc.type.replace('_', ' ').toUpperCase()} · {doc.size}</p>
                    </div>
                    <Paperclip size={14} style={{ color: 'var(--muted-foreground)' }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t flex gap-2 shrink-0"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
          {!editing && current.status === 'available' && (
            <button
              onClick={() => { update('status', 'reserved'); setEditing(true) }}
              className="flex-1 py-2 rounded-[var(--radius-sm)] text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: 'var(--primary)' }}>
              Mark as Reserved
            </button>
          )}
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center justify-center gap-2 flex-1 py-2 rounded-[var(--radius-sm)] text-sm font-semibold border transition-all hover:opacity-80"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)', backgroundColor: 'var(--accent)' }}>
              <Pencil size={14} />Edit Listing
            </button>
          )}
          {editing && (
            <>
              <button onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-[var(--radius-sm)] text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: 'var(--primary)' }}>
                <Check size={14} />Save Changes
              </button>
              <button onClick={handleCancel}
                className="flex-1 py-2 rounded-[var(--radius-sm)] text-sm font-semibold border transition-all hover:opacity-80"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)', backgroundColor: 'var(--accent)' }}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn       { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideInRight { from { transform: translateX(100%); opacity:.6 } to { transform: translateX(0); opacity:1 } }
      `}</style>
    </>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
interface ListingsProps { myOnly?: boolean }

export function Listings({ myOnly = false }: ListingsProps) {
  const { user } = useAuth()
  const { selectedBranch } = useApp()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'Super Admin' || user?.role === 'Branch Manager'

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<PropertyStatus | 'all'>('all')
  const [filterType, setFilterType] = useState<PropertyType | 'all'>('all')
  const [filterListing, setFilterListing] = useState<'all' | 'for_sale' | 'for_rent'>('all')
  const [drafts, setDrafts] = useState<ListingDraft[]>([])

  useEffect(() => {
    if (user) fetchDrafts().then(setDrafts).catch(() => {})
  }, [user])

  function removeDraft(id: string) {
    deleteDraftCloud(id)
    setDrafts(d => d.filter(x => x.id !== id))
  }
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  // local overrides so edits reflect immediately in the table
  const [localOverrides, setLocalOverrides] = useState<Record<string, Property>>({})

  const effective = (p: Property) => localOverrides[p.id] ?? p

  const scoped = properties.filter(p => {
    if (myOnly || !isAdmin) {
      if (p.agentId !== user?.id) return false
    } else if (selectedBranch !== 'all') {
      const agent = getAgent(p.agentId)
      if (agent?.branch !== selectedBranch) return false
    }
    return true
  }).map(effective)

  const counts = {
    available:      scoped.filter(p => p.status === 'available').length,
    reserved:       scoped.filter(p => p.status === 'reserved').length,
    under_contract: scoped.filter(p => p.status === 'under_contract').length,
    sold:           scoped.filter(p => p.status === 'sold').length,
  }

  const filtered = scoped.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false
    if (filterType !== 'all' && p.type !== filterType) return false
    if (filterListing !== 'all' && p.listingType !== filterListing) return false
    const q = search.toLowerCase()
    if (q && !p.title.toLowerCase().includes(q) && !p.location.city.toLowerCase().includes(q) && !p.id.toLowerCase().includes(q)) return false
    return true
  })

  const summaryCards = [
    { key: 'available' as PropertyStatus,      label: 'Available',      count: counts.available,      bar: '#10b981' },
    { key: 'reserved' as PropertyStatus,       label: 'Reserved',       count: counts.reserved,       bar: '#f59e0b' },
    { key: 'under_contract' as PropertyStatus, label: 'Under Contract', count: counts.under_contract, bar: '#3b82f6' },
    { key: 'sold' as PropertyStatus,           label: 'Sold',           count: counts.sold,           bar: '#94a3b8' },
  ]

  const total = scoped.length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
            {myOnly ? 'My Listings' : 'All Listings'}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            {filtered.length} of {total} properties shown
          </p>
        </div>
        <button
          onClick={() => navigate('/add-listing')}
          className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] text-sm font-bold text-white transition-all hover:opacity-90"
          style={{ backgroundColor: 'var(--primary)' }}>
          <Upload size={15} />
          Add Listing
        </button>
      </div>

      {/* Draft Listings Banner */}
      {drafts.length > 0 && (
        <div className="rounded-[var(--radius)] border overflow-hidden"
          style={{ borderColor: '#f59e0b', backgroundColor: '#fffbeb' }}>
          <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: '#fde68a', backgroundColor: '#fef3c7' }}>
            <PenLine size={14} style={{ color: '#b45309' }} />
            <p className="text-xs font-bold" style={{ color: '#b45309' }}>
              {drafts.length} Incomplete Listing{drafts.length > 1 ? 's' : ''} — Draft
            </p>
            <span className="text-xs" style={{ color: '#92400e' }}>
              · Auto-saved. Continue where you left off.
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: '#fde68a' }}>
            {drafts.map(d => {
              const stepLabel = ['Listing Details','Ownership','Location','Specifications','Contact & Media','Review'][d.lastStep - 1] ?? `Step ${d.lastStep}`
              const savedAgo  = (() => {
                const diff = Date.now() - new Date(d.savedAt).getTime()
                const mins = Math.floor(diff / 60000)
                const hrs  = Math.floor(mins / 60)
                const days = Math.floor(hrs / 24)
                if (mins < 1)   return 'just now'
                if (mins < 60)  return `${mins}m ago`
                if (hrs  < 24)  return `${hrs}h ago`
                return `${days}d ago`
              })()
              return (
                <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#92400e' }}>
                      {d.form.title || 'Untitled Listing'}
                    </p>
                    <p className="text-xs" style={{ color: '#b45309' }}>
                      Stopped at <strong>{stepLabel}</strong> · Saved {savedAgo}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-800">
                      Step {d.lastStep}/6
                    </span>
                    <button
                      onClick={() => navigate(`/add-listing?draft=${d.id}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold text-white transition-all hover:opacity-90"
                      style={{ backgroundColor: '#b45309' }}>
                      <PenLine size={12} />Continue
                    </button>
                    <button
                      onClick={() => removeDraft(d.id)}
                      title="Discard draft"
                      className="p-1.5 rounded-[var(--radius-sm)] transition-colors"
                      style={{ color: '#b45309' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#fde68a')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {summaryCards.map(({ key, label, count, bar }) => {
          const active = filterStatus === key
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          return (
            <button key={key} onClick={() => setFilterStatus(active ? 'all' : key)}
              className={cn('rounded-[var(--radius)] border p-4 text-left transition-all hover:shadow-md', active ? 'ring-2' : '')}
              style={{ backgroundColor: 'var(--background)', borderColor: active ? bar : 'var(--border)', outline: active ? `2px solid ${bar}` : undefined }}>
              <div className="flex items-center justify-between mb-2">
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', statusConfig[key].bg, statusConfig[key].text)}>{label}</span>
                <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>{pct}%</span>
              </div>
              <p className="text-3xl font-black" style={{ color: 'var(--foreground)' }}>{count}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>properties</p>
              <div className="mt-3 w-full rounded-full h-1.5" style={{ backgroundColor: 'var(--muted)' }}>
                <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: bar }} />
              </div>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search title, city, ID..."
            className="pl-8 pr-8 py-2 text-sm rounded-[var(--radius-sm)] focus:outline-none w-56"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }} />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X size={13} style={{ color: 'var(--muted-foreground)' }} />
            </button>
          )}
        </div>

        <div className="relative">
          <select value={filterType} onChange={e => setFilterType(e.target.value as PropertyType | 'all')}
            className="appearance-none pl-3 pr-8 py-2 text-sm rounded-[var(--radius-sm)] focus:outline-none cursor-pointer"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)', minWidth: '150px' }}>
            <option value="all">All Types</option>
            {(Object.entries(typeLabels) as [PropertyType, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted-foreground)' }} />
        </div>

        <div className="relative">
          <select value={filterListing} onChange={e => setFilterListing(e.target.value as 'all' | 'for_sale' | 'for_rent')}
            className="appearance-none pl-3 pr-8 py-2 text-sm rounded-[var(--radius-sm)] focus:outline-none cursor-pointer"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)', minWidth: '130px' }}>
            <option value="all">For Sale & Rent</option>
            <option value="for_sale">For Sale</option>
            <option value="for_rent">For Rent</option>
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted-foreground)' }} />
        </div>

        {(filterStatus !== 'all' || filterType !== 'all' || filterListing !== 'all' || search) && (
          <button onClick={() => { setFilterStatus('all'); setFilterType('all'); setFilterListing('all'); setSearch('') }}
            className="px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold flex items-center gap-1.5 transition-all"
            style={{ border: '1px solid var(--destructive)', color: 'var(--destructive)', backgroundColor: 'transparent' }}>
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-[var(--radius)] border overflow-hidden"
        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
                {['ID', 'Property', 'Type', 'Location', 'Area', 'Price', 'Price/sqm', 'Status', 'Agent', 'Days', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide whitespace-nowrap"
                    style={{ color: 'var(--muted-foreground)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const agent = getAgent(p.agentId)
                const sc    = statusConfig[p.status]
                const days  = daysSince(p.dateListed)
                return (
                  <tr key={p.id}
                    className="border-b cursor-pointer transition-all"
                    style={{ borderColor: 'var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                    onClick={() => setSelectedProperty(p)}>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>{p.id}</td>
                    <td className="px-4 py-3 max-w-48">
                      <p className="font-semibold truncate" style={{ color: 'var(--foreground)' }}>{p.title}</p>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        {p.listingType === 'for_rent' ? '🔑 For Rent' : '🏷️ For Sale'}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: 'var(--accent)', color: 'var(--foreground)' }}>
                        {typeLabels[p.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--foreground)' }}>{p.location.city}</p>
                      <p className="text-xs truncate max-w-28" style={{ color: 'var(--muted-foreground)' }}>{p.location.barangay}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="space-y-0.5">
                        {p.floorArea > 0 && (
                          <p className="text-xs flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                            <Maximize2 size={9} />{p.floorArea} sqm
                          </p>
                        )}
                        {p.lotArea > 0 && (
                          <p className="text-xs flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                            <Home size={9} />{p.lotArea} sqm lot
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold whitespace-nowrap" style={{ color: 'var(--foreground)' }}>
                      {p.listingType === 'for_rent' ? `${formatPHP(p.price)}/mo` : formatPHP(p.price)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {p.listingType === 'for_sale' ? (
                        <span className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
                          {pricePerSqm(p.price, p.floorArea, p.lotArea)}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1', sc.bg, sc.text)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', sc.dot)} />{sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{agent?.name.split(' ')[0]}</p>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{agent?.branch}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold ${days > 90 ? 'text-red-500' : days > 30 ? 'text-amber-500' : 'text-emerald-600'}`}>
                        {days}d
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--muted-foreground)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted-foreground)')}>
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
              No properties match your filters.
            </div>
          )}
        </div>
      </div>

      {selectedProperty && (
        <PropertyDetailPanel
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
          onSaved={updated => setLocalOverrides(o => ({ ...o, [updated.id]: updated }))}
        />
      )}
    </div>
  )
}
