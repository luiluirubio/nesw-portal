import { useCallback, useEffect, useRef, useState } from 'react'
import { ImagePlus, X, FileText, Upload, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────
export interface PhotoFile {
  id:         string
  name:       string
  size:       string
  file:       File
  previewUrl: string
}

export interface DocFile {
  id:   string
  name: string
  size: string
  file: File
}

function fmtSize(bytes: number) {
  if (bytes < 1024)          return `${bytes} B`
  if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ── Multi-Photo Upload ─────────────────────────────────────────────────────
interface MultiPhotoUploadProps {
  photos:    PhotoFile[]
  onChange:  (photos: PhotoFile[]) => void
  maxSizeMB?: number
  className?: string
}

export function MultiPhotoUpload({
  photos,
  onChange,
  maxSizeMB = 20,
  className,
}: MultiPhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Revoke all preview URLs on unmount
  useEffect(() => {
    return () => { photos.forEach(p => URL.revokeObjectURL(p.previewUrl)) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function addFiles(files: File[]) {
    const maxBytes = maxSizeMB * 1024 * 1024
    const oversized = files.filter(f => f.size > maxBytes)
    const valid     = files.filter(f => f.size <= maxBytes && f.type.startsWith('image/'))
    if (oversized.length) console.warn(`${oversized.length} file(s) exceed ${maxSizeMB}MB and were skipped`)
    const newPhotos: PhotoFile[] = valid.map(f => ({
      id:         `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name:       f.name,
      size:       fmtSize(f.size),
      file:       f,
      previewUrl: URL.createObjectURL(f),
    }))
    onChange([...photos, ...newPhotos])
  }

  function remove(id: string) {
    const photo = photos.find(p => p.id === id)
    if (photo) URL.revokeObjectURL(photo.previewUrl)
    onChange(photos.filter(p => p.id !== id))
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }, [photos]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn('space-y-3', className)}>
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={e => { e.preventDefault(); setIsDragging(false) }}
        onDrop={handleDrop}
        className={cn(
          'flex h-36 cursor-pointer flex-col items-center justify-center gap-3 rounded-[var(--radius-sm)] border-2 border-dashed transition-colors select-none',
          isDragging
            ? 'border-[var(--primary)] bg-[var(--accent)]'
            : 'border-[var(--border)] bg-[var(--card)] hover:bg-[var(--accent)]'
        )}
      >
        <div className="rounded-full p-3 shadow-sm" style={{ backgroundColor: 'var(--background)' }}>
          <ImagePlus size={22} style={{ color: 'var(--muted-foreground)' }} />
        </div>
        <div className="text-center px-4">
          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            {photos.length > 0 ? 'Add more photos' : 'Click to select or drag & drop'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            JPG, PNG, WEBP — max {maxSizeMB}MB each
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={e => { if (e.target.files) { addFiles(Array.from(e.target.files)); e.target.value = '' } }}
        />
      </div>

      {/* Photo grid */}
      {photos.length > 0 && (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photos.map(photo => (
              <div
                key={photo.id}
                className="group relative aspect-square rounded-lg overflow-hidden border"
                style={{ borderColor: 'var(--border)' }}
              >
                <img
                  src={photo.previewUrl}
                  alt={photo.name}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                />

                {/* Dark overlay on hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Always-visible X (top-right) */}
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); remove(photo.id) }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500 transition-colors z-10"
                  title="Remove"
                >
                  <X size={10} />
                </button>

                {/* Replace button on hover */}
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
                  className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-white/90 text-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-10"
                  title="Replace"
                >
                  <Upload size={10} />
                </button>

                {/* Filename on hover */}
                <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs truncate">{photo.name}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {photos.length} photo{photos.length !== 1 ? 's' : ''} selected
          </p>
        </>
      )}
    </div>
  )
}

// ── Multi-Document Upload ──────────────────────────────────────────────────
interface MultiDocUploadProps {
  docs:      DocFile[]
  onChange:  (docs: DocFile[]) => void
  maxSizeMB?: number
  className?: string
}

function docIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return '📕'
  if (ext === 'doc' || ext === 'docx') return '📝'
  return '📄'
}

export function MultiDocUpload({
  docs,
  onChange,
  maxSizeMB = 20,
  className,
}: MultiDocUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function addFiles(files: File[]) {
    const maxBytes = maxSizeMB * 1024 * 1024
    const valid    = files.filter(f => f.size <= maxBytes)
    const newDocs: DocFile[] = valid.map(f => ({
      id:   `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: f.name,
      size: fmtSize(f.size),
      file: f,
    }))
    onChange([...docs, ...newDocs])
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }, [docs]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn('space-y-3', className)}>
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={e => { e.preventDefault(); setIsDragging(false) }}
        onDrop={handleDrop}
        className={cn(
          'flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-sm)] border-2 border-dashed transition-colors select-none',
          isDragging
            ? 'border-[var(--primary)] bg-[var(--accent)]'
            : 'border-[var(--border)] bg-[var(--card)] hover:bg-[var(--accent)]'
        )}
      >
        <div className="rounded-full p-2.5 shadow-sm" style={{ backgroundColor: 'var(--background)' }}>
          <FileText size={18} style={{ color: 'var(--muted-foreground)' }} />
        </div>
        <div className="text-center px-4">
          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            {docs.length > 0 ? 'Add more documents' : 'Click to select or drag & drop'}
          </p>
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            PDF, DOC, DOCX — max {maxSizeMB}MB each
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={e => { if (e.target.files) { addFiles(Array.from(e.target.files)); e.target.value = '' } }}
        />
      </div>

      {/* Document list */}
      {docs.length > 0 && (
        <div className="space-y-1.5">
          {docs.map(doc => (
            <div
              key={doc.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--card)')}
            >
              <span className="text-lg shrink-0">{docIcon(doc.name)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{doc.name}</p>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{doc.size}</p>
              </div>
              <button
                type="button"
                onClick={() => onChange(docs.filter(d => d.id !== doc.id))}
                className="p-1 rounded-lg transition-colors shrink-0 hover:bg-red-50 hover:text-red-500"
                style={{ color: 'var(--muted-foreground)' }}
                title="Remove"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {docs.length} document{docs.length !== 1 ? 's' : ''} selected
          </p>
        </div>
      )}
    </div>
  )
}
