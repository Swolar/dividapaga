import { Router } from 'express'
import type { Response } from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { uploadMiddleware } from '../middleware/upload.middleware.js'
import { uploadLimiter } from '../middleware/rate-limiter.middleware.js'
import { supabaseAdmin } from '../services/supabase.js'
import type { AuthenticatedRequest } from '../types/index.js'
import crypto from 'crypto'

export const uploadRoutes = Router()

uploadRoutes.use(authMiddleware)

uploadRoutes.post(
  '/receipt',
  uploadLimiter,
  uploadMiddleware.single('receipt'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const file = req.file
    if (!file) {
      res.status(400).json({ message: 'Arquivo obrigatorio' })
      return
    }

    const ext = file.originalname.split('.').pop() || 'jpg'
    const fileName = `${crypto.randomUUID()}.${ext}`
    const filePath = `receipts/${req.userId}/${fileName}`

    const { error } = await supabaseAdmin.storage
      .from('receipts')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      })

    if (error) {
      res.status(500).json({ message: 'Erro ao fazer upload do comprovante' })
      return
    }

    res.json({ data: { path: filePath } })
  }
)
