import type { Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from '../types/index.js'
import { supabaseAdmin } from '../services/supabase.js'

export async function adminMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.userId

  if (!userId) {
    res.status(401).json({ message: 'Nao autenticado' })
    return
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single()

  if (!profile?.is_admin) {
    res.status(403).json({ message: 'Acesso restrito a administradores' })
    return
  }

  next()
}
