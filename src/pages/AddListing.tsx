import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, X, FileText, Image, ChevronDown, CheckCircle, ArrowLeft } from 'lucide-react'
import { toaster } from '@/components/ui/toast'
import { useAuth } from '@/context/AuthContext'
import { useLogs } from '@/context/LogsContext'
import { cn } from '@/lib/utils'
import type { PropertyType, ListingType } from '@/types/property'

const propertyTypes: { value: PropertyType; label: string }[] = [
  { value: 'house_and_lot', label: 'House & Lot' },
  { value: 'condo',         label: 'Condominium' },
  { value: 'lot_only',      label: 'Lot Only' },
  { value: 'commercial',    label: 'Commercial' },
  { value: 'townhouse',     label: 'Townhouse' },
  { value: 'warehouse',     label: 'Warehouse' },
  { value: 'farm_lot',      label: 'Farm Lot' },
]

const cebuCities = ['Cebu City', 'Mandaue City', 'Lapu-Lapu City', 'Talisay City', 'Liloan', 'Consolacion', 'Minglanilla', 'Danao City', 'Bogo City', 'Naga City', 'Carcar City', 'Argao', 'Other']

const commonFeatures = [
  'Swimming Pool', 'Gym', 'Balcony', 'Home Office', 'Smart Home', 'Solar Panels', 'CCTV',
  'Generator', 'Elevator', 'Garden', 'Parking Lot', 'Loading Dock', 'Security Guard',
  'Near Highway', 'Near School', 'Near Hospital', 'Near Mall', 'Beach Access', 'Sea View',
  'Mountain View', 'Corner Lot', 'Furnished', 'Fully Furnished', 'Rental Income Potential',
]

interface UploadedFile { name: string; size: string; type: 'photo' | 'document' }

export function AddListing() {
  const { user } = useAuth()
  const { addLog } = useLogs()
  const navigate = useNavigate()
  const photoInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    title: '',
    type: 'house_and_lot' as PropertyType,
    listingType: 'for_sale' as ListingType,
    price: '',
    address: '',
    barangay: '',
    city: 'Cebu City',
    province: 'Cebu',
    floorArea: '',
    lotArea: '',
    bedrooms: '',
    bathrooms: '',
    parking: '',
    description: '',
    commission: '3',
    ownerName: '',
    nameInTitle: '',
    taxDeclarationNo: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
  })

  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})

  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedFile[]>([])
  const [uploadedDocs, setUploadedDocs] = useState<UploadedFile[]>([])
  const [photoDragging, setPhotoDragging] = useState(false)
  const [docDragging, setDocDragging] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }))
  }

  function formatPhone(raw: string) {
    // strip everything except digits and +
    const digits = raw.replace(/[^\d+]/g, '')
    // format: 09XX-XXX-XXXX or +639XX-XXX-XXXX
    if (digits.startsWith('+63') && digits.length <= 13) {
      const local = digits.slice(3)
      if (local.length <= 3) return '+63' + local
      if (local.length <= 6) return '+63' + local.slice(0, 3) + '-' + local.slice(3)
      return '+63' + local.slice(0, 3) + '-' + local.slice(3, 6) + '-' + local.slice(6, 10)
    }
    if (digits.startsWith('0') && digits.length <= 11) {
      if (digits.length <= 4)  return digits
      if (digits.length <= 7)  return digits.slice(0, 4) + '-' + digits.slice(4)
      return digits.slice(0, 4) + '-' + digits.slice(4, 7) + '-' + digits.slice(7, 11)
    }
    return raw
  }

  function handlePhoneChange(value: string) {
    update('contactPhone', formatPhone(value))
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.title.trim())   e.title   = 'Property title is required.'
    if (!form.price)          e.price   = 'Price is required.'
    if (form.price && Number(form.price) <= 0) e.price = 'Price must be greater than 0.'
    if (!form.address.trim()) e.address = 'Street address is required.'
    if (!form.ownerName.trim())  e.ownerName  = "Owner's name is required."
    if (!form.contactPerson.trim()) e.contactPerson = 'Contact person is required.'
    if (!form.contactEmail.trim()) {
      e.contactEmail = 'Email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) {
      e.contactEmail = 'Enter a valid email address.'
    }
    if (!form.contactPhone.trim()) {
      e.contactPhone = 'Phone number is required.'
    } else {
      const digits = form.contactPhone.replace(/\D/g, '')
      if (!/^(0\d{10}|63\d{10})$/.test(digits)) {
        e.contactPhone = 'Enter a valid PH number (09XX-XXX-XXXX or +639XX-XXX-XXXX).'
      }
    }
    return e
  }

  function toggleFeature(f: string) {
    setSelectedFeatures(prev =>
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    )
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function handlePhotoFiles(files: FileList | null) {
    if (!files) return
    const newFiles: UploadedFile[] = Array.from(files).map(f => ({
      name: f.name,
      size: formatFileSize(f.size),
      type: 'photo',
    }))
    setUploadedPhotos(prev => [...prev, ...newFiles])
  }

  function handleDocFiles(files: FileList | null) {
    if (!files) return
    const newFiles: UploadedFile[] = Array.from(files).map(f => ({
      name: f.name,
      size: formatFileSize(f.size),
      type: 'document',
    }))
    setUploadedDocs(prev => [...prev, ...newFiles])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toaster.create({ type: 'error', title: 'Fix the errors below', description: `${Object.keys(errs).length} field(s) need attention.` })
      return
    }
    const newId = 'PROP-' + String(Date.now()).slice(-5)
    addLog({
      action:        'created',
      propertyId:    newId,
      propertyTitle: form.title,
      agentId:       user?.id ?? '',
      agentName:     user?.name ?? '',
      changes: [
        { field: 'Type',      oldValue: '—', newValue: form.type },
        { field: 'Price',     oldValue: '—', newValue: `PHP ${Number(form.price).toLocaleString()}` },
        { field: 'City',      oldValue: '—', newValue: form.city },
        { field: 'Owner',     oldValue: '—', newValue: form.ownerName },
        { field: 'Tax Dec.',  oldValue: '—', newValue: form.taxDeclarationNo || '—' },
      ],
    })
    setSubmitted(true)
    toaster.create({
      type: 'success',
      title: 'Listing Submitted!',
      description: `"${form.title}" has been submitted and logged.`,
    })
    setTimeout(() => navigate('/listings'), 2000)
  }

  const inputClass = 'w-full px-3 py-2.5 text-sm rounded-[var(--radius-sm)] focus:outline-none transition-colors'
  const inputStyle = { border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }
  const inputError = { border: '1px solid #ef4444', backgroundColor: 'var(--background)', color: 'var(--foreground)' }
  const labelClass = 'block text-xs font-semibold mb-1.5'
  const labelStyle = { color: 'var(--foreground)' }

  const Err = ({ field }: { field: string }) =>
    errors[field] ? <p className="text-xs mt-1 text-red-500">{errors[field]}</p> : null

  const needsBedBath = ['house_and_lot', 'condo', 'townhouse'].includes(form.type)
  const needsFloor = !['lot_only', 'farm_lot'].includes(form.type)
  const needsLot = ['house_and_lot', 'lot_only', 'townhouse', 'commercial', 'warehouse', 'farm_lot'].includes(form.type)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-[var(--radius-sm)] transition-colors"
          style={{ color: 'var(--muted-foreground)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Add Property Listing</h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Upload a new property to your inventory</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Section 1: Basic Info */}
        <div className="rounded-[var(--radius)] border p-5"
          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
          <p className="text-sm font-bold mb-4" style={{ color: 'var(--foreground)' }}>Basic Information</p>
          <div className="space-y-4">
            <div>
              <label className={labelClass} style={labelStyle}>Property Title <span className="text-red-500">*</span></label>
              <input
                value={form.title}
                onChange={e => update('title', e.target.value)}
                placeholder="e.g. Modern House in Banilad Heights"
                className={inputClass} style={errors.title ? inputError : inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = errors.title ? '#ef4444' : 'var(--primary)')}
                onBlur={e => (e.currentTarget.style.borderColor = errors.title ? '#ef4444' : 'var(--border)')}
              />
              <Err field="title" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass} style={labelStyle}>Property Type <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select value={form.type} onChange={e => update('type', e.target.value)}
                    className={cn(inputClass, 'appearance-none cursor-pointer pr-8')} style={inputStyle}>
                    {propertyTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted-foreground)' }} />
                </div>
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Listing Type <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select value={form.listingType} onChange={e => update('listingType', e.target.value)}
                    className={cn(inputClass, 'appearance-none cursor-pointer pr-8')} style={inputStyle}>
                    <option value="for_sale">For Sale</option>
                    <option value="for_rent">For Rent</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted-foreground)' }} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass} style={labelStyle}>
                  {form.listingType === 'for_rent' ? 'Monthly Rent (PHP)' : 'Asking Price (PHP)'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={form.price}
                  onChange={e => update('price', e.target.value)}
                  placeholder="e.g. 5000000"
                  className={inputClass} style={errors.price ? inputError : inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = errors.price ? '#ef4444' : 'var(--primary)')}
                  onBlur={e => (e.currentTarget.style.borderColor = errors.price ? '#ef4444' : 'var(--border)')}
                />
                <Err field="price" />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Commission (%)</label>
                <input
                  type="number"
                  value={form.commission}
                  onChange={e => update('commission', e.target.value)}
                  placeholder="e.g. 3"
                  min="0" max="10" step="0.5"
                  className={inputClass} style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 1b: Ownership Details */}
        <div className="rounded-[var(--radius)] border p-5"
          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
          <p className="text-sm font-bold mb-4" style={{ color: 'var(--foreground)' }}>Ownership Details</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass} style={labelStyle}>Owner's Name <span className="text-red-500">*</span></label>
              <input
                value={form.ownerName}
                onChange={e => update('ownerName', e.target.value)}
                placeholder="e.g. Juan A. dela Cruz"
                className={inputClass} style={errors.ownerName ? inputError : inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = errors.ownerName ? '#ef4444' : 'var(--primary)')}
                onBlur={e => (e.currentTarget.style.borderColor = errors.ownerName ? '#ef4444' : 'var(--border)')}
              />
              <Err field="ownerName" />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Name in Title <span className="text-red-500">*</span></label>
              <input
                value={form.nameInTitle}
                onChange={e => update('nameInTitle', e.target.value)}
                placeholder="Exact name as it appears on the title"
                className={inputClass} style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Tax Declaration No.</label>
              <input
                value={form.taxDeclarationNo}
                onChange={e => update('taxDeclarationNo', e.target.value)}
                placeholder="e.g. TD-2024-001234"
                className={inputClass} style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Location */}
        <div className="rounded-[var(--radius)] border p-5"
          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
          <p className="text-sm font-bold mb-4" style={{ color: 'var(--foreground)' }}>Location</p>
          <div className="space-y-4">
            <div>
              <label className={labelClass} style={labelStyle}>Street Address <span className="text-red-500">*</span></label>
              <input
                value={form.address}
                onChange={e => update('address', e.target.value)}
                placeholder="e.g. Lot 12 Blk 5 Subdivision Name"
                className={inputClass} style={errors.address ? inputError : inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = errors.address ? '#ef4444' : 'var(--primary)')}
                onBlur={e => (e.currentTarget.style.borderColor = errors.address ? '#ef4444' : 'var(--border)')}
              />
              <Err field="address" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass} style={labelStyle}>Barangay</label>
                <input
                  value={form.barangay}
                  onChange={e => update('barangay', e.target.value)}
                  placeholder="e.g. Banilad"
                  className={inputClass} style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>City <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select value={form.city} onChange={e => update('city', e.target.value)}
                    className={cn(inputClass, 'appearance-none cursor-pointer pr-8')} style={inputStyle}>
                    {cebuCities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted-foreground)' }} />
                </div>
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Province</label>
                <input
                  value={form.province}
                  onChange={e => update('province', e.target.value)}
                  className={inputClass} style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Property Specs */}
        <div className="rounded-[var(--radius)] border p-5"
          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
          <p className="text-sm font-bold mb-4" style={{ color: 'var(--foreground)' }}>Property Specifications</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {needsFloor && (
              <div>
                <label className={labelClass} style={labelStyle}>Floor Area (sqm)</label>
                <input type="number" value={form.floorArea} onChange={e => update('floorArea', e.target.value)}
                  placeholder="0" min="0"
                  className={inputClass} style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
              </div>
            )}
            {needsLot && (
              <div>
                <label className={labelClass} style={labelStyle}>Lot Area (sqm)</label>
                <input type="number" value={form.lotArea} onChange={e => update('lotArea', e.target.value)}
                  placeholder="0" min="0"
                  className={inputClass} style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
              </div>
            )}
            {needsBedBath && (
              <>
                <div>
                  <label className={labelClass} style={labelStyle}>Bedrooms</label>
                  <input type="number" value={form.bedrooms} onChange={e => update('bedrooms', e.target.value)}
                    placeholder="0" min="0" max="20"
                    className={inputClass} style={inputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
                </div>
                <div>
                  <label className={labelClass} style={labelStyle}>Bathrooms</label>
                  <input type="number" value={form.bathrooms} onChange={e => update('bathrooms', e.target.value)}
                    placeholder="0" min="0" max="20"
                    className={inputClass} style={inputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
                </div>
              </>
            )}
            <div>
              <label className={labelClass} style={labelStyle}>Parking Slots</label>
              <input type="number" value={form.parking} onChange={e => update('parking', e.target.value)}
                placeholder="0" min="0"
                className={inputClass} style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
            </div>
          </div>
        </div>

        {/* Section 4: Description */}
        <div className="rounded-[var(--radius)] border p-5"
          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
          <p className="text-sm font-bold mb-4" style={{ color: 'var(--foreground)' }}>Description & Features</p>
          <div className="space-y-4">
            <div>
              <label className={labelClass} style={labelStyle}>Property Description</label>
              <textarea
                value={form.description}
                onChange={e => update('description', e.target.value)}
                rows={4}
                placeholder="Describe the property in detail — highlights, nearby landmarks, selling points..."
                className={cn(inputClass, 'resize-none')} style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>

            <div>
              <label className={labelClass} style={labelStyle}>Features & Amenities</label>
              <div className="flex flex-wrap gap-2">
                {commonFeatures.map(f => {
                  const active = selectedFeatures.includes(f)
                  return (
                    <button
                      type="button"
                      key={f}
                      onClick={() => toggleFeature(f)}
                      className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-all', active ? 'text-white' : '')}
                      style={{
                        backgroundColor: active ? 'var(--primary)' : 'var(--accent)',
                        color: active ? 'white' : 'var(--foreground)',
                        border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                      }}>
                      {active && <span className="mr-1">✓</span>}{f}
                    </button>
                  )
                })}
              </div>
              {selectedFeatures.length > 0 && (
                <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
                  {selectedFeatures.length} feature{selectedFeatures.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Section 5: Photos */}
        <div className="rounded-[var(--radius)] border p-5"
          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
          <p className="text-sm font-bold mb-1" style={{ color: 'var(--foreground)' }}>Property Photos</p>
          <p className="text-xs mb-4" style={{ color: 'var(--muted-foreground)' }}>Upload high-quality photos (JPG, PNG, WEBP). First photo will be the cover.</p>

          <div
            className={cn('border-2 border-dashed rounded-[var(--radius-sm)] p-8 text-center cursor-pointer transition-all', photoDragging ? 'border-[var(--primary)] bg-[var(--accent)]' : '')}
            style={{ borderColor: photoDragging ? 'var(--primary)' : 'var(--border)', backgroundColor: photoDragging ? 'var(--accent)' : 'var(--card)' }}
            onClick={() => photoInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setPhotoDragging(true) }}
            onDragLeave={() => setPhotoDragging(false)}
            onDrop={e => { e.preventDefault(); setPhotoDragging(false); handlePhotoFiles(e.dataTransfer.files) }}>
            <Image size={32} className="mx-auto mb-3" style={{ color: 'var(--muted-foreground)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Click to upload or drag & drop photos</p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>JPG, PNG, WEBP up to 10MB each</p>
            <input ref={photoInputRef} type="file" multiple accept="image/*" className="hidden" onChange={e => handlePhotoFiles(e.target.files)} />
          </div>

          {uploadedPhotos.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {uploadedPhotos.map((f, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg border"
                  style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--border)' }}>
                  <span className="text-base">🖼️</span>
                  <span className="text-xs font-medium flex-1 truncate" style={{ color: 'var(--foreground)' }}>{f.name}</span>
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{f.size}</span>
                  <button type="button" onClick={() => setUploadedPhotos(p => p.filter((_, j) => j !== i))}
                    style={{ color: 'var(--muted-foreground)' }} className="hover:text-red-500 transition-colors">
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 6: Documents */}
        <div className="rounded-[var(--radius)] border p-5"
          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
          <p className="text-sm font-bold mb-1" style={{ color: 'var(--foreground)' }}>Supporting Documents</p>
          <p className="text-xs mb-4" style={{ color: 'var(--muted-foreground)' }}>
            Upload title, tax declaration, floor plan, survey, or other relevant documents (PDF, DOC).
          </p>

          <div
            className={cn('border-2 border-dashed rounded-[var(--radius-sm)] p-8 text-center cursor-pointer transition-all')}
            style={{ borderColor: docDragging ? 'var(--primary)' : 'var(--border)', backgroundColor: docDragging ? 'var(--accent)' : 'var(--card)' }}
            onClick={() => docInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDocDragging(true) }}
            onDragLeave={() => setDocDragging(false)}
            onDrop={e => { e.preventDefault(); setDocDragging(false); handleDocFiles(e.dataTransfer.files) }}>
            <FileText size={32} className="mx-auto mb-3" style={{ color: 'var(--muted-foreground)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Click to upload or drag & drop documents</p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
              TCT, Tax Dec, Floor Plan, Survey Map, etc.
            </p>
            <input ref={docInputRef} type="file" multiple accept=".pdf,.doc,.docx" className="hidden" onChange={e => handleDocFiles(e.target.files)} />
          </div>

          {uploadedDocs.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {uploadedDocs.map((f, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg border"
                  style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--border)' }}>
                  <span className="text-base">📄</span>
                  <span className="text-xs font-medium flex-1 truncate" style={{ color: 'var(--foreground)' }}>{f.name}</span>
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{f.size}</span>
                  <button type="button" onClick={() => setUploadedDocs(p => p.filter((_, j) => j !== i))}
                    style={{ color: 'var(--muted-foreground)' }} className="hover:text-red-500 transition-colors">
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section: Contact Person */}
        <div className="rounded-[var(--radius)] border p-5"
          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
          <p className="text-sm font-bold mb-1" style={{ color: 'var(--foreground)' }}>Contact Person</p>
          <p className="text-xs mb-4" style={{ color: 'var(--muted-foreground)' }}>
            Who should buyers contact directly about this property?
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Contact Name */}
            <div>
              <label className={labelClass} style={labelStyle}>
                Contact Person <span className="text-red-500">*</span>
              </label>
              <input
                value={form.contactPerson}
                onChange={e => update('contactPerson', e.target.value)}
                placeholder="e.g. Juan A. dela Cruz"
                className={inputClass} style={errors.contactPerson ? inputError : inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = errors.contactPerson ? '#ef4444' : 'var(--primary)')}
                onBlur={e => (e.currentTarget.style.borderColor = errors.contactPerson ? '#ef4444' : 'var(--border)')}
              />
              <Err field="contactPerson" />
            </div>

            {/* Email */}
            <div>
              <label className={labelClass} style={labelStyle}>
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={e => update('contactEmail', e.target.value)}
                placeholder="e.g. juan@email.com"
                className={inputClass} style={errors.contactEmail ? inputError : inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = errors.contactEmail ? '#ef4444' : 'var(--primary)')}
                onBlur={e => {
                  e.currentTarget.style.borderColor = errors.contactEmail ? '#ef4444' : 'var(--border)'
                  // live-validate on blur
                  if (form.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) {
                    setErrors(err => ({ ...err, contactEmail: 'Enter a valid email address.' }))
                  }
                }}
              />
              <Err field="contactEmail" />
            </div>

            {/* Phone */}
            <div>
              <label className={labelClass} style={labelStyle}>
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={form.contactPhone}
                onChange={e => handlePhoneChange(e.target.value)}
                placeholder="09XX-XXX-XXXX"
                maxLength={16}
                className={inputClass} style={errors.contactPhone ? inputError : inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = errors.contactPhone ? '#ef4444' : 'var(--primary)')}
                onBlur={e => {
                  e.currentTarget.style.borderColor = errors.contactPhone ? '#ef4444' : 'var(--border)'
                  // live-validate on blur
                  if (form.contactPhone) {
                    const digits = form.contactPhone.replace(/\D/g, '')
                    if (!/^(0\d{10}|63\d{10})$/.test(digits)) {
                      setErrors(err => ({ ...err, contactPhone: 'Enter a valid PH number (09XX-XXX-XXXX).' }))
                    }
                  }
                }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                Format: 09XX-XXX-XXXX or +639XX-XXX-XXXX
              </p>
              <Err field="contactPhone" />
            </div>
          </div>
        </div>

        {/* Listing Agent */}
        <div className="rounded-[var(--radius)] border p-5"
          style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
          <p className="text-sm font-bold mb-3" style={{ color: 'var(--foreground)' }}>Listing Agent</p>
          <div className="flex items-center gap-3 px-3 py-3 rounded-lg"
            style={{ backgroundColor: 'var(--accent)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ backgroundColor: 'var(--primary)' }}>
              {user?.name.split(' ').slice(0, 2).map(n => n[0]).join('')}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{user?.name}</p>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                {user?.role} · {user?.branch} · License: {user?.licenseNo}
              </p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 pb-6">
          <button
            type="submit"
            disabled={submitted}
            className="flex items-center gap-2 px-6 py-3 rounded-[var(--radius-sm)] text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--primary)' }}>
            {submitted ? <><CheckCircle size={16} /> Submitted!</> : <><Upload size={16} /> Submit Listing</>}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-3 rounded-[var(--radius-sm)] text-sm font-semibold border transition-all hover:opacity-80"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)', backgroundColor: 'var(--accent)' }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
