import { Router } from 'express'
import type { Response } from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { roomMemberMiddleware, roomOwnerMiddleware } from '../middleware/room-access.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { createRoomSchema, updateRoomSchema } from '../validators/room.schema.js'
import { supabaseAdmin } from '../services/supabase.js'
import type { AuthenticatedRequest } from '../types/index.js'

export const roomRoutes = Router()

roomRoutes.use(authMiddleware)

// Listar salas do usuario
roomRoutes.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { data: memberships, error } = await supabaseAdmin
    .from('room_members')
    .select(`
      room_id,
      role,
      rooms (
        id, name, description, category, icon, owner_id,
        member_limit, status, created_at
      )
    `)
    .eq('user_id', req.userId!)
    .is('removed_at', null)

  if (error) {
    res.status(500).json({ message: 'Erro ao listar salas' })
    return
  }

  const rooms = memberships?.map(m => ({
    ...(m.rooms as any),
    my_role: m.role,
  })) || []

  res.json({ data: rooms })
})

// Criar sala
roomRoutes.post('/', validate(createRoomSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, description, category, member_limit } = req.body

  const { data: room, error } = await supabaseAdmin
    .from('rooms')
    .insert({
      name,
      description,
      category,
      member_limit,
      owner_id: req.userId!,
    })
    .select()
    .single()

  if (error) {
    res.status(500).json({ message: 'Erro ao criar sala' })
    return
  }

  // Adicionar criador como owner
  await supabaseAdmin.from('room_members').insert({
    room_id: room.id,
    user_id: req.userId!,
    role: 'owner',
  })

  // Log de atividade
  await supabaseAdmin.from('activity_log').insert({
    room_id: room.id,
    user_id: req.userId!,
    action: 'room_created',
  })

  res.status(201).json({ data: room })
})

// Detalhes da sala
roomRoutes.get('/:roomId', roomMemberMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { roomId } = req.params

  const [roomResult, membersResult] = await Promise.all([
    supabaseAdmin.from('rooms').select('*').eq('id', roomId!).single(),
    supabaseAdmin
      .from('room_members')
      .select('*, profiles(display_name, avatar_url, email)')
      .eq('room_id', roomId!)
      .is('removed_at', null),
  ])

  if (roomResult.error) {
    res.status(404).json({ message: 'Sala nao encontrada' })
    return
  }

  res.json({
    data: {
      ...roomResult.data,
      members: membersResult.data || [],
      member_count: membersResult.data?.length || 0,
    },
  })
})

// Atualizar sala
roomRoutes.patch('/:roomId', roomOwnerMiddleware, validate(updateRoomSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { data, error } = await supabaseAdmin
    .from('rooms')
    .update(req.body)
    .eq('id', req.params.roomId!)
    .select()
    .single()

  if (error) {
    res.status(500).json({ message: 'Erro ao atualizar sala' })
    return
  }

  const io = req.app.get('io')
  io.to(`room:${req.params.roomId}`).emit('room_updated', { room: data })

  res.json({ data })
})

// Arquivar sala (soft delete)
roomRoutes.delete('/:roomId', roomOwnerMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { error } = await supabaseAdmin
    .from('rooms')
    .update({ status: 'archived' })
    .eq('id', req.params.roomId!)

  if (error) {
    res.status(500).json({ message: 'Erro ao arquivar sala' })
    return
  }

  res.json({ message: 'Sala arquivada com sucesso' })
})

// Listar membros
roomRoutes.get('/:roomId/members', roomMemberMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { data, error } = await supabaseAdmin
    .from('room_members')
    .select('*, profiles(display_name, avatar_url, email)')
    .eq('room_id', req.params.roomId!)
    .is('removed_at', null)

  if (error) {
    res.status(500).json({ message: 'Erro ao listar membros' })
    return
  }

  res.json({ data })
})

// Remover membro
roomRoutes.delete('/:roomId/members/:userId', roomOwnerMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { roomId, userId } = req.params

  // Nao pode remover o owner
  const { data: member } = await supabaseAdmin
    .from('room_members')
    .select('role')
    .eq('room_id', roomId!)
    .eq('user_id', userId!)
    .is('removed_at', null)
    .single()

  if (member?.role === 'owner') {
    res.status(400).json({ message: 'Nao e possivel remover o criador da sala' })
    return
  }

  await supabaseAdmin
    .from('room_members')
    .update({ removed_at: new Date().toISOString() })
    .eq('room_id', roomId!)
    .eq('user_id', userId!)

  const io = req.app.get('io')
  io.to(`room:${roomId}`).emit('member_removed', { userId })

  res.json({ message: 'Membro removido com sucesso' })
})

// Sair da sala
roomRoutes.post('/:roomId/leave', roomMemberMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { roomId } = req.params

  // Owner nao pode sair
  const { data: member } = await supabaseAdmin
    .from('room_members')
    .select('role')
    .eq('room_id', roomId!)
    .eq('user_id', req.userId!)
    .is('removed_at', null)
    .single()

  if (member?.role === 'owner') {
    res.status(400).json({ message: 'O criador nao pode sair da sala. Arquive-a ou transfira a propriedade.' })
    return
  }

  await supabaseAdmin
    .from('room_members')
    .update({ removed_at: new Date().toISOString() })
    .eq('room_id', roomId!)
    .eq('user_id', req.userId!)

  res.json({ message: 'Voce saiu da sala' })
})
