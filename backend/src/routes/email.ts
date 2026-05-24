import { Router, Response } from 'express'
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()
const ses = new SESv2Client({ region: process.env.AWS_REGION ?? 'ap-southeast-1' })
const FROM = process.env.SES_FROM_EMAIL ?? 'noreply@neswcorp.com'

function buildMime(opts: {
  from: string
  to: string[]
  subject: string
  bodyHtml: string
  attachment?: { filename: string; content: string }
}): Buffer {
  const b = `nesw-${Date.now()}`
  const lines = [
    'MIME-Version: 1.0',
    `From: NESW Realty Corporation <${opts.from}>`,
    `To: ${opts.to.join(', ')}`,
    `Subject: ${opts.subject}`,
    `Content-Type: multipart/mixed; boundary="${b}"`,
    '',
    `--${b}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    opts.bodyHtml,
    '',
  ]
  if (opts.attachment) {
    lines.push(
      `--${b}`,
      'Content-Type: application/pdf',
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${opts.attachment.filename}"`,
      '',
      opts.attachment.content,
      '',
    )
  }
  lines.push(`--${b}--`)
  return Buffer.from(lines.join('\r\n'))
}

const ALLOWED_EMAIL_DOMAINS = ['neswcorp.com', 'nesw.com']
const MAX_RECIPIENTS = 10

// POST /api/email/send
router.post('/send', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { to, subject, bodyHtml, attachment } = req.body as {
      to: string[]
      subject: string
      bodyHtml: string
      attachment?: { filename: string; content: string }
    }

    if (!Array.isArray(to) || to.length === 0) {
      res.status(400).json({ error: 'to is required' }); return
    }
    if (to.length > MAX_RECIPIENTS) {
      res.status(400).json({ error: `Too many recipients (max ${MAX_RECIPIENTS})` }); return
    }
    const invalid = to.filter(addr => !ALLOWED_EMAIL_DOMAINS.some(d => addr.toLowerCase().endsWith(`@${d}`)))
    if (invalid.length > 0) {
      res.status(400).json({ error: 'All recipients must be neswcorp.com or nesw.com addresses' }); return
    }
    if (!subject) { res.status(400).json({ error: 'subject is required' }); return }

    const raw = buildMime({ from: FROM, to, subject, bodyHtml: bodyHtml ?? '', attachment })

    await ses.send(new SendEmailCommand({
      Content: { Raw: { Data: raw } },
    }))

    res.json({ success: true })
  } catch (err) {
    console.error('Email error:', err)
    res.status(500).json({ error: 'Failed to send email' })
  }
})

export default router
