import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Proposal } from '@/types/proposal'

// ── Colours (matched from template) ───────────────────────────────────────────
const NAVY   = [27,  56, 100] as [number, number, number]   // headings, table headers
const BLUE   = [46,  93, 168] as [number, number, number]   // sub-headings A / B / C
const GREEN  = [45, 130,  65] as [number, number, number]   // total / footer rows
const BODY   = [50,  50,  50] as [number, number, number]   // regular text
const MUTED  = [120, 120, 120] as [number, number, number]  // italic/captions
const LGRAY  = [190, 190, 190] as [number, number, number]  // table borders / rules
const BEIGE  = [255, 249, 220] as [number, number, number]  // note-box background
const BGROW  = [240, 244, 252] as [number, number, number]  // alt row fill
const GREEN_BG = [235, 248, 238] as [number, number, number]
const WHITE  = [255, 255, 255] as [number, number, number]

type DocAT = jsPDF & { lastAutoTable: { finalY: number } }

// ── Documents required by service category (matches template exactly for Appraisal) ─
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

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Main export ───────────────────────────────────────────────────────────────
export function generateProposalPDF(proposal: Proposal) {
  const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pw    = doc.internal.pageSize.getWidth()
  const margin = 20
  const cw    = pw - margin * 2   // content width

  const categories = Array.from(new Set(proposal.services.map(s => s.category)))
  const subtitle   = categories.length === 1 ? categories[0] : 'Professional Services'

  let y = margin + 4

  // ── HEADER ──────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...NAVY)
  doc.text('ENGAGEMENT PROPOSAL', pw / 2, y, { align: 'center' })
  y += 8

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(11)
  doc.setTextColor(...NAVY)
  doc.text(subtitle, pw / 2, y, { align: 'center' })
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...BODY)
  doc.text(`Date: ${longDate(proposal.createdAt)}`, pw / 2, y, { align: 'center' })
  y += 3

  doc.setDrawColor(...LGRAY)
  doc.setLineWidth(0.5)
  doc.line(margin, y + 1, pw - margin, y + 1)
  y += 10

  // ── I. SUBJECT / CLIENT INFORMATION ─────────────────────────────────────────
  y = sectionHead(doc, 'I.', 'CLIENT INFORMATION', y, margin, pw)
  y += 2

  const clientRows: [string, string][] = [
    ['Client Name',             proposal.clientName || '—'],
    ['Company / Organization',  proposal.clientCompany || '—'],
    ['Property Address',        proposal.clientAddress || '—'],
    ['Purpose / Notes',         proposal.clientNotes || '—'],
  ]

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

    // Bullet + service name
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...BODY)
    const nameLines = doc.splitTextToSize(`•   ${svc.name}`, cw - 4) as string[]
    doc.text(nameLines, margin, y)
    y += nameLines.length * 4.5

    if (svc.timeline) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8.5)
      doc.setTextColor(...MUTED)
      doc.text(`      Estimated Timeline: ${svc.timeline}`, margin, y)
      y += 4.5
    }
    y += 1.5
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

  const primaryCat = categories[0]
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
  const noteH = noteLines.length * 4.2 + 9
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

  // ── IV. SERVICE TIMELINE ─────────────────────────────────────────────────────
  y = checkBreak(doc, y, 30, margin)
  y = sectionHead(doc, 'IV.', 'SERVICE TIMELINE', y, margin, pw)
  y += 3

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...BODY)
  doc.text('The estimated turnaround time for the completion and delivery of services is:', margin, y)
  y += 6

  const timelineBody = proposal.services.map(svc => [svc.name, svc.timeline || 'To be confirmed'])
  const totalNote = 'Timeline begins on Day 1 upon receipt of signed engagement, downpayment, and complete documents. Delays in document submission may affect the delivery timeline.'

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Service / Activity', 'Est. Timeline']],
    body: [
      ['Day 1', 'Signing of engagement & receipt of 50% downpayment; submission of required documents'],
      ...timelineBody,
      ['Final Step', 'Delivery of completed report / service upon receipt of 50% balance'],
    ],
    foot: [[
      {
        content: `Total: ${proposal.services.map(s => s.timeline).filter(Boolean).join(' | ') || 'As agreed'}`,
        styles: { fontStyle: 'bold', textColor: GREEN, fillColor: GREEN_BG },
      },
      {
        content: totalNote,
        styles: { fontStyle: 'italic', textColor: GREEN, fillColor: GREEN_BG },
      },
    ]],
    headStyles: {
      fillColor: NAVY, textColor: WHITE, fontSize: 9, fontStyle: 'bold', cellPadding: 3,
    },
    bodyStyles: { fontSize: 8.5, textColor: BODY, cellPadding: 3 },
    alternateRowStyles: { fillColor: BGROW },
    footStyles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 42, fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
    },
    tableLineColor: LGRAY,
    tableLineWidth: 0.2,
  })
  y = (doc as DocAT).lastAutoTable.finalY + 10

  // ── V. PROFESSIONAL FEE & PAYMENT SCHEDULE ───────────────────────────────────
  y = checkBreak(doc, y, 35, margin)
  y = sectionHead(doc, 'V.', 'PROFESSIONAL FEE & PAYMENT SCHEDULE', y, margin, pw)
  y += 3

  const halfDown    = Math.ceil(proposal.total / 2)
  const halfBalance = proposal.total - halfDown

  const svcLabel = proposal.services.length === 1
    ? proposal.services[0].name
    : `${subtitle} (${proposal.services.length} services)`

  const feeBody: (string | { content: string; styles: Record<string, unknown> })[][] = [
    [svcLabel, php(proposal.subtotal)],
    ...(proposal.discount > 0
      ? [['Discount', `- ${php(proposal.discount)}`]]
      : []),
    [
      { content: '1st Payment — 50% Downpayment (upon signing)', styles: { fontStyle: 'bold' } },
      { content: php(halfDown), styles: { fontStyle: 'bold' } },
    ],
    [
      { content: '2nd Payment — 50% Balance (upon delivery of full report / service)', styles: { fontStyle: 'bold' } },
      { content: php(halfBalance), styles: { fontStyle: 'bold' } },
    ],
  ]

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Description', 'Amount (PHP)']],
    body: feeBody,
    headStyles: {
      fillColor: NAVY, textColor: WHITE, fontSize: 9, fontStyle: 'bold', cellPadding: 3,
    },
    bodyStyles: { fontSize: 8.5, textColor: BODY, cellPadding: 3.5 },
    alternateRowStyles: { fillColor: BGROW },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 42, halign: 'right' },
    },
    tableLineColor: LGRAY,
    tableLineWidth: 0.2,
  })
  y = (doc as DocAT).lastAutoTable.finalY + 10

  // ── VI. PAYMENT DETAILS ──────────────────────────────────────────────────────
  y = checkBreak(doc, y, 28, margin)
  y = sectionHead(doc, 'VI.', 'PAYMENT DETAILS', y, margin, pw)
  y += 3

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...BODY)
  doc.text('Payments may be made via bank transfer to the following account:', margin, y)
  y += 5

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body: [
      ['Bank',           'Metrobank (Metropolitan Bank & Trust Co.)'],
      ['Account Name',   'NESW Realty Corporation'],
      ['Account Number', 'Please contact your agent for bank details'],
    ],
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: { top: 2.8, bottom: 2.8, left: 4, right: 4 } },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42, textColor: BODY },
      1: { textColor: BODY },
    },
    tableLineColor: LGRAY,
    tableLineWidth: 0.25,
  })
  y = (doc as DocAT).lastAutoTable.finalY + 4

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8.5)
  doc.setTextColor(...BODY)
  doc.text('Please send proof of payment to the agent upon remittance of each installment.', margin, y)
  y += 10

  // ── VII. TERMS AND CONDITIONS ────────────────────────────────────────────────
  y = checkBreak(doc, y, 20, margin)
  y = sectionHead(doc, 'VII.', 'TERMS AND CONDITIONS', y, margin, pw)
  y += 3

  const termsList = proposal.terms
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...BODY)

  for (const line of termsList) {
    y = checkBreak(doc, y, 6, margin)
    // Strip leading numbers like "1." and prefix with bullet
    const clean = line.replace(/^\d+\.\s*/, '').trim()
    const wrapped = doc.splitTextToSize(`•   ${clean}`, cw) as string[]
    doc.text(wrapped, margin, y)
    y += wrapped.length * 4.5
  }
  y += 8

  // ── VIII. ACCEPTANCE ─────────────────────────────────────────────────────────
  y = checkBreak(doc, y, 45, margin)
  y = sectionHead(doc, 'VIII.', 'ACCEPTANCE', y, margin, pw)
  y += 3

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...BODY)
  const acceptText = 'By signing below, the client agrees to the terms and conditions set forth in this Engagement Proposal and authorizes the service provider to proceed with the agreed scope of work.'
  const acceptLines = doc.splitTextToSize(acceptText, cw) as string[]
  doc.text(acceptLines, margin, y)
  y += acceptLines.length * 4.5 + 14

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
  doc.text('Prepared by: Appraiser', lx, y)
  doc.text('Conforme: Client', rx, y)

  y += 4
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text('Signature over Printed Name / Date', lx, y)
  doc.text('Signature over Printed Name / Date', rx, y)

  y += 14

  // Footer rule + disclaimer
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
