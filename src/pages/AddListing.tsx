import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Upload, ChevronDown, CheckCircle,
  ArrowLeft, ArrowRight, ClipboardList, MapPin, Ruler,
  User, FileImage, Eye,
} from 'lucide-react'
import { toaster } from '@/components/ui/toast'
import { ComboBox } from '@/components/ui/combo-box'
import type { ComboBoxOption } from '@/components/ui/combo-box'
import { MultiPhotoUpload, MultiDocUpload } from '@/components/ui/file-upload'
import type { PhotoFile, DocFile } from '@/components/ui/file-upload'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useLogs } from '@/context/LogsContext'
import { cn, formatPHP } from '@/lib/utils'
import { phLgusSorted } from '@/data/philippines'
import { saveDraftCloud, deleteDraftCloud, fetchDraft, generateDraftId } from '@/lib/drafts'
import type { ListingDraft } from '@/types/draft'
import type { PropertyType, ListingType } from '@/types/property'

const EMAIL_DOMAINS = ['gmail.com','yahoo.com','outlook.com','hotmail.com','neswcorp.com','icloud.com','live.com','yahoo.com.ph']

const MAX_FILE_MB = 20

// ── Constants ─────────────────────────────────────────────────────────────────
const propertyTypes: { value: PropertyType; label: string }[] = [
  { value: 'house_and_lot', label: 'House & Lot' },
  { value: 'condo',         label: 'Condominium' },
  { value: 'lot_only',      label: 'Lot Only' },
  { value: 'commercial',    label: 'Commercial' },
  { value: 'townhouse',     label: 'Townhouse' },
  { value: 'warehouse',     label: 'Warehouse' },
  { value: 'farm_lot',      label: 'Farm Lot' },
]

const commonFeatures = [
  'Swimming Pool','Gym','Balcony','Home Office','Smart Home','Solar Panels','CCTV',
  'Generator','Elevator','Garden','Parking Lot','Loading Dock','Security Guard',
  'Near Highway','Near School','Near Hospital','Near Mall','Beach Access','Sea View',
  'Mountain View','Corner Lot','Furnished','Fully Furnished','Rental Income Potential',
]

const STEPS = [
  { number: 1, label: 'Listing Details',  icon: ClipboardList },
  { number: 2, label: 'Ownership',        icon: User          },
  { number: 3, label: 'Location',         icon: MapPin        },
  { number: 4, label: 'Specifications',   icon: Ruler         },
  { number: 5, label: 'Contact & Media',  icon: FileImage     },
  { number: 6, label: 'Review & Submit',  icon: Eye           },
]


// ── Step Indicator ────────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((step, i) => {
        const done    = current > step.number
        const active  = current === step.number
        const Icon    = step.icon
        return (
          <div key={step.number} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                done   ? 'text-white'                           : '',
                active ? 'text-white ring-4 ring-offset-2'     : '',
                !done && !active ? 'border-2'                  : '',
              )} style={{
                backgroundColor: done || active ? 'var(--primary)' : 'var(--background)',
                borderColor:     !done && !active ? 'var(--border)' : undefined,
                color:           !done && !active ? 'var(--muted-foreground)' : undefined,
              }}>
                {done
                  ? <CheckCircle size={16} className="text-white" />
                  : active
                    ? <Icon size={15} />
                    : <span style={{ color: 'var(--muted-foreground)' }}>{step.number}</span>
                }
              </div>
              <span className={cn('text-xs font-medium text-center hidden sm:block', active ? 'font-bold' : '')}
                style={{ color: active ? 'var(--primary)' : done ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 mb-5 rounded-full transition-all"
                style={{ backgroundColor: current > step.number ? 'var(--primary)' : 'var(--muted)' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export function AddListing() {
  const { user } = useAuth()
  const { addLog } = useLogs()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // ── Draft ID — stable for this session ───────────────────────────────
  const draftIdRef = useRef<string>(searchParams.get('draft') ?? generateDraftId())
  const draftId    = draftIdRef.current

  const blankForm = {
    title: '', type: 'house_and_lot' as PropertyType, listingType: 'for_sale' as ListingType,
    price: '', commission: '3',
    ownerName: '', nameInTitle: '', taxDeclarationNo: '',
    address: '', barangay: '', city: '', province: '',
    floorArea: '', lotArea: '', bedrooms: '', bathrooms: '', parking: '',
    description: '',
    contactPerson: '', contactEmail: '', contactPhone: '', contactTelephone: '',
    subdivision: '' as string,
    coBrokerName: '', coBrokerLicenseNo: '', coBrokerMobile: '',
    coBrokerEmail: '', coBrokerTelephone: '', coBrokerAddress: '', coBrokerAffiliation: '',
  }

  const isResuming = !!searchParams.get('draft')

  const [step, setStep]               = useState(1)
  const [form, setForm]               = useState(blankForm)
  const [errors, setErrors]           = useState<Record<string, string>>({})
  const [selectedFeatures, setFeatures] = useState<string[]>([])
  const [uploadedPhotos, setPhotos]   = useState<PhotoFile[]>([])
  const [uploadedDocs, setDocs]       = useState<DocFile[]>([])
  const [submitted, setSubmitted]     = useState(false)
  const [loadingDraft, setLoadingDraft] = useState(!!searchParams.get('draft'))
  const [subdivisionOptions] = useState<string[]>([])
  const [emailSuggestions, setEmailSuggestions]     = useState<string[]>([])
  const [showCoBroker, setShowCoBroker]             = useState(false)

  // ── Load existing draft from cloud on mount ────────────────────────────
  useEffect(() => {
    const id = searchParams.get('draft')
    if (!id) return
    fetchDraft<ListingDraft>(id).then(d => {
      if (d) {
        setStep(d.lastStep)
        setForm({
          ...d.form,
          subdivision:       d.form.subdivision       ?? '',
          contactTelephone:  d.form.contactTelephone  ?? '',
          coBrokerName:      d.form.coBrokerName      ?? '',
          coBrokerLicenseNo: d.form.coBrokerLicenseNo ?? '',
          coBrokerMobile:    d.form.coBrokerMobile    ?? '',
          coBrokerEmail:     d.form.coBrokerEmail     ?? '',
          coBrokerTelephone: d.form.coBrokerTelephone ?? '',
          coBrokerAddress:   d.form.coBrokerAddress   ?? '',
          coBrokerAffiliation: d.form.coBrokerAffiliation ?? '',
        })
        if (d.form.coBrokerName) setShowCoBroker(true)
        setFeatures(d.features)
        // Files cannot be restored from draft metadata — user re-selects them
        setPhotos([])
        setDocs([])
      }
    }).finally(() => setLoadingDraft(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-save to cloud ─────────────────────────────────────────────────
  const autoSave = useCallback(() => {
    if (!user || submitted || loadingDraft) return
    saveDraftCloud({
      id:        draftId,
      agentId:   user.id,
      agentName: user.name,
      lastStep:  step,
      savedAt:   new Date().toISOString(),
      form,
      features:  selectedFeatures,
      photos:    uploadedPhotos.map(f => ({ name: f.name, size: f.size })),
      docs:      uploadedDocs.map(f  => ({ name: f.name, size: f.size })),
    })
  }, [draftId, user, step, form, selectedFeatures, uploadedPhotos, uploadedDocs, submitted, loadingDraft])

  // Debounced auto-save on any field change
  useEffect(() => {
    if (submitted || loadingDraft) return
    const t = setTimeout(autoSave, 800)
    return () => clearTimeout(t)
  }, [autoSave, submitted, loadingDraft])

  // Immediate save on step change
  useEffect(() => {
    if (!submitted && !loadingDraft) autoSave()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // ── City options (memoised — large list) ──────────────────────────────
  // value encodes both city and province so we don't need a secondary lookup
  const cityOptions = useMemo(
    () => phLgusSorted.map(l => ({
      value:    `${l.name}|||${l.province}`,
      label:    l.name,
      sublabel: l.province,
    })) as ComboBoxOption[],
    []
  )
  // Derive current city select value from form state
  const citySelectValue = form.city
    ? (cityOptions.find(o => o.label === form.city && o.sublabel === form.province)?.value
        ?? cityOptions.find(o => o.label === form.city)?.value
        ?? '')
    : ''

  // ── Helpers ───────────────────────────────────────────────────────────
  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => { const n = { ...e }; delete n[field]; return n })
  }

  function formatPhone(raw: string) {
    const digits = raw.replace(/[^\d+]/g, '')
    if (digits.startsWith('+63') && digits.length <= 13) {
      const l = digits.slice(3)
      if (l.length <= 3) return '+63' + l
      if (l.length <= 6) return '+63' + l.slice(0,3) + '-' + l.slice(3)
      return '+63' + l.slice(0,3) + '-' + l.slice(3,6) + '-' + l.slice(6,10)
    }
    if (digits.startsWith('0') && digits.length <= 11) {
      if (digits.length <= 4)  return digits
      if (digits.length <= 7)  return digits.slice(0,4) + '-' + digits.slice(4)
      return digits.slice(0,4) + '-' + digits.slice(4,7) + '-' + digits.slice(7,11)
    }
    return raw
  }

  function toggleFeature(f: string) {
    setFeatures(p => p.includes(f) ? p.filter(x => x !== f) : [...p, f])
  }


  // ── Per-step validation ────────────────────────────────────────────────
  function validateStep(s: number): Record<string, string> {
    const e: Record<string, string> = {}
    if (s === 1) {
      if (!form.title.trim()) e.title = 'Property title is required.'
      if (!form.price) e.price = 'Price is required.'
      if (form.price && Number(form.price) <= 0) e.price = 'Price must be greater than 0.'
    }
    if (s === 2) {
      if (!form.ownerName.trim()) e.ownerName = "Owner's name is required."
    }
    if (s === 3) {
      if (!form.address.trim()) e.address = 'Street address is required.'
      if (!form.city.trim()) e.city = 'City / Municipality is required.'
    }
    if (s === 5) {
      if (!form.contactPerson.trim()) e.contactPerson = 'Contact person is required.'
      if (form.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) {
        e.contactEmail = 'Enter a valid email address.'
      }
      if (!form.contactPhone.trim()) {
        e.contactPhone = 'Mobile number is required.'
      } else {
        const digits = form.contactPhone.replace(/\D/g, '')
        if (!/^(0\d{10}|63\d{10})$/.test(digits)) e.contactPhone = 'Enter a valid PH mobile number (09XX-XXX-XXXX).'
      }
    }
    return e
  }

  function handleNext() {
    const errs = validateStep(step)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setStep(s => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleBack() {
    setErrors({})
    setStep(s => s - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit() {
    setSubmitted(true)
    try {
      // ── Upload photos to S3 ───────────────────────────────────────────
      const photoUrls: string[] = []
      for (const f of uploadedPhotos) {
        const { url, publicUrl } = await api.presign({ fileName: f.name, fileType: f.file.type })
        await fetch(url, { method: 'PUT', body: f.file, headers: { 'Content-Type': f.file.type } })
        photoUrls.push(publicUrl)
      }

      // ── Upload documents to S3 ────────────────────────────────────────
      const docObjects: { name: string; type: string; size: string; url: string }[] = []
      for (const f of uploadedDocs) {
        const fileType = f.file.type || 'application/octet-stream'
        const { url, publicUrl } = await api.presign({ fileName: f.name, fileType })
        await fetch(url, { method: 'PUT', body: f.file, headers: { 'Content-Type': fileType } })
        docObjects.push({ name: f.name, type: 'other', size: f.size, url: publicUrl })
      }

      const body = {
        title:           form.title,
        type:            form.type,
        listingType:     form.listingType,
        status:          'available',
        price:           Number(form.price),
        commission:      Number(form.commission) || 3,
        location: {
          address:  form.address,
          barangay: form.barangay,
          city:     form.city,
          province: form.province,
        },
        subdivision:     form.subdivision || undefined,
        floorArea:       Number(form.floorArea)  || 0,
        lotArea:         Number(form.lotArea)    || 0,
        bedrooms:        Number(form.bedrooms)   || 0,
        bathrooms:       Number(form.bathrooms)  || 0,
        parking:         Number(form.parking)    || 0,
        description:     form.description,
        ownerName:       form.ownerName,
        nameInTitle:     form.nameInTitle || form.ownerName,
        taxDeclarationNo: form.taxDeclarationNo,
        contactPerson:   form.contactPerson,
        contactEmail:    form.contactEmail,
        contactPhone:    form.contactPhone,
        contactTelephone: form.contactTelephone || undefined,
        features:        selectedFeatures,
        photos:          photoUrls,
        documents:       docObjects,
        agentId:         user?.id ?? '',
        agentName:       user?.name ?? '',
        coBroker: form.coBrokerName ? {
          name:        form.coBrokerName,
          licenseNo:   form.coBrokerLicenseNo,
          mobile:      form.coBrokerMobile,
          email:       form.coBrokerEmail,
          telephone:   form.coBrokerTelephone,
          address:     form.coBrokerAddress,
          affiliation: form.coBrokerAffiliation,
        } : undefined,
      }

      const created = await api.createProperty(body) as { id: string }

      deleteDraftCloud(draftId)
      addLog({
        action: 'created', propertyId: created.id, propertyTitle: form.title,
        agentId: user?.id ?? '', agentName: user?.name ?? '',
        changes: [
          { field: 'Type',     oldValue: '—', newValue: form.type },
          { field: 'Price',    oldValue: '—', newValue: `PHP ${Number(form.price).toLocaleString()}` },
          { field: 'City',     oldValue: '—', newValue: form.city },
          { field: 'Owner',    oldValue: '—', newValue: form.ownerName },
          { field: 'Tax Dec.', oldValue: '—', newValue: form.taxDeclarationNo || '—' },
        ],
      })

      toaster.create({ type: 'success', title: 'Listing Submitted!', description: `"${form.title}" saved as ${created.id}.` })
      setTimeout(() => navigate('/listings'), 1500)
    } catch (err) {
      setSubmitted(false)
      toaster.create({ type: 'error', title: 'Submit Failed', description: (err as Error).message })
    }
  }

  // ── Shared styles ──────────────────────────────────────────────────────
  const inputClass = 'w-full px-3 py-2.5 text-sm rounded-[var(--radius-sm)] focus:outline-none transition-colors'
  const inputStyle = { border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }
  const inputErr   = { border: '1px solid #ef4444',       backgroundColor: 'var(--background)', color: 'var(--foreground)' }
  const lbl  = 'block text-xs font-semibold mb-1.5'
  const lblS = { color: 'var(--foreground)' }
  const Err  = ({ field }: { field: string }) =>
    errors[field] ? <p className="text-xs mt-1 text-red-500">{errors[field]}</p> : null

  const needsBedBath = ['house_and_lot','condo','townhouse'].includes(form.type)
  const needsFloor   = !['lot_only','farm_lot'].includes(form.type)
  const needsLot     = ['house_and_lot','lot_only','townhouse','commercial','warehouse','farm_lot'].includes(form.type)
  const typeLabel    = propertyTypes.find(t => t.value === form.type)?.label ?? form.type

  // ── Review rows ────────────────────────────────────────────────────────
  const ReviewRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-start justify-between py-2 border-b last:border-0"
      style={{ borderColor: 'var(--border)' }}>
      <span className="text-xs w-40 shrink-0" style={{ color: 'var(--muted-foreground)' }}>{label}</span>
      <span className="text-xs font-semibold text-right" style={{ color: 'var(--foreground)' }}>{value || '—'}</span>
    </div>
  )

  const ReviewSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-[var(--radius-sm)] border overflow-hidden"
      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
      <div className="px-4 py-2.5 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>{title}</p>
      </div>
      <div className="px-4">{children}</div>
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────
  if (loadingDraft) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-t-[var(--primary)] border-[var(--muted)] rounded-full animate-spin" />
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Loading draft…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-[var(--radius-sm)] transition-colors"
          style={{ color: 'var(--muted-foreground)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
              {isResuming ? 'Resume Listing' : 'Add Property Listing'}
            </h1>
            {isResuming && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                Draft
              </span>
            )}
          </div>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Step {step} of {STEPS.length} — {STEPS[step-1].label}
            {!submitted && <span className="ml-2 opacity-60">· Auto-saved</span>}
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} />

      {/* Step card */}
      <div className="rounded-[var(--radius)] border p-6 mb-5"
        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>

        {/* ── STEP 1: Listing Details ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <p className="text-base font-bold mb-0.5" style={{ color: 'var(--foreground)' }}>Listing Details</p>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Basic information about the property being listed.</p>
            </div>

            <div>
              <label className={lbl} style={lblS}>Property Title <span className="text-red-500">*</span></label>
              <input value={form.title} onChange={e => update('title', e.target.value)}
                placeholder="e.g. Modern House in Banilad Heights"
                className={inputClass} style={errors.title ? inputErr : inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = errors.title ? '#ef4444' : 'var(--primary)')}
                onBlur={e => (e.currentTarget.style.borderColor = errors.title ? '#ef4444' : 'var(--border)')} />
              <Err field="title" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl} style={lblS}>Property Type <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select value={form.type} onChange={e => update('type', e.target.value)}
                    className={cn(inputClass,'appearance-none cursor-pointer pr-8')} style={inputStyle}>
                    {propertyTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted-foreground)' }} />
                </div>
              </div>
              <div>
                <label className={lbl} style={lblS}>Listing Type <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  {[{v:'for_sale',l:'For Sale'},{v:'for_rent',l:'For Rent'}].map(opt => (
                    <button key={opt.v} type="button"
                      onClick={() => update('listingType', opt.v)}
                      className="flex-1 py-2.5 text-sm font-semibold rounded-[var(--radius-sm)] border transition-all"
                      style={{
                        backgroundColor: form.listingType === opt.v ? 'var(--primary)' : 'var(--background)',
                        color:           form.listingType === opt.v ? 'white'           : 'var(--foreground)',
                        borderColor:     form.listingType === opt.v ? 'var(--primary)'  : 'var(--border)',
                      }}>
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl} style={lblS}>
                  {form.listingType === 'for_rent' ? 'Monthly Rent (PHP)' : 'Asking Price (PHP)'} <span className="text-red-500">*</span>
                </label>
                <input type="number" value={form.price} onChange={e => update('price', e.target.value)}
                  placeholder="e.g. 5000000"
                  className={inputClass} style={errors.price ? inputErr : inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = errors.price ? '#ef4444' : 'var(--primary)')}
                  onBlur={e => (e.currentTarget.style.borderColor = errors.price ? '#ef4444' : 'var(--border)')} />
                <Err field="price" />
              </div>
              <div>
                <label className={lbl} style={lblS}>Commission (%)</label>
                <input type="number" value={form.commission} onChange={e => update('commission', e.target.value)}
                  placeholder="3" min="0" max="10" step="0.5"
                  className={inputClass} style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Ownership ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <p className="text-base font-bold mb-0.5" style={{ color: 'var(--foreground)' }}>Ownership Details</p>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Title and tax declaration information of the property owner.</p>
            </div>

            <div>
              <label className={lbl} style={lblS}>Owner's Name <span className="text-red-500">*</span></label>
              <input value={form.ownerName} onChange={e => update('ownerName', e.target.value)}
                placeholder="e.g. Juan A. dela Cruz"
                className={inputClass} style={errors.ownerName ? inputErr : inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = errors.ownerName ? '#ef4444' : 'var(--primary)')}
                onBlur={e => (e.currentTarget.style.borderColor = errors.ownerName ? '#ef4444' : 'var(--border)')} />
              <Err field="ownerName" />
            </div>

            <div>
              <label className={lbl} style={lblS}>Name in Title</label>
              <input value={form.nameInTitle} onChange={e => update('nameInTitle', e.target.value)}
                placeholder="Exact name as it appears on the TCT/CCT"
                className={inputClass} style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
              <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                e.g. "Juan A. dela Cruz married to Maria B. dela Cruz" — leave blank if same as owner's name.
              </p>
            </div>

            <div>
              <label className={lbl} style={lblS}>Tax Declaration No.</label>
              <input value={form.taxDeclarationNo} onChange={e => update('taxDeclarationNo', e.target.value)}
                placeholder="e.g. TD-2024-001234"
                className={inputClass} style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
            </div>
          </div>
        )}

        {/* ── STEP 3: Location ── */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <p className="text-base font-bold mb-0.5" style={{ color: 'var(--foreground)' }}>Location</p>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Where is the property located?</p>
            </div>

            <div>
              <label className={lbl} style={lblS}>Street Address <span className="text-red-500">*</span></label>
              <input value={form.address} onChange={e => update('address', e.target.value)}
                placeholder="e.g. Lot 12 Blk 5 Subdivision Name, Street"
                className={inputClass} style={errors.address ? inputErr : inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = errors.address ? '#ef4444' : 'var(--primary)')}
                onBlur={e => (e.currentTarget.style.borderColor = errors.address ? '#ef4444' : 'var(--border)')} />
              <Err field="address" />
            </div>

            <div>
              <label className={lbl} style={lblS}>Barangay</label>
              <input value={form.barangay} onChange={e => update('barangay', e.target.value)}
                placeholder="e.g. Banilad"
                className={inputClass} style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
            </div>

            <div>
              <label className={lbl} style={lblS}>Subdivision / Village</label>
              <ComboBox
                value={form.subdivision}
                onChange={val => update('subdivision', val)}
                options={subdivisionOptions.map(s => ({ value: s, label: s }))}
                placeholder="Type to search or add new…"
                creatable
              />
              <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                Not in the list? Type the name and tap "Add".
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl} style={lblS}>City / Municipality <span className="text-red-500">*</span></label>
                <ComboBox
                  value={citySelectValue}
                  onChange={(_val, opt) => {
                    if (!opt) return
                    const [city, province] = opt.value.split('|||')
                    update('city', city)
                    if (province) update('province', province)
                  }}
                  options={cityOptions}
                  placeholder="Search city or municipality…"
                  error={!!errors.city}
                />
                <Err field="city" />
              </div>
              <div>
                <label className={lbl} style={lblS}>Province</label>
                <input value={form.province} readOnly placeholder="Auto-filled from city"
                  className={inputClass}
                  style={{ ...inputStyle, backgroundColor: 'var(--accent)', cursor: 'default' }} />
                {form.province && (
                  <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--primary)' }}>
                    <CheckCircle size={11} /> Auto-filled: {form.province}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: Specifications ── */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <p className="text-base font-bold mb-0.5" style={{ color: 'var(--foreground)' }}>Property Specifications</p>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Dimensions, rooms, description, and amenities.</p>
            </div>

            {/* Area + rooms */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {needsFloor && (
                <div>
                  <label className={lbl} style={lblS}>Floor Area (sqm)</label>
                  <input type="number" value={form.floorArea} onChange={e => update('floorArea', e.target.value)}
                    placeholder="0" min="0"
                    className={inputClass} style={inputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
                </div>
              )}
              {needsLot && (
                <div>
                  <label className={lbl} style={lblS}>Lot Area (sqm)</label>
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
                    <label className={lbl} style={lblS}>Bedrooms</label>
                    <input type="number" value={form.bedrooms} onChange={e => update('bedrooms', e.target.value)}
                      placeholder="0" min="0"
                      className={inputClass} style={inputStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
                  </div>
                  <div>
                    <label className={lbl} style={lblS}>Bathrooms</label>
                    <input type="number" value={form.bathrooms} onChange={e => update('bathrooms', e.target.value)}
                      placeholder="0" min="0"
                      className={inputClass} style={inputStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
                  </div>
                </>
              )}
              <div>
                <label className={lbl} style={lblS}>Parking Slots</label>
                <input type="number" value={form.parking} onChange={e => update('parking', e.target.value)}
                  placeholder="0" min="0"
                  className={inputClass} style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className={lbl} style={lblS}>Description</label>
              <textarea value={form.description} onChange={e => update('description', e.target.value)}
                rows={4} placeholder="Describe the property — highlights, nearby landmarks, selling points…"
                className={cn(inputClass,'resize-none')} style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
            </div>

            {/* Features */}
            <div>
              <label className={lbl} style={lblS}>Features & Amenities</label>
              <div className="flex flex-wrap gap-2">
                {commonFeatures.map(f => {
                  const active = selectedFeatures.includes(f)
                  return (
                    <button key={f} type="button" onClick={() => toggleFeature(f)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                      style={{
                        backgroundColor: active ? 'var(--primary)' : 'var(--accent)',
                        color:           active ? 'white'           : 'var(--foreground)',
                        border:          `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                      }}>
                      {active && '✓ '}{f}
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
        )}

        {/* ── STEP 5: Contact & Media ── */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <p className="text-base font-bold mb-0.5" style={{ color: 'var(--foreground)' }}>Contact Person & Media</p>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Who to contact and supporting photos / documents.</p>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>Contact Person</p>

              {/* Row 1: Contact Name + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={lbl} style={lblS}>Contact Person <span className="text-red-500">*</span></label>
                  <input value={form.contactPerson} onChange={e => update('contactPerson', e.target.value)}
                    placeholder="e.g. Juan A. dela Cruz"
                    className={inputClass} style={errors.contactPerson ? inputErr : inputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = errors.contactPerson ? '#ef4444' : 'var(--primary)')}
                    onBlur={e => (e.currentTarget.style.borderColor = errors.contactPerson ? '#ef4444' : 'var(--border)')} />
                  <Err field="contactPerson" />
                </div>
                <div className="relative">
                  <label className={lbl} style={lblS}>Email Address</label>
                  <input
                    type="text"
                    value={form.contactEmail}
                    onChange={e => {
                      update('contactEmail', e.target.value)
                      const atIdx = e.target.value.lastIndexOf('@')
                      if (atIdx !== -1) {
                        const typed = e.target.value.slice(atIdx + 1).toLowerCase()
                        setEmailSuggestions(EMAIL_DOMAINS.filter(d => d.startsWith(typed) && d !== typed))
                      } else {
                        setEmailSuggestions([])
                      }
                    }}
                    placeholder="e.g. juan@gmail.com"
                    autoComplete="off"
                    className={inputClass} style={errors.contactEmail ? inputErr : inputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = errors.contactEmail ? '#ef4444' : 'var(--primary)')}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = errors.contactEmail ? '#ef4444' : 'var(--border)'
                      if (form.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail))
                        setErrors(er => ({ ...er, contactEmail: 'Enter a valid email address.' }))
                      setTimeout(() => setEmailSuggestions([]), 200)
                    }}
                  />
                  {emailSuggestions.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 rounded-[var(--radius-sm)] border shadow-lg overflow-hidden"
                      style={{ top: '100%', backgroundColor: 'var(--popover)', borderColor: 'var(--border)' }}>
                      {emailSuggestions.map(domain => {
                        const atIdx = form.contactEmail.lastIndexOf('@')
                        const prefix = atIdx !== -1 ? form.contactEmail.slice(0, atIdx + 1) : form.contactEmail + '@'
                        return (
                          <button key={domain} type="button"
                            onMouseDown={e => {
                              e.preventDefault()
                              update('contactEmail', prefix + domain)
                              setEmailSuggestions([])
                            }}
                            className="block w-full px-3 py-1.5 text-xs text-left transition-colors"
                            style={{ color: 'var(--foreground)' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                            {prefix}{domain}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  <Err field="contactEmail" />
                </div>
              </div>

              {/* Row 2: Mobile Number + Telephone Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={lbl} style={lblS}>Mobile Number <span className="text-red-500">*</span></label>
                  <input type="tel" value={form.contactPhone}
                    onChange={e => update('contactPhone', formatPhone(e.target.value))}
                    placeholder="09XX-XXX-XXXX" maxLength={16}
                    className={inputClass} style={errors.contactPhone ? inputErr : inputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = errors.contactPhone ? '#ef4444' : 'var(--primary)')}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = errors.contactPhone ? '#ef4444' : 'var(--border)'
                      if (form.contactPhone) {
                        const digits = form.contactPhone.replace(/\D/g,'')
                        if (!/^(0\d{10}|63\d{10})$/.test(digits))
                          setErrors(er => ({ ...er, contactPhone: 'Enter a valid PH mobile number (09XX-XXX-XXXX).' }))
                      }
                    }} />
                  <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>09XX-XXX-XXXX or +639XX-XXX-XXXX</p>
                  <Err field="contactPhone" />
                </div>
                <div>
                  <label className={lbl} style={lblS}>Telephone Number</label>
                  <input type="tel" value={form.contactTelephone}
                    onChange={e => update('contactTelephone', e.target.value)}
                    placeholder="e.g. (02) 8123-4567"
                    className={inputClass} style={inputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
                  <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>Optional landline number</p>
                </div>
              </div>
            </div>

            {/* Co-Broker */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>Co-Broker</p>
                <button
                  type="button"
                  onClick={() => { setShowCoBroker(s => !s); if (showCoBroker) { ['coBrokerName','coBrokerLicenseNo','coBrokerMobile','coBrokerEmail','coBrokerTelephone','coBrokerAddress','coBrokerAffiliation'].forEach(f => update(f, '')) } }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                  style={{
                    backgroundColor: showCoBroker ? 'var(--primary)' : 'var(--background)',
                    color:           showCoBroker ? 'white'           : 'var(--foreground)',
                    borderColor:     showCoBroker ? 'var(--primary)'  : 'var(--border)',
                  }}>
                  {showCoBroker ? '✓ Co-Broker Added' : '+ Add Co-Broker'}
                </button>
              </div>

              {showCoBroker && (
                <div className="rounded-[var(--radius-sm)] border p-4 space-y-4"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>

                  {/* Row 1: Name + License No */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={lbl} style={lblS}>Co-Broker Name</label>
                      <input value={form.coBrokerName} onChange={e => update('coBrokerName', e.target.value)}
                        placeholder="e.g. Maria Santos"
                        className={inputClass} style={inputStyle}
                        onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
                    </div>
                    <div>
                      <label className={lbl} style={lblS}>PRC License No.</label>
                      <input value={form.coBrokerLicenseNo} onChange={e => update('coBrokerLicenseNo', e.target.value)}
                        placeholder="e.g. REB-2024-005678"
                        className={inputClass} style={inputStyle}
                        onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
                    </div>
                  </div>

                  {/* Row 2: Mobile + Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={lbl} style={lblS}>Mobile Number</label>
                      <input type="tel" value={form.coBrokerMobile}
                        onChange={e => update('coBrokerMobile', formatPhone(e.target.value))}
                        placeholder="09XX-XXX-XXXX" maxLength={16}
                        className={inputClass} style={inputStyle}
                        onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
                    </div>
                    <div>
                      <label className={lbl} style={lblS}>Email Address</label>
                      <input type="email" value={form.coBrokerEmail}
                        onChange={e => update('coBrokerEmail', e.target.value)}
                        placeholder="e.g. maria@realty.com"
                        className={inputClass} style={inputStyle}
                        onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
                    </div>
                  </div>

                  {/* Row 3: Telephone + Affiliation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={lbl} style={lblS}>Telephone Number</label>
                      <input type="tel" value={form.coBrokerTelephone}
                        onChange={e => update('coBrokerTelephone', e.target.value)}
                        placeholder="e.g. (02) 8123-4567"
                        className={inputClass} style={inputStyle}
                        onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
                    </div>
                    <div>
                      <label className={lbl} style={lblS}>Affiliation / Company</label>
                      <input value={form.coBrokerAffiliation}
                        onChange={e => update('coBrokerAffiliation', e.target.value)}
                        placeholder="e.g. Santos Realty Inc."
                        className={inputClass} style={inputStyle}
                        onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
                    </div>
                  </div>

                  {/* Row 4: Address (full width) */}
                  <div>
                    <label className={lbl} style={lblS}>Office Address</label>
                    <input value={form.coBrokerAddress}
                      onChange={e => update('coBrokerAddress', e.target.value)}
                      placeholder="e.g. Unit 301, Ayala Ave., Makati City"
                      className={inputClass} style={inputStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')} />
                  </div>
                </div>
              )}
            </div>

            {/* Photos */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>Property Photos</p>
              <MultiPhotoUpload
                photos={uploadedPhotos}
                onChange={setPhotos}
                maxSizeMB={MAX_FILE_MB}
              />
            </div>

            {/* Documents */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>Supporting Documents</p>
              <MultiDocUpload
                docs={uploadedDocs}
                onChange={setDocs}
                maxSizeMB={MAX_FILE_MB}
              />
            </div>
          </div>
        )}

        {/* ── STEP 6: Review & Submit ── */}
        {step === 6 && (
          <div className="space-y-5">
            <div>
              <p className="text-base font-bold mb-0.5" style={{ color: 'var(--foreground)' }}>Review Your Listing</p>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Check all details before submitting. Click Back to edit any section.</p>
            </div>

            <ReviewSection title="Listing Details">
              <ReviewRow label="Title"        value={form.title} />
              <ReviewRow label="Type"         value={typeLabel} />
              <ReviewRow label="Listing Type" value={form.listingType === 'for_rent' ? 'For Rent' : 'For Sale'} />
              <ReviewRow label="Price"        value={form.price ? (form.listingType === 'for_rent' ? `${formatPHP(Number(form.price))}/mo` : formatPHP(Number(form.price))) : '—'} />
              <ReviewRow label="Commission"   value={form.commission ? `${form.commission}%` : '—'} />
            </ReviewSection>

            <ReviewSection title="Ownership">
              <ReviewRow label="Owner's Name"    value={form.ownerName} />
              <ReviewRow label="Name in Title"   value={form.nameInTitle || form.ownerName} />
              <ReviewRow label="Tax Dec. No."    value={form.taxDeclarationNo} />
            </ReviewSection>

            <ReviewSection title="Location">
              <ReviewRow label="Street Address"     value={form.address} />
              <ReviewRow label="Barangay"           value={form.barangay} />
              <ReviewRow label="City / Municipality" value={form.city} />
              <ReviewRow label="Province"           value={form.province} />
              {form.subdivision && <ReviewRow label="Subdivision / Village" value={form.subdivision} />}
            </ReviewSection>

            <ReviewSection title="Specifications">
              {needsFloor   && <ReviewRow label="Floor Area"  value={form.floorArea ? `${form.floorArea} sqm` : '—'} />}
              {needsLot     && <ReviewRow label="Lot Area"    value={form.lotArea    ? `${form.lotArea} sqm`  : '—'} />}
              {needsBedBath && <ReviewRow label="Bedrooms"    value={form.bedrooms   || '—'} />}
              {needsBedBath && <ReviewRow label="Bathrooms"   value={form.bathrooms  || '—'} />}
              <ReviewRow label="Parking" value={form.parking || '—'} />
              {selectedFeatures.length > 0 && (
                <ReviewRow label="Features" value={selectedFeatures.join(', ')} />
              )}
            </ReviewSection>

            <ReviewSection title="Contact Person">
              <ReviewRow label="Name"      value={form.contactPerson} />
              <ReviewRow label="Email"     value={form.contactEmail} />
              <ReviewRow label="Mobile"    value={form.contactPhone} />
              {form.contactTelephone && <ReviewRow label="Telephone" value={form.contactTelephone} />}
            </ReviewSection>

            {form.coBrokerName && (
              <ReviewSection title="Co-Broker">
                <ReviewRow label="Name"        value={form.coBrokerName} />
                <ReviewRow label="License No." value={form.coBrokerLicenseNo} />
                <ReviewRow label="Mobile"      value={form.coBrokerMobile} />
                {form.coBrokerEmail     && <ReviewRow label="Email"       value={form.coBrokerEmail} />}
                {form.coBrokerTelephone && <ReviewRow label="Telephone"   value={form.coBrokerTelephone} />}
                {form.coBrokerAffiliation && <ReviewRow label="Affiliation" value={form.coBrokerAffiliation} />}
                {form.coBrokerAddress   && <ReviewRow label="Address"     value={form.coBrokerAddress} />}
              </ReviewSection>
            )}

            <ReviewSection title="Media">
              <ReviewRow label="Photos"    value={uploadedPhotos.length ? `${uploadedPhotos.length} photo(s) attached` : 'None'} />
              <ReviewRow label="Documents" value={uploadedDocs.length   ? `${uploadedDocs.length} document(s) attached` : 'None'} />
            </ReviewSection>

            {/* Listing Agent */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-sm)]"
              style={{ backgroundColor: 'var(--accent)' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ backgroundColor: 'var(--primary)' }}>
                {user?.name.split(' ').slice(0,2).map(n => n[0]).join('')}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{user?.name}</p>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {user?.role} · {user?.branch} · License: {user?.licenseNo}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pb-8">
        <button
          onClick={step === 1 ? () => navigate(-1) : handleBack}
          className="flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold border transition-all hover:opacity-80"
          style={{ borderColor: 'var(--border)', color: 'var(--foreground)', backgroundColor: 'var(--accent)' }}>
          <ArrowLeft size={15} />
          {step === 1 ? 'Cancel' : 'Back'}
        </button>

        <div className="flex items-center gap-2">
          {STEPS.map(s => (
            <div key={s.number}
              className={cn('rounded-full transition-all', s.number === step ? 'w-5 h-2' : 'w-2 h-2')}
              style={{ backgroundColor: s.number === step ? 'var(--primary)' : s.number < step ? 'color-mix(in srgb, var(--primary) 40%, transparent)' : 'var(--muted)' }} />
          ))}
        </div>

        {step < 6 ? (
          <button onClick={handleNext}
            className="flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-sm)] text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: 'var(--primary)' }}>
            Next <ArrowRight size={15} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitted}
            className="flex items-center gap-2 px-6 py-2.5 rounded-[var(--radius-sm)] text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--primary)' }}>
            {submitted ? <><CheckCircle size={15} /> Submitted!</> : <><Upload size={15} /> Submit Listing</>}
          </button>
        )}
      </div>
    </div>
  )
}
