import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Proposal } from '@/types/proposal'

// ── Colours ───────────────────────────────────────────────────────────────────
const NAVY    = [27,  56, 100] as [number, number, number]
const BLUE    = [46,  93, 168] as [number, number, number]
const ORANGE  = [230, 120,  20] as [number, number, number]
const BODY    = [50,  50,  50] as [number, number, number]
const MUTED   = [120, 120, 120] as [number, number, number]
const LGRAY   = [190, 190, 190] as [number, number, number]
const BEIGE   = [255, 249, 220] as [number, number, number]
const BGROW   = [240, 244, 252] as [number, number, number]
const WHITE   = [255, 255, 255] as [number, number, number]

type DocAT = jsPDF & { lastAutoTable: { finalY: number } }

// ── Documents required by service category ───────────────────────────────────
const DOCS_MAP: Record<string, { section: string; items: string[] }[]> = {
  'Property Appraisal': [
    {
      section: 'A.  Land / Title Documents',
      items: [
        'Certified True Copy of Transfer Certificate of Title (TCT) or Condominium Certificate of Title (CCT)',
        'Updated Tax Declaration for Land',
        'Latest Real Property Tax (RPT) Official Receipt / Tax Clearance',
        'Vicinity Map or Location Map of the Property',
        'Lot Plan / Survey Plan (if available)',
      ],
    },
    {
      section: 'B.  Building / Improvement Documents',
      items: [
        'Updated Tax Declaration for Improvements / Building',
        'Building Permit and Certificate of Occupancy (if available)',
        'Approved Building / Architectural Plans (if available)',
        'List of existing improvements, renovations, or construction with approximate dates completed',
      ],
    },
    {
      section: 'C.  Ownership & Authorization Documents',
      items: [
        'Photocopy of valid government-issued ID of the registered owner / authorized representative',
        'Special Power of Attorney (SPA) if represented by an authorized person',
      ],
    },
  ],
  'Title Transfer': [
    {
      section: 'A.  Land / Title Documents',
      items: [
        'Certified True Copy of Transfer Certificate of Title (TCT)',
        'Updated Tax Declaration for Land',
        'Latest Real Property Tax (RPT) Official Receipt / Tax Clearance',
        'Deed of Absolute Sale or Deed of Conveyance (notarized)',
        'Vicinity Map or Location Map of the Property',
      ],
    },
    {
      section: 'B.  Ownership & Authorization Documents',
      items: [
        'Photocopy of valid government-issued ID of all parties (seller & buyer)',
        'Tax Identification Number (TIN) of all parties',
        'Special Power of Attorney (SPA) if represented by an authorized person',
        'Marriage Certificate (if applicable)',
      ],
    },
  ],
  'RPT Assistance': [
    {
      section: 'A.  Property Documents',
      items: [
        'Certified True Copy of Transfer Certificate of Title (TCT)',
        'Latest Tax Declaration for Land and/or Building',
        'Previous Official Receipt of Real Property Tax payment',
      ],
    },
    {
      section: 'B.  Ownership & Authorization Documents',
      items: [
        'Photocopy of valid government-issued ID of the registered owner',
        'Special Power of Attorney (SPA) if represented by an authorized person',
      ],
    },
  ],
  'Environmental Planning': [
    {
      section: 'A.  Property / Land Documents',
      items: [
        'Certified True Copy of Transfer Certificate of Title (TCT)',
        'Vicinity Map or Location Map',
        'Land Use / Zoning Clearance',
        'Existing surveys, topographic maps, or land-use plans (if available)',
      ],
    },
    {
      section: 'B.  Company / Authorization Documents',
      items: [
        'SEC Registration / DTI Business Registration',
        'Company Profile and Organizational Chart',
        'Photocopy of valid government-issued ID of authorized representative',
        'Board Resolution or Special Power of Attorney',
      ],
    },
  ],
}

const DEFAULT_DOCS = [
  {
    section: 'A.  Identification Documents',
    items: [
      'Photocopy of valid government-issued ID of the registered owner / authorized representative',
      'Special Power of Attorney (SPA) if represented by an authorized person',
      'Tax Identification Number (TIN)',
    ],
  },
  {
    section: 'B.  Supporting Documents (if applicable)',
    items: [
      'Certified True Copy of Transfer Certificate of Title (TCT)',
      'Updated Tax Declaration',
      'Latest Real Property Tax (RPT) Official Receipt / Tax Clearance',
    ],
  },
]

function php(n: number) {
  return 'PHP ' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function longDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function sectionHead(doc: jsPDF, num: string, title: string, y: number, margin: number, pw: number): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...NAVY)
  doc.text(`${num}  ${title}`, margin, y)
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.4)
  doc.line(margin, y + 1.8, pw - margin, y + 1.8)
  return y + 9
}

function checkBreak(doc: jsPDF, y: number, need: number, margin: number): number {
  if (y + need > doc.internal.pageSize.getHeight() - margin - 5) {
    doc.addPage()
    return margin + 8
  }
  return y
}

async function loadLogoBase64(url: string): Promise<string | null> {
  try {
    const res  = await fetch(url)
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload  = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function generateProposalPDF(proposal: Proposal) {
  const logoData = await loadLogoBase64('/nesw-logo-transparent.png')

  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pw     = doc.internal.pageSize.getWidth()
  const margin = 20
  const cw     = pw - margin * 2

  const categories = Array.from(new Set(proposal.services.map(s => s.category)))
  const subtitle   = categories.length === 1 ? categories[0] : 'Professional Services'

  let y = margin

  // ── LETTERHEAD ───────────────────────────────────────────────────────────────
  // Logo (left)
  if (logoData) {
    doc.addImage(logoData, 'PNG', margin, y, 18, 18)
  }
  const textX = margin + (logoData ? 22 : 0)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...NAVY)
  doc.text('NESW Property & Planning Consultancy', textX, y + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text('PRC-Licensed Real Estate Brokerage and Appraisal', textX, y + 10)
  doc.text('www.neswcorp.com', textX, y + 15)

  // "ENGAGEMENT PROPOSAL" right-aligned
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...NAVY)
  doc.text('ENGAGEMENT PROPOSAL', pw - margin, y + 5, { align: 'right' })

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.setTextColor(...BODY)
  doc.text(subtitle, pw - margin, y + 11, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...MUTED)
  doc.text(`Date: ${longDate(proposal.createdAt)}`, pw - margin, y + 17, { align: 'right' })

  y += 22

  // Divider
  doc.setFillColor(...NAVY)
  doc.rect(margin, y, cw, 0.8, 'F')
  y += 8

  // ── I. CLIENT INFORMATION ────────────────────────────────────────────────────
  y = sectionHead(doc, 'I.', 'CLIENT INFORMATION', y, margin, pw)
  y += 2

  const clientRows: [string, string][] = [
    ['Client Name',            proposal.clientName    || '—'],
    ['Company / Organization', proposal.clientCompany || '—'],
    ['Address',                proposal.clientAddress || '—'],
    ['Purpose / Notes',        proposal.clientNotes   || '—'],
  ]
  if (proposal.clientEmail) clientRows.splice(2, 0, ['Email', proposal.clientEmail])
  if (proposal.clientPhone) clientRows.splice(3, 0, ['Mobile', proposal.clientPhone])

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body: clientRows,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: { top: 2.8, bottom: 2.8, left: 4, right: 4 } },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55, textColor: BODY },
      1: { textColor: BODY },
    },
    tableLineColor: LGRAY,
    tableLineWidth: 0.25,
  })
  y = (doc as DocAT).lastAutoTable.finalY + 10

  // ── II. SCOPE OF SERVICES ────────────────────────────────────────────────────
  y = checkBreak(doc, y, 20, margin)
  y = sectionHead(doc, 'II.', 'SCOPE OF SERVICES', y, margin, pw)
  y += 3

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...BODY)
  const introText = `The ${proposal.agentName ? `appraiser / service provider (${proposal.agentName})` : 'service provider'} shall perform the following professional services as agreed upon:`
  const introLines = doc.splitTextToSize(introText, cw) as string[]
  doc.text(introLines, margin, y)
  y += introLines.length * 4.5 + 3

  for (const svc of proposal.services) {
    y = checkBreak(doc, y, 10, margin)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...BODY)
    const nameLines = doc.splitTextToSize(`•   ${svc.name}`, cw - 4) as string[]
    doc.text(nameLines, margin, y)
    y += nameLines.length * 4.5 + 1.5
  }
  y += 5

  // ── III. DOCUMENTS REQUIRED FROM CLIENT ──────────────────────────────────────
  y = checkBreak(doc, y, 25, margin)
  y = sectionHead(doc, 'III.', 'DOCUMENTS REQUIRED FROM CLIENT', y, margin, pw)
  y += 3

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...BODY)
  const docIntroText = 'To facilitate the timely completion of the engagement, the client is requested to submit the following documents upon signing of this engagement:'
  const docIntroLines = doc.splitTextToSize(docIntroText, cw) as string[]
  doc.text(docIntroLines, margin, y)
  y += docIntroLines.length * 4.5 + 4

  const primaryCat  = categories[0]
  const docSections = DOCS_MAP[primaryCat] ?? DEFAULT_DOCS

  for (const sec of docSections) {
    y = checkBreak(doc, y, 14, margin)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...BLUE)
    doc.text(sec.section, margin, y)
    y += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...BODY)
    sec.items.forEach((item, idx) => {
      y = checkBreak(doc, y, 6, margin)
      const lines = doc.splitTextToSize(`${idx + 1}.   ${item}`, cw - 10) as string[]
      doc.text(lines, margin + 5, y)
      y += lines.length * 4.2
    })
    y += 4
  }

  // Note box
  y = checkBreak(doc, y, 18, margin)
  const noteText = 'Note: Photocopies are acceptable for submission. The appraiser may request original documents for verification purposes during the site inspection. Submission of complete documents at the start of the engagement ensures timely delivery of the report.'
  const noteLines = doc.splitTextToSize(noteText, cw - 10) as string[]
  const noteH     = noteLines.length * 4.2 + 9
  doc.setFillColor(...BEIGE)
  doc.roundedRect(margin, y, cw, noteH, 1.5, 1.5, 'F')
  doc.setDrawColor(210, 175, 60)
  doc.setLineWidth(0.25)
  doc.roundedRect(margin, y, cw, noteH, 1.5, 1.5, 'S')
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(110, 85, 15)
  doc.text(noteLines, margin + 5, y + 5)
  y += noteH + 10

  // ── IV. PROFESSIONAL FEE ─────────────────────────────────────────────────────
  y = checkBreak(doc, y, 40, margin)
  y = sectionHead(doc, 'IV.', 'PROFESSIONAL FEE', y, margin, pw)
  y += 3

  // Service line items
  const serviceRows: (string | { content: string; styles: Record<string, unknown> })[][] =
    proposal.services.map(svc => [
      { content: svc.name, styles: { textColor: BODY } },
      { content: `${svc.qty > 1 ? `${svc.qty} ×  ` : ''}${php(svc.unitPrice)}`, styles: { halign: 'right', textColor: MUTED } },
      { content: php(svc.qty * svc.unitPrice), styles: { halign: 'right', fontStyle: 'bold', textColor: BODY } },
    ])

  // Subtotal row
  serviceRows.push([
    { content: 'Subtotal', styles: { fontStyle: 'bold', textColor: BODY } },
    { content: '', styles: {} },
    { content: php(proposal.subtotal), styles: { halign: 'right', fontStyle: 'bold', textColor: BODY } },
  ])

  // Discount row (if any)
  if (proposal.discount > 0) {
    serviceRows.push([
      { content: 'Discount', styles: { textColor: ORANGE } },
      { content: '', styles: {} },
      { content: `− ${php(proposal.discount)}`, styles: { halign: 'right', textColor: ORANGE } },
    ])
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Service', 'Rate', 'Amount (PHP)']],
    body: serviceRows,
    headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 9, fontStyle: 'bold', cellPadding: 3 },
    bodyStyles: { fontSize: 9, textColor: BODY, cellPadding: 3.5 },
    alternateRowStyles: { fillColor: BGROW },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 45, halign: 'right' },
      2: { cellWidth: 42, halign: 'right' },
    },
    tableLineColor: LGRAY,
    tableLineWidth: 0.2,
  })
  y = (doc as DocAT).lastAutoTable.finalY

  // TOTAL AMOUNT DUE highlighted row
  const totalH = 11
  doc.setFillColor(...NAVY)
  doc.rect(margin, y, cw, totalH, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...WHITE)
  doc.text('TOTAL AMOUNT DUE', margin + 5, y + 7.5)
  doc.text(php(proposal.total), pw - margin - 5, y + 7.5, { align: 'right' })
  y += totalH + 2

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text('VAT Exclusive', margin + 3, y + 4)
  y += 14

  // ── V. TERMS AND CONDITIONS ───────────────────────────────────────────────────
  y = checkBreak(doc, y, 20, margin)
  y = sectionHead(doc, 'V.', 'TERMS AND CONDITIONS', y, margin, pw)
  y += 4

  const termsList = proposal.terms
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...BODY)

  for (const line of termsList) {
    y = checkBreak(doc, y, 8, margin)
    const clean   = line.replace(/^\d+\.\s*/, '').trim()
    const wrapped = doc.splitTextToSize(`•   ${clean}`, cw) as string[]
    doc.text(wrapped, margin, y)
    y += wrapped.length * 4.8 + 1.5   // extra gap between items
  }
  y += 8

  // ── VI. ACCEPTANCE ────────────────────────────────────────────────────────────
  y = checkBreak(doc, y, 50, margin)
  y = sectionHead(doc, 'VI.', 'ACCEPTANCE', y, margin, pw)
  y += 3

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...BODY)
  const acceptText = 'By signing below, the client agrees to the terms and conditions set forth in this Engagement Proposal and authorizes the service provider to proceed with the agreed scope of work.'
  const acceptLines = doc.splitTextToSize(acceptText, cw) as string[]
  doc.text(acceptLines, margin, y)
  y += acceptLines.length * 4.5 + 16

  // Two signature blocks
  const sigW = (cw - 20) / 2
  const lx   = margin
  const rx   = margin + sigW + 20

  doc.setDrawColor(...LGRAY)
  doc.setLineWidth(0.5)
  doc.line(lx, y, lx + sigW, y)
  doc.line(rx, y, rx + sigW, y)

  y += 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...BODY)
  doc.text('Prepared by:', lx, y)
  doc.text('Conforme:', rx, y)

  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...BODY)
  doc.text(proposal.agentName || 'NESW Property & Planning Consultancy', lx, y)
  doc.text(proposal.clientName || '—', rx, y)

  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text('NESW Property & Planning Consultancy', lx, y)

  y += 4
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text('Signature over Printed Name / Date', lx, y)
  doc.text('Signature over Printed Name / Date', rx, y)

  y += 14

  // Footer
  doc.setDrawColor(...LGRAY)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pw - margin, y)
  y += 4
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.5)
  doc.setTextColor(...MUTED)
  doc.text(
    'This document constitutes the entire agreement between the parties with respect to the subject matter hereof.',
    pw / 2, y, { align: 'center' }
  )

  // Page numbers
  const totalPages = (doc as jsPDF & { internal: { getNumberOfPages: () => number } })
    .internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...MUTED)
    doc.text(`Page ${i} of ${totalPages}`, pw - margin, doc.internal.pageSize.getHeight() - 8, { align: 'right' })
    doc.text(`${proposal.proposalNo}  ·  ${proposal.clientName}`, margin, doc.internal.pageSize.getHeight() - 8)
  }

  doc.save(`${proposal.proposalNo}.pdf`)
}
