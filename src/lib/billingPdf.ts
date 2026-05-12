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

async function toBase64(url: string): Promise<string | null> {
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
  const margin = 20
  const cw     = pw - margin * 2

  let y = margin

  // ── LETTERHEAD (matches proposalPdf) ─────────────────────────────────────────
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

  y += 22

  // Navy divider (matches proposalPdf)
  doc.setFillColor(...NAVY)
  doc.rect(margin, y, cw, 0.8, 'F')
  y += 8

  // ── INFO ROW: BILLED TO  |  SERVICE & PURPOSE ────────────────────────────────
  const halfW  = (cw - 6) / 2
  const rightX = margin + halfW + 6

  // Calculate dynamic box height based on content
  const clientNameLines  = doc.splitTextToSize(sanitize(billing.clientName || '—'), halfW - 8) as string[]
  const companyLines     = billing.clientCompany
    ? doc.splitTextToSize(sanitize(billing.clientCompany), halfW - 8) as string[]
    : []
  const purposeLines     = billing.servicePurpose
    ? doc.splitTextToSize(sanitize(billing.servicePurpose), halfW - 8) as string[]
    : []
  const boxH = Math.max(
    5 + clientNameLines.length * 5 + (companyLines.length ? companyLines.length * 4 + 2 : 0) + 8,
    purposeLines.length ? 5 + purposeLines.length * 5 + 8 : 28,
    28
  )

  // Left — BILLED TO
  doc.setFillColor(240, 244, 252)
  doc.roundedRect(margin, y, halfW, boxH, 1.5, 1.5, 'F')
  doc.setDrawColor(...LGRAY)
  doc.setLineWidth(0.2)
  doc.roundedRect(margin, y, halfW, boxH, 1.5, 1.5, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...MUTED)
  doc.text('BILLED TO', margin + 4, y + 5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...NAVY)
  doc.text(clientNameLines, margin + 4, y + 11)

  let billedY = y + 11 + clientNameLines.length * 5
  if (billing.clientCompany) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text(companyLines, margin + 4, billedY + 2)
    billedY += companyLines.length * 4 + 2
  }
  if (billing.clientAddress) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...MUTED)
    const addrLines = doc.splitTextToSize(sanitize(billing.clientAddress), halfW - 8) as string[]
    doc.text(addrLines, margin + 4, billedY + 3)
  }

  // Right — SERVICE & PURPOSE
  doc.setFillColor(255, 245, 230)
  doc.roundedRect(rightX, y, halfW, boxH, 1.5, 1.5, 'F')
  doc.setDrawColor(...ORANGE)
  doc.setLineWidth(0.2)
  doc.roundedRect(rightX, y, halfW, boxH, 1.5, 1.5, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...ORANGE)
  doc.text('SERVICE & PURPOSE', rightX + 4, y + 5)

  if (billing.servicePurpose) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...NAVY)
    doc.text(purposeLines, rightX + 4, y + 11)
  }

  y += boxH + 8

  // ── ITEMIZED BILLING ──────────────────────────────────────────────────────────
  y = checkBreak(doc, y, 30, margin)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...NAVY)
  doc.text('ITEMIZED BILLING', margin, y)
  y += 5

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
      fillColor: NAVY, textColor: WHITE, fontSize: 9, fontStyle: 'bold',
      cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
    },
    bodyStyles: {
      fontSize: 9, textColor: BODY,
      cellPadding: { top: 3.5, bottom: 3.5, left: 5, right: 5 },
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
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text('VAT Exclusive', margin + 3, y + 4)
  y += 14

  // ── PAYMENT DETAILS & TERMS ───────────────────────────────────────────────────
  y = checkBreak(doc, y, 55, margin)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...NAVY)
  doc.text('PAYMENT DETAILS & TERMS', margin, y)
  y += 5

  // Three-column layout when QR exists: bank | terms | QR
  // Two-column layout without QR: bank | terms
  const hasQR  = !!billing.paymentQrString
  const qrSize = 40  // mm square

  // Generate QR data URL
  let qrDataUrl: string | null = null
  if (hasQR && billing.paymentQrString) {
    try {
      qrDataUrl = await QRCode.toDataURL(billing.paymentQrString, {
        width: 220, margin: 1, color: { dark: '#1b3864', light: '#ffffff' },
      })
    } catch { /* skip QR on error */ }
  }

  const contentW = qrDataUrl ? cw - qrSize - 8 : cw
  const payW     = (contentW - 6) / 2
  const termsX   = margin + payW + 6
  const qrX      = pw - margin - qrSize

  // ── Column headers ────────────────────────────────────────────────────────
  const headerH = 7
  doc.setFillColor(...NAVY)
  doc.rect(margin, y, payW, headerH, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...WHITE)
  doc.text('CORPORATE BANK ACCOUNT DETAILS', margin + 4, y + 4.5)

  doc.setFillColor(...ORANGE)
  doc.rect(termsX, y, payW, headerH, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...WHITE)
  doc.text('TERMS AND CONDITIONS', termsX + 4, y + 4.5)

  if (qrDataUrl) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...NAVY)
    doc.text('SCAN TO PAY', qrX + qrSize / 2, y + 4.5, { align: 'center' })
  }

  y += headerH + 4

  // ── Bank details — stacked label / value (avoids overflow) ────────────────
  const bankItems = [
    { label: 'Account Name', value: 'NESW Property & Planning Consultancy' },
    { label: 'Metrobank',    value: '2923 2925 57869' },
    { label: 'China Bank',   value: '1212 0204 5660' },
  ]
  const bankStartY = y
  bankItems.forEach(({ label, value }) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...MUTED)
    doc.text(label, margin + 4, y)
    y += 4
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...BODY)
    doc.text(value, margin + 4, y)
    y += 6
  })
  const bankEndY = y

  // ── Terms text ────────────────────────────────────────────────────────────
  const termsText = billing.terms || ''
  if (termsText) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...BODY)
    const tLines = doc.splitTextToSize(sanitize(termsText), payW - 8) as string[]
    doc.text(tLines, termsX + 4, bankStartY)
  }

  // ── QR image — positioned from header bottom, same column ─────────────────
  let qrEndY = bankStartY
  if (qrDataUrl) {
    doc.setFillColor(248, 250, 255)
    doc.setDrawColor(...LGRAY)
    doc.setLineWidth(0.2)
    doc.roundedRect(qrX - 2, bankStartY - 2, qrSize + 4, qrSize + 8, 2, 2, 'FD')

    doc.addImage(qrDataUrl, 'PNG', qrX, bankStartY, qrSize, qrSize)

    qrEndY = bankStartY + qrSize + 8
  }

  // Advance y past the tallest of bank column, terms column, or QR
  y = Math.max(bankEndY, qrEndY) + 8

  // ── PREPARED BY ───────────────────────────────────────────────────────────────
  y = checkBreak(doc, y, 45, margin)

  doc.setDrawColor(...LGRAY)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pw - margin, y)
  y += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text('PREPARED BY', margin, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...BODY)
  doc.text(sanitize(billing.agentName || '—'), margin, y)
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...MUTED)
  const agentLines = [
    'President, REA, REB, EnP.',
    'NESW Property & Planning Consultancy',
    'E: jrubio@neswcorp.com',
    'M: +63 998 859 0597',
  ]
  agentLines.forEach(line => {
    doc.text(line, margin, y)
    y += 4.5
  })

  // ── FOOTER (matches proposalPdf) ─────────────────────────────────────────────
  const totalPages = (doc as jsPDF & { internal: { getNumberOfPages: () => number } })
    .internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const ph = doc.internal.pageSize.getHeight()

    doc.setDrawColor(...LGRAY)
    doc.setLineWidth(0.3)
    doc.line(margin, ph - 12, pw - margin, ph - 12)

    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7.5)
    doc.setTextColor(...MUTED)
    doc.text(
      'This document constitutes the entire agreement between the parties with respect to the subject matter hereof.',
      pw / 2, ph - 8, { align: 'center' }
    )

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(`Page ${i} of ${totalPages}`, pw - margin, ph - 4, { align: 'right' })
    doc.text(`${billing.billingNo}  ·  ${billing.clientName}`, margin, ph - 4)
  }

  doc.save(`${billing.billingNo}.pdf`)
}
