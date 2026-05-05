import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Proposal } from '@/types/proposal'

function formatPHP(n: number) {
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function generateProposalPDF(proposal: Proposal) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pw = doc.internal.pageSize.getWidth()
  const green = [30, 100, 50] as [number, number, number]
  const darkGray = [40, 40, 40] as [number, number, number]
  const lightGray = [120, 120, 120] as [number, number, number]
  const bgGreen = [235, 245, 238] as [number, number, number]

  let y = 0

  // ── Header bar ──────────────────────────────────────────────────────────────
  doc.setFillColor(...green)
  doc.rect(0, 0, pw, 28, 'F')

  // Logo placeholder (white square with "N")
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(10, 6, 16, 16, 2, 2, 'F')
  doc.setFontSize(11)
  doc.setTextColor(...green)
  doc.setFont('helvetica', 'bold')
  doc.text('N', 18, 17, { align: 'center' })

  // Company name
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('NESW Realty Corporation', 30, 13)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('portal.neswcorp.com', 30, 20)

  // Proposal label (right side)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('SERVICE QUOTATION', pw - 12, 11, { align: 'right' })
  doc.setFontSize(14)
  doc.text(proposal.proposalNo, pw - 12, 19, { align: 'right' })

  y = 36

  // ── Meta row ────────────────────────────────────────────────────────────────
  const issueDate = new Date(proposal.createdAt)
  const validDate = new Date(issueDate)
  validDate.setDate(validDate.getDate() + (proposal.validityDays ?? 30))

  const metaFmt = (d: Date) => d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })

  doc.setFontSize(8)
  doc.setTextColor(...lightGray)
  doc.setFont('helvetica', 'normal')
  doc.text(`Date: ${metaFmt(issueDate)}`, 12, y)
  doc.text(`Valid Until: ${metaFmt(validDate)}`, 12, y + 5)
  doc.text(`Prepared by: ${proposal.agentName}`, 12, y + 10)

  y += 20

  // ── Client block ─────────────────────────────────────────────────────────────
  doc.setFillColor(...bgGreen)
  doc.roundedRect(10, y, pw - 20, 28, 2, 2, 'F')

  doc.setFontSize(7)
  doc.setTextColor(...green)
  doc.setFont('helvetica', 'bold')
  doc.text('PREPARED FOR', 15, y + 6)

  doc.setFontSize(11)
  doc.setTextColor(...darkGray)
  doc.text(proposal.clientName, 15, y + 13)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...lightGray)
  let clientLine = y + 19
  if (proposal.clientCompany) { doc.text(proposal.clientCompany, 15, clientLine); clientLine += 5 }
  const contactParts = [proposal.clientEmail, proposal.clientPhone].filter(Boolean)
  if (contactParts.length) doc.text(contactParts.join('  ·  '), 15, clientLine)

  if (proposal.clientAddress) {
    doc.text(proposal.clientAddress, pw / 2, y + 13, { maxWidth: pw / 2 - 15 })
  }

  y += 36

  // ── Services table ───────────────────────────────────────────────────────────
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...green)
  doc.text('SERVICES', 12, y)
  y += 4

  autoTable(doc, {
    startY: y,
    margin: { left: 10, right: 10 },
    head: [['#', 'Service', 'Timeline', 'Qty', 'Unit Price', 'Amount']],
    body: proposal.services.map((s, i) => [
      String(i + 1),
      s.name,
      s.timeline || '—',
      String(s.qty),
      formatPHP(s.unitPrice),
      formatPHP(s.qty * s.unitPrice),
    ]),
    headStyles: {
      fillColor: green,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: darkGray,
      cellPadding: 3,
    },
    alternateRowStyles: { fillColor: bgGreen },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 10, halign: 'center' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 26, halign: 'right' },
    },
    tableLineColor: [220, 220, 220],
    tableLineWidth: 0.1,
  })

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

  // ── Totals ───────────────────────────────────────────────────────────────────
  const totalsX = pw - 10
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...lightGray)
  doc.text('Subtotal:', totalsX - 28, y, { align: 'right' })
  doc.setTextColor(...darkGray)
  doc.text(formatPHP(proposal.subtotal), totalsX, y, { align: 'right' })
  y += 6

  if (proposal.discount > 0) {
    doc.setTextColor(...lightGray)
    doc.text('Discount:', totalsX - 28, y, { align: 'right' })
    doc.setTextColor(220, 50, 50)
    doc.text(`- ${formatPHP(proposal.discount)}`, totalsX, y, { align: 'right' })
    y += 6
  }

  // Total row
  doc.setFillColor(...green)
  doc.rect(pw - 65, y - 3, 56, 9, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL', totalsX - 28, y + 3, { align: 'right' })
  doc.text(formatPHP(proposal.total), totalsX, y + 3, { align: 'right' })
  y += 16

  // ── Terms ────────────────────────────────────────────────────────────────────
  if (proposal.terms) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...green)
    doc.text('TERMS & CONDITIONS', 12, y)
    y += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...lightGray)
    const lines = doc.splitTextToSize(proposal.terms, pw - 24) as string[]
    doc.text(lines, 12, y)
    y += lines.length * 4 + 6
  }

  // ── Footer / Signature ───────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight()
  const footerY = Math.max(y + 10, pageH - 30)

  doc.setDrawColor(...green)
  doc.setLineWidth(0.3)
  doc.line(12, footerY, 70, footerY)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...darkGray)
  doc.text(proposal.agentName, 12, footerY + 5)
  doc.setTextColor(...lightGray)
  doc.setFontSize(7)
  doc.text('NESW Realty Corporation', 12, footerY + 10)

  doc.setFontSize(7)
  doc.setTextColor(...lightGray)
  doc.text('Thank you for your business.', pw / 2, footerY + 10, { align: 'center' })

  doc.save(`${proposal.proposalNo}.pdf`)
}
