import { Router } from 'express'
import type { Request, Response } from 'express'
import crypto from 'crypto'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { inviteLimiter } from '../middleware/rate-limiter.middleware.js'
import { createInviteSchema } from '../validators/invite.schema.js'
import { supabaseAdmin } from '../services/supabase.js'
import type { AuthenticatedRequest } from '../types/index.js'

export const inviteRoutes = Router()

// Info publica do convite (nao precisa auth)
inviteRoutes.get('/:token', async (req: Request, res: Response): Promise<void> => {
  const { token } = req.params

  const { data: invite } = await supabaseAdmin
    .from('invite_links')
    .select('*, rooms(name, category, member_limit)')
    .eq('token', token!)
    .eq('is_revoked', false)
    .single()

  if (!invite) {
    res.status(404).json({ message: 'Convite nao encontrado', is_valid: false })
    return
  }

  if (new Date(invite.expires_at) < new Date()) {
    res.json({ is_valid: false, reason: 'Convite expirado' })
    return
  }

  // Contar membros atuais
  const { count } = await supabaseAdmin
    .from('room_members')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', invite.room_id)
    .is('removed_at', null)

  const room = invite.rooms as any

  res.json({
    data: {
      room_name: room.name,
      room_category: room.category,
      member_count: count || 0,
      member_limit: room.member_limit,
      is_valid: true,
    },
  })
})

// Aceitar convite
inviteRoutes.post('/:token/join', authMiddleware, inviteLimiter, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { token } = req.params

  const { data: invite } = await supabaseAdmin
    .from('invite_links')
    .select('*, rooms(member_limit)')
    .eq('token', token!)
    .eq('is_revoked', false)
    .single()

  if (!invite) {
    res.status(404).json({ message: 'Convite nao encontrado' })
    return
  }

  if (new Date(invite.expires_at) < new Date()) {
    res.status(400).json({ message: 'Convite expirado' })
    return
  }

  // Verificar se ja e membro
  const { data: existing } = await supabaseAdmin
    .from('room_members')
    .select('id, removed_at')
    .eq('room_id', invite.room_id)
    .eq('user_id', req.userId!)
    .single()

  if (existing && !existing.removed_at) {
    res.status(400).json({ message: 'Voce ja e membro desta sala' })
    return
  }

  // Verificar limite
  const { count } = await supabaseAdmin
    .from('room_members')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', invite.room_id)
    .is('removed_at', null)

  const room = invite.rooms as any
  if ((count || 0) >= room.member_limit) {
    res.status(400).json({ message: 'Sala lotada' })
    return
  }

  // Verificar max uses
  if (invite.max_uses && invite.use_count >= invite.max_uses) {
    res.status(400).json({ message: 'Limite de usos do convite atingido' })
    return
  }

  // Garantir que o perfil existe antes de adicionar como membro
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', req.userId!)
    .single()

  if (!existingProfile) {
    const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(req.userId!)
    await supabaseAdmin.from('profiles').insert({
      id: req.userId!,
      email: authUser?.email || 'unknown',
      display_name: authUser?.user_metadata?.display_name || authUser?.email?.split('@')[0] || 'Usuário',
    })
  }

  // Adicionar membro (ou reativar)
  if (existing?.removed_at) {
    await supabaseAdmin
      .from('room_members')
      .update({ removed_at: null, role: 'member', joined_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await supabaseAdmin.from('room_members').insert({
      room_id: invite.room_id,
      user_id: req.userId!,
      role: 'member',
    })
  }

  // Incrementar uso do convite
  await supabaseAdmin
    .from('invite_links')
    .update({ use_count: invite.use_count + 1 })
    .eq('id', invite.id)

  // Log
  await supabaseAdmin.from('activity_log').insert({
    room_id: invite.room_id,
    user_id: req.userId!,
    action: 'member_joined',
  })

  // Emit real-time
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', req.userId!)
    .single()

  const io = req.app.get('io')
  io.to(`room:${invite.room_id}`).emit('member_joined', {
    member: {
      user_id: req.userId,
      role: 'member',
      profile,
    },
  })

  res.json({ data: { room_id: invite.room_id }, message: 'Voce entrou na sala!' })
})

// Rotas que precisam de auth + ser admin da sala
const roomInviteRoutes = Router({ mergeParams: true })

// Gerar link de convite
roomInviteRoutes.post('/', validate(createInviteSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { roomId } = req.params
  const { max_uses, expires_hours } = req.body

  const token = crypto.randomUUID()

  const { data, error } = await supabaseAdmin
    .from('invite_links')
    .insert({
      room_id: roomId!,
      token,
      created_by: req.userId!,
      expires_at: new Date(Date.now() + (expires_hours || 72) * 60 * 60 * 1000).toISOString(),
      max_uses: max_uses || null,
    })
    .select()
    .single()

  if (error) {
    res.status(500).json({ message: 'Erro ao gerar convite' })
    return
  }

  res.status(201).json({ data })
})

// Listar convites ativos
roomInviteRoutes.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { data, error } = await supabaseAdmin
    .from('invite_links')
    .select('*')
    .eq('room_id', req.params.roomId!)
    .eq('is_revoked', false)
    .order('created_at', { ascending: false })

  if (error) {
    res.status(500).json({ message: 'Erro ao listar convites' })
    return
  }

  res.json({ data })
})

// Revogar convite
roomInviteRoutes.delete('/:inviteId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { error } = await supabaseAdmin
    .from('invite_links')
    .update({ is_revoked: true })
    .eq('id', req.params.inviteId!)
    .eq('room_id', req.params.roomId!)

  if (error) {
    res.status(500).json({ message: 'Erro ao revogar convite' })
    return
  }

  res.json({ message: 'Convite revogado' })
})

// Mount room invite routes on rooms router (will be done in rooms.routes.ts via import)
// Export for mounting: app.use('/api/rooms/:roomId/invites', authMiddleware, roomOwnerMiddleware, roomInviteRoutes)
export { roomInviteRoutes }
