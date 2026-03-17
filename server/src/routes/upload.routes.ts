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

// Upload comprovante
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

// Upload avatar do usuario
uploadRoutes.post(
  '/avatar',
  uploadLimiter,
  uploadMiddleware.single('avatar'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const file = req.file
    if (!file) {
      res.status(400).json({ message: 'Arquivo obrigatorio' })
      return
    }

    if (!file.mimetype.startsWith('image/')) {
      res.status(400).json({ message: 'Apenas imagens sao permitidas' })
      return
    }

    const ext = file.originalname.split('.').pop() || 'jpg'
    const fileName = `${crypto.randomUUID()}.${ext}`
    const filePath = `avatars/${req.userId}/${fileName}`

    const { error } = await supabaseAdmin.storage
      .from('receipts')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      })

    if (error) {
      console.error('Erro upload avatar:', error)
      res.status(500).json({ message: 'Erro ao fazer upload da foto' })
      return
    }

    // Gerar URL publica
    const { data: urlData } = supabaseAdmin.storage
      .from('receipts')
      .getPublicUrl(filePath)

    // Atualizar perfil com a URL do avatar
    await supabaseAdmin
      .from('profiles')
      .update({ avatar_url: urlData.publicUrl })
      .eq('id', req.userId!)

    res.json({ data: { url: urlData.publicUrl } })
  }
)

// Upload imagem da sala
uploadRoutes.post(
  '/room-image',
  uploadLimiter,
  uploadMiddleware.single('image'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const file = req.file
    if (!file) {
      res.status(400).json({ message: 'Arquivo obrigatorio' })
      return
    }

    if (!file.mimetype.startsWith('image/')) {
      res.status(400).json({ message: 'Apenas imagens sao permitidas' })
      return
    }

    const ext = file.originalname.split('.').pop() || 'jpg'
    const fileName = `${crypto.randomUUID()}.${ext}`
    const filePath = `rooms/${req.body.room_id || 'temp'}/${fileName}`

    const { error } = await supabaseAdmin.storage
      .from('receipts')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      })

    if (error) {
      console.error('Erro upload room image:', error)
      res.status(500).json({ message: 'Erro ao fazer upload da imagem' })
      return
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('receipts')
      .getPublicUrl(filePath)

    res.json({ data: { url: urlData.publicUrl } })
  }
)
