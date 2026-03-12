import { Router } from 'express'
import type { Response } from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { supabaseAdmin } from '../services/supabase.js'
import type { AuthenticatedRequest } from '../types/index.js'

export const profileRoutes = Router()

profileRoutes.use(authMiddleware)

profileRoutes.get('/me', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', req.userId!)
    .single()

  if (error) {
    res.status(500).json({ message: 'Erro ao buscar perfil' })
    return
  }

  res.json({ data })
})

profileRoutes.patch('/me', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { display_name, avatar_url, pix_key } = req.body

  const updates: Record<string, any> = {}
  if (display_name !== undefined) updates.display_name = display_name
  if (avatar_url !== undefined) updates.avatar_url = avatar_url
  if (pix_key !== undefined) updates.pix_key = pix_key

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', req.userId!)
    .select()
    .single()

  if (error) {
    res.status(500).json({ message: 'Erro ao atualizar perfil' })
    return
  }

  res.json({ data })
})
