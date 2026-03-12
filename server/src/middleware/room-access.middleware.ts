import type { Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from '../types/index.js'
import { supabaseAdmin } from '../services/supabase.js'

export async function roomMemberMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const roomId = req.params.roomId
  const userId = req.userId

  if (!roomId || !userId) {
    res.status(400).json({ message: 'Sala ou usuario nao identificado' })
    return
  }

  const { data: member } = await supabaseAdmin
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .is('removed_at', null)
    .single()

  if (!member) {
    res.status(403).json({ message: 'Voce nao e membro desta sala' })
    return
  }

  (req as any).memberRole = member.role
  next()
}

export async function roomOwnerMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const roomId = req.params.roomId
  const userId = req.userId

  if (!roomId || !userId) {
    res.status(400).json({ message: 'Sala ou usuario nao identificado' })
    return
  }

  const { data: member } = await supabaseAdmin
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .is('removed_at', null)
    .single()

  if (!member || !['owner', 'admin'].includes(member.role)) {
    res.status(403).json({ message: 'Apenas o criador ou admin pode realizar esta acao' })
    return
  }

  (req as any).memberRole = member.role
  next()
}
