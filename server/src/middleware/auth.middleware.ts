import type { Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from '../types/index.js'
import { supabaseAdmin } from '../services/supabase.js'

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Token de autenticacao ausente' })
    return
  }

  const token = authHeader.split(' ')[1]!

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) {
    res.status(401).json({ message: 'Token invalido ou expirado' })
    return
  }

  req.userId = user.id
  req.accessToken = token
  next()
}
