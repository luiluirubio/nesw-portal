import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Billing } from '@/types/billing'

// ── Colours ───────────────────────────────────────────────────────────────────
const NAVY    = [27,  56, 100] as [number, number, number]
const ORANGE  = [230, 120,  20] as [number, number, number]
const BODY    = [50,  50,  50] as [number, number, number]
const MUTED   = [120, 120, 120] as [number, number, number]
const LGRAY   = [190, 190, 190] as [number, number, number]
const WHITE   = [255, 255, 255] as [number, number, number]
const BGROW   = [240, 244, 252] as [number, number, number]

type DocAT = jsPDF & { lastAutoTable: { finalY: number } }

function php(n: number) {
  return `PHP ${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function longDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
}

// Load image from URL → base64 data URL (for jsPDF addImage)
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

// ── Main export ───────────────────────────────────────────────────────────────
export async function generateBillingPDF(billing: Billing) {
  const logoData = await toBase64('/nesw-logo-transparent.png')

  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pw     = doc.internal.pageSize.getWidth()
  const margin = 18
  const cw     = pw - margin * 2

  let y = margin

  // ── HEADER ───────────────────────────────────────────────────────────────────
  // Logo (left)
  if (logoData) {
    doc.addImage(logoData, 'PNG', margin, y, 16, 16)
  }

  // Company name + tagline (beside logo)
  const textX = margin + (logoData ? 20 : 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...NAVY)
  doc.text('NESW Property & Planning Consultancy', textX, y + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text('PRC-Licensed Real Estate Brokerage and Appraisal', textX, y + 10)
  doc.text('www.neswcorp.com', textX, y + 14)

  // "BILLING STATEMENT" (right)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...NAVY)
  doc.text('BILLING STATEMENT', pw - margin, y + 5, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...BODY)
  const issued = billing.dateIssued
    ? longDate(billing.dateIssued)
    : longDate(billing.createdAt)
  doc.text(`Date Issued: ${issued}`, pw - margin, y + 11, { align: 'right' })
  doc.text(`Reference No: ${billing.billingNo}`, pw - margin, y + 16, { align: 'right' })

  y += 22

  // Divider
  doc.setDrawColor(...LGRAY)
  doc.setLineWidth(0.4)
  doc.line(margin, y, pw - margin, y)
  y += 8

  // ── INFO ROW: BILLED TO  |  SERVICE & PURPOSE ────────────────────────────────
  const halfW = (cw - 6) / 2
  const rightX = margin + halfW + 6

  // Left box — BILLED TO
  doc.setFillColor(240, 244, 252)
  doc.roundedRect(margin, y, halfW, 30, 1.5, 1.5, 'F')
  doc.setDrawColor(...LGRAY)
  doc.setLineWidth(0.2)
  doc.roundedRect(margin, y, halfW, 30, 1.5, 1.5, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...MUTED)
  doc.text('BILLED TO', margin + 4, y + 5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...NAVY)
  const clientLines = doc.splitTextToSize(billing.clientName || '—', halfW - 8) as string[]
  doc.text(clientLines, margin + 4, y + 11)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...BODY)
  doc.text('Client', margin + 4, y + 11 + clientLines.length * 4.5)

  if (billing.clientCompany) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7.5)
    doc.setTextColor(...MUTED)
    const compLines = doc.splitTextToSize(billing.clientCompany, halfW - 8) as string[]
    doc.text(compLines, margin + 4, y + 17 + clientLines.length * 2)
  }

  // Right box — SERVICE & PURPOSE
  doc.setFillColor(255, 245, 230)
  doc.roundedRect(rightX, y, halfW, 30, 1.5, 1.5, 'F')
  doc.setDrawColor(...ORANGE)
  doc.setLineWidth(0.2)
  doc.roundedRect(rightX, y, halfW, 30, 1.5, 1.5, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...ORANGE)
  doc.text('SERVICE & PURPOSE', rightX + 4, y + 5)

  if (billing.servicePurpose) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...NAVY)
    const purposeLines = doc.splitTextToSize(billing.servicePurpose, halfW - 8) as string[]
    doc.text(purposeLines, rightX + 4, y + 11)
  }

  y += 38

  // ── ITEMIZED BILLING ──────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...NAVY)
  doc.text('ITEMIZED BILLING', margin, y)
  y += 5

  // Build table body — each item has description (bold) + subDescription (italic grey sub-row
  const tableBody: { content: string; styles?: Record<string, unknown> }[][] = []

  for (const item of billing.items) {
    tableBody.push([
      {
        content: item.description || '—',
        styles: { fontStyle: 'bold', textColor: BODY },
      },
      {
        content: php(item.amount),
        styles: { halign: 'right', fontStyle: 'bold', textColor: BODY },
      },
    ])
    if (item.subDescription) {
      tableBody.push([
        {
          content: item.subDescription,
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

  // Discount (if any)
  if (billing.discount > 0) {
    tableBody.push([
      { content: `${billing.discount}% Corporate Discount`, styles: { textColor: ORANGE } },
      {
        content: `- PHP ${((billing.subtotal * billing.discount) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
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

  // ── TOTAL AMOUNT DUE row (highlighted) ───────────────────────────────────────
  const totalH = 12
  doc.setFillColor(...NAVY)
  doc.rect(margin, y, cw, totalH, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...WHITE)
  doc.text('TOTAL AMOUNT DUE', margin + 5, y + 7.5)
  doc.text(php(billing.total), pw - margin - 5, y + 7.5, { align: 'right' })
  y += totalH + 1

  // VAT note
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text('Vat Exclusive', margin + 3, y + 5)
  y += 14

  // ── PAYMENT DETAILS & TERMS ───────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...NAVY)
  doc.text('PAYMENT DETAILS & TERMS', margin, y)
  y += 5

  const payW = (cw - 6) / 2

  // Left — bank details
  doc.setFillColor(...NAVY)
  doc.rect(margin, y, payW, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...WHITE)
  doc.text('CORPORATE BANK ACCOUNT DETAILS', margin + 4, y + 4.5)

  const bankY = y + 10
  const bankRows = [
    ['Account Name', 'NESW Property & Planning Consultancy'],
    ['Metrobank',    '2923 2925 57869'],
    ['China Bank',   '1212 0204 5660'],
  ]
  for (const [label, value] of bankRows) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text(label, margin + 4, bankY + bankRows.indexOf([label, value]) * 7)
    doc.setTextColor(...BODY)
    doc.text(value, margin + 36, bankY + bankRows.indexOf([label, value]) * 7)
  }

  // Right — terms
  const termsX = margin + payW + 6
  doc.setFillColor(...ORANGE)
  doc.rect(termsX, y, payW, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...WHITE)
  doc.text('TERMS AND CONDITION', termsX + 4, y + 4.5)

  const termsText = billing.terms ||
    "For your convenience, we'll prepare everything for release and provide the final appraisal reports as soon as full payment has been received."
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...BODY)
  const termsLines = doc.splitTextToSize(termsText, payW - 8) as string[]
  doc.text(termsLines, termsX + 4, y + 12)

  y += 38

  // ── PREPARED BY ───────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...NAVY)
  doc.text('PREPARED BY', margin, y)
  y += 3

  doc.setDrawColor(...LGRAY)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pw - margin, y)
  y += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...BODY)
  doc.text(billing.agentName || '—', margin, y)
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...MUTED)
  doc.text('President, REA, REB, EnP.', margin, y)
  y += 4.5
  doc.text('NESW Property & Planning Consultancy', margin, y)
  y += 4.5
  doc.text('E: jrubio@neswcorp.com', margin, y)
  y += 4.5
  doc.text('M: +63 998 859 0597', margin, y)
  y += 12

  // Footer
  doc.setDrawColor(...LGRAY)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pw - margin, y)
  y += 4
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.5)
  doc.setTextColor(...MUTED)
  doc.text('www.neswcorp.com', pw / 2, y, { align: 'center' })

  doc.save(`${billing.billingNo}.pdf`)
}
