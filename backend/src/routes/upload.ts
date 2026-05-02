import { Router, Response } from 'express'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router  = Router()
const s3      = new S3Client({ region: process.env.AWS_REGION ?? 'ap-southeast-1' })
const BUCKET  = `nesw-portal-files-${process.env.STAGE ?? 'staging'}`

// POST /api/upload/presign — returns a pre-signed S3 URL for direct browser upload
router.post('/presign', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { fileName, fileType, propertyId } = req.body
    if (!fileName || !fileType) {
      res.status(400).json({ error: 'fileName and fileType are required' })
      return
    }

    const key = `properties/${propertyId ?? 'misc'}/${Date.now()}-${fileName}`
    const command = new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         key,
      ContentType: fileType,
    })

    const url = await getSignedUrl(s3, command, { expiresIn: 300 })
    res.json({ url, key, publicUrl: `https://${BUCKET}.s3.ap-southeast-1.amazonaws.com/${key}` })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to generate presigned URL' })
  }
})

export default router
