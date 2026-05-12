import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import QRCode from 'qrcode'
import type { Billing } from '@/types/billing'

// ── Colours (shared with proposalPdf) ────────────────────────────────────────
const NAVY   = [27,  56, 100] as [number, number, number]
const ORANGE = [230, 120,  20] as [number, number, number]
const BODY   = [50,  50,  50] as [number, number, number]
const MUTED  = [120, 120, 120] as [number, number, number]
const LGRAY  = [190, 190, 190] as [number, number, number]
const WHITE  = [255, 255, 255] as [number, number, number]
const BGROW  = [240, 244, 252] as [number, number, number]

type DocAT = jsPDF & { lastAutoTable: { finalY: number } }

function php(n: number) {
  return `PHP ${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function longDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

// Replace chars outside Latin-1 printable range that break jsPDF Helvetica
function sanitize(s: string) {
  return s
    .replace(/±/g,   '+/-')
    .replace(/–/g,   '-')
    .replace(/—/g,   '--')
    .replace(/'/g,  "'").replace(/'/g, "'")
    .replace(/"/g,  '"').replace(/"/g, '"')
    .replace(/[^\x00-\xFF]/g, '?')
}

// Load image onto a white canvas so transparent areas become white in jsPDF
async function toBase64(url: string): Promise<string | null> {
  return new Promise<string | null>(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width  = img.naturalWidth  || img.width
        canvas.height = img.naturalHeight || img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(null); return }
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function checkBreak(doc: jsPDF, y: number, need: number, margin: number): number {
  if (y + need > doc.internal.pageSize.getHeight() - margin - 5) {
    doc.addPage()
    return margin + 8
  }
  return y
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function generateBillingPDF(billing: Billing) {
  const logoData = await toBase64('/nesw-logo-transparent.png')

  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pw     = doc.internal.pageSize.getWidth()
  const margin = 16
  const cw     = pw - margin * 2

  let y = margin

  // ── LETTERHEAD ───────────────────────────────────────────────────────────────
  if (logoData) {
    doc.addImage(logoData, 'PNG', margin, y, 15, 15)
  }
  const textX = margin + (logoData ? 18 : 0)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...NAVY)
  doc.text('NESW Property & Planning Consultancy', textX, y + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text('PRC-Licensed Real Estate Brokerage and Appraisal', textX, y + 10)
  doc.text('www.neswcorp.com', textX, y + 15)

  // "BILLING STATEMENT" right-aligned
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...NAVY)
  doc.text('BILLING STATEMENT', pw - margin, y + 5, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...NAVY)
  doc.text(billing.billingNo, pw - margin, y + 11, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...MUTED)
  const issued = billing.dateIssued ? longDate(billing.dateIssued) : longDate(billing.createdAt)
  doc.text(`Date Issued: ${issued}`, pw - margin, y + 16, { align: 'right' })
  if (billing.dueDate) {
    doc.setTextColor(230, 80, 20)
    doc.text(`Due Date: ${longDate(billing.dueDate)}`, pw - margin, y + 21, { align: 'right' })
    doc.setTextColor(...MUTED)
  }

  y += billing.dueDate ? 25 : 18

  // Navy divider
  doc.setFillColor(...NAVY)
  doc.rect(margin, y, cw, 0.8, 'F')
  y += 5

  // ── INFO ROW: BILLED TO  |  QR CODE (if available) or SERVICE & PURPOSE ────
  const qrAvail    = !!billing.paymentQrString
  const qrLabelH   = 8    // mm — top navy bar height for "SCAN TO PAY"
  const qrPad      = 2    // mm — padding around QR image
  const qrMinSize  = 32   // mm — minimum QR image size
  const qrBoxW     = qrMinSize + qrPad * 2   // total width of QR column
  const halfW  = qrAvail ? cw - qrBoxW - 6 : (cw - 6) / 2
  const rightX = margin + halfW + 6

  // Generate QR early (needed for both info row and payment section)
  let qrDataUrlEarly: string | null = null
  if (qrAvail && billing.paymentQrString) {
    try {
      qrDataUrlEarly = await QRCode.toDataURL(billing.paymentQrString, {
        width: 220, margin: 1, color: { dark: '#1b3864', light: '#ffffff' },
      })
    } catch { /* skip */ }
  }

  // Pre-calculate all content lines for accurate box height
  const clientNameLines = doc.splitTextToSize(sanitize(billing.clientName || '—'), halfW - 8) as string[]
  const companyLines    = billing.clientCompany
    ? doc.splitTextToSize(sanitize(billing.clientCompany), halfW - 8) as string[]
    : []
  const addrLines = billing.clientAddress
    ? doc.splitTextToSize(sanitize(billing.clientAddress), halfW - 8) as string[]
    : []

  const clientContentH =
    4 +                                                               // label
    clientNameLines.length * 5 +                                     // name
    (companyLines.length ? companyLines.length * 4 + 1 : 0) +       // company
    (addrLines.length    ? addrLines.length    * 3.5 + 1 : 0) +     // address
    3                                                                 // bottom padding
  // Box must be tall enough for the QR image + label
  const boxH = Math.max(clientContentH, qrLabelH + qrMinSize + qrPad, 24)

  // Left — BILLED TO
  doc.setFillColor(240, 244, 252)
  doc.roundedRect(margin, y, halfW, boxH, 1.5, 1.5, 'F')
  doc.setDrawColor(...LGRAY)
  doc.setLineWidth(0.2)
  doc.roundedRect(margin, y, halfW, boxH, 1.5, 1.5, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...MUTED)
  doc.text('BILLED TO', margin + 4, y + 4)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...NAVY)
  doc.text(clientNameLines, margin + 4, y + 9)

  let billedY = y + 9 + clientNameLines.length * 4.8
  if (companyLines.length) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7.5)
    doc.setTextColor(...MUTED)
    doc.text(companyLines, margin + 4, billedY + 1.5)
    billedY += companyLines.length * 4 + 1.5
  }
  if (addrLines.length) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...MUTED)
    doc.text(addrLines, margin + 4, billedY + 2)
  }

  // Right — QR code: navy top bar + QR image below
  if (qrDataUrlEarly) {
    const qrImgSz = boxH - qrLabelH - qrPad
    const qrImgX  = rightX + (qrBoxW - qrImgSz) / 2  // centre QR horizontally

    // Light background for full box
    doc.setFillColor(248, 250, 255)
    doc.setDrawColor(...LGRAY)
    doc.setLineWidth(0.2)
    doc.roundedRect(rightX, y, qrBoxW, boxH, 1.5, 1.5, 'FD')

    // Navy top bar (plain rect so rounded corners stay only on outer box)
    doc.setFillColor(...NAVY)
    doc.rect(rightX, y, qrBoxW, qrLabelH, 'F')

    // "SCAN TO PAY" — white horizontal text, centred in navy bar
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(255, 255, 255)
    doc.text('SCAN TO PAY', rightX + qrBoxW / 2, y + qrLabelH / 2 + 1.5, { align: 'center' })

    // QR image below the bar
    doc.addImage(qrDataUrlEarly, 'PNG', qrImgX, y + qrLabelH + qrPad / 2, qrImgSz, qrImgSz)
  }

  y += boxH + 5

  // ── ITEMIZED BILLING ──────────────────────────────────────────────────────────
  y = checkBreak(doc, y, 25, margin)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...NAVY)
  doc.text('ITEMIZED BILLING', margin, y)
  y += 4

  const tableBody: { content: string; styles?: Record<string, unknown> }[][] = []

  for (const item of billing.items) {
    const isCredit = item.type === 'credit'
    tableBody.push([
      {
        content: sanitize(item.description || '—'),
        styles: { fontStyle: 'bold', textColor: BODY },
      },
      {
        content: isCredit ? `(${php(item.amount)})` : php(item.amount),
        styles: { halign: 'right', fontStyle: 'bold', textColor: isCredit ? ORANGE : BODY },
      },
    ])
    if (item.subDescription) {
      tableBody.push([
        {
          content: sanitize(item.subDescription),
          styles: { fontStyle: 'italic', textColor: MUTED, fontSize: 8 },
        },
        { content: '', styles: {} },
      ])
    }
  }

  // Subtotal
  tableBody.push([
    { content: 'Subtotal', styles: { textColor: BODY } },
    { content: php(billing.subtotal), styles: { halign: 'right', textColor: BODY } },
  ])

  // Discount
  if (billing.discount > 0) {
    const discAmt = (billing.subtotal * billing.discount) / 100
    tableBody.push([
      { content: `${billing.discount}% Corporate Discount`, styles: { textColor: ORANGE } },
      {
        content: `- ${php(discAmt)}`,
        styles: { halign: 'right', textColor: ORANGE },
      },
    ])
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [[
      { content: 'DESCRIPTION', styles: { halign: 'left' } },
      { content: 'AMOUNT (PHP)', styles: { halign: 'right' } },
    ]],
    body: tableBody,
    headStyles: {
      fillColor: NAVY, textColor: WHITE, fontSize: 8.5, fontStyle: 'bold',
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
    },
    bodyStyles: {
      fontSize: 8.5, textColor: BODY,
      cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 },
    },
    alternateRowStyles: { fillColor: BGROW },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 48, halign: 'right' },
    },
    tableLineColor: LGRAY,
    tableLineWidth: 0.2,
  })
  y = (doc as DocAT).lastAutoTable.finalY

  // TOTAL AMOUNT DUE row
  const totalH = 12
  doc.setFillColor(...NAVY)
  doc.rect(margin, y, cw, totalH, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...WHITE)
  doc.text('TOTAL AMOUNT DUE', margin + 5, y + 7.5)
  doc.text(php(billing.total), pw - margin - 5, y + 7.5, { align: 'right' })
  y += totalH + 1

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.5)
  doc.setTextColor(...MUTED)
  doc.text('VAT Exclusive', margin + 3, y + 3.5)
  y += 8

  // ── PAYMENT DETAILS & TERMS ───────────────────────────────────────────────────
  y = checkBreak(doc, y, 45, margin)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...NAVY)
  doc.text('PAYMENT DETAILS & TERMS', margin, y)
  y += 4

  // Three-column layout when QR exists: bank | terms | QR
  // Two-column layout without QR: bank | terms
  const payW   = (cw - 6) / 2
  const termsX = margin + payW + 6

  // ── Column headers ────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY)
  doc.rect(margin, y, payW, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...WHITE)
  doc.text('CORPORATE BANK ACCOUNT DETAILS', margin + 4, y + 4.5)

  doc.setFillColor(...ORANGE)
  doc.rect(termsX, y, payW, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...WHITE)
  doc.text('TERMS AND CONDITIONS', termsX + 4, y + 4.5)

  y += 9

  // ── Bank details — Metrobank only ────────────────────────────────────────
  const bankItems = [
    { label: 'Account Name', value: 'NESW Property & Planning Consultancy' },
    { label: 'Metrobank',    value: '225-3-92483176-7' },
  ]
  const contentStartY = y   // both bank and terms start at the same y
  bankItems.forEach(({ label, value }) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(...MUTED)
    doc.text(label, margin + 4, y)
    y += 3.5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...BODY)
    doc.text(value, margin + 4, y)
    y += 5
  })
  const bankEndY = y

  // ── Terms text — starts at same y as bank content ─────────────────────────
  const termsText = billing.terms || ''
  if (termsText) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...BODY)
    const tLines = doc.splitTextToSize(sanitize(termsText), payW - 8) as string[]
    doc.text(tLines, termsX + 4, contentStartY)
  }

  y = bankEndY + 5

  // ── PREPARED BY ───────────────────────────────────────────────────────────────
  y = checkBreak(doc, y, 35, margin)

  doc.setDrawColor(...LGRAY)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pw - margin, y)
  y += 4

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...MUTED)
  doc.text('PREPARED BY', margin, y)
  y += 4

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...BODY)
  doc.text(sanitize(billing.agentName || '—'), margin, y)
  y += 4.5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  const agentLines = [
    'President, REA, REB, EnP.',
    'NESW Property & Planning Consultancy',
    'E: jrubio@neswcorp.com',
    'M: +63 998 859 0597',
  ]
  agentLines.forEach(line => {
    doc.text(line, margin, y)
    y += 4
  })

  // ── FOOTER (matches proposalPdf) ─────────────────────────────────────────────
  const totalPages = (doc as jsPDF & { internal: { getNumberOfPages: () => number } })
    .internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const ph = doc.internal.pageSize.getHeight()

    doc.setDrawColor(...LGRAY)
    doc.setLineWidth(0.3)
    doc.line(margin, ph - 11, pw - margin, ph - 11)

    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7.5)
    doc.setTextColor(...MUTED)
    doc.text(
      'This document is system generated. For inquiries, please contact NESW Property & Planning Consultancy.',
      pw / 2, ph - 8, { align: 'center' }
    )

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(`Page ${i} of ${totalPages}`, pw - margin, ph - 4, { align: 'right' })
    doc.text(`${billing.billingNo}  ·  ${billing.clientName}`, margin, ph - 4)
  }

  doc.save(`${billing.billingNo}.pdf`)
}
