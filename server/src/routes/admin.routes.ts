import { Router } from 'express'
import type { Response } from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { adminMiddleware } from '../middleware/admin.middleware.js'
import { supabaseAdmin } from '../services/supabase.js'
import { getOnlineUsers, getOnlineCount } from '../socket/index.js'
import type { AuthenticatedRequest } from '../types/index.js'

export const adminRoutes = Router()

adminRoutes.use(authMiddleware)
adminRoutes.use(adminMiddleware)

// Estatisticas gerais da plataforma
adminRoutes.get('/stats', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [
      { count: totalUsers },
      { count: totalRooms },
      { count: activeRooms },
      { count: totalExpenses },
      { count: totalSplitsUnpaid },
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('rooms').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('rooms').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabaseAdmin.from('expenses').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabaseAdmin.from('expense_splits').select('id', { count: 'exact', head: true }).eq('is_paid', false),
    ])

    // Calcular total pendente
    const { data: unpaidSplits } = await supabaseAdmin
      .from('expense_splits')
      .select('amount')
      .eq('is_paid', false)

    const totalPending = (unpaidSplits || []).reduce((sum, s) => sum + Number(s.amount), 0)

    res.json({
      data: {
        total_users: totalUsers || 0,
        online_users: getOnlineCount(),
        online_user_ids: getOnlineUsers(),
        total_rooms: totalRooms || 0,
        active_rooms: activeRooms || 0,
        total_expenses: totalExpenses || 0,
        unpaid_splits: totalSplitsUnpaid || 0,
        total_pending: Math.round(totalPending * 100) / 100,
      },
    })
  } catch (err) {
    console.error('Erro admin stats:', err)
    res.status(500).json({ message: 'Erro ao carregar estatisticas' })
  }
})

// Listar todos os usuarios
adminRoutes.get('/users', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    res.status(500).json({ message: 'Erro ao listar usuarios' })
    return
  }

  // Enriquecer com contagens
  const onlineIds = new Set(getOnlineUsers())
  const enriched = await Promise.all(
    (data || []).map(async (user) => {
      const [
        { count: roomCount },
        { count: expenseCount },
      ] = await Promise.all([
        supabaseAdmin.from('room_members').select('id', { count: 'exact', head: true })
          .eq('user_id', user.id).is('removed_at', null),
        supabaseAdmin.from('expenses').select('id', { count: 'exact', head: true })
          .eq('created_by', user.id).eq('status', 'active'),
      ])

      // Calcular saldo
      const { data: debts } = await supabaseAdmin
        .from('expense_splits')
        .select('amount')
        .eq('user_id', user.id)
        .eq('is_paid', false)

      const totalOwed = (debts || []).reduce((sum, d) => sum + Number(d.amount), 0)

      return {
        ...user,
        is_online: onlineIds.has(user.id),
        room_count: roomCount || 0,
        expense_count: expenseCount || 0,
        total_owed: Math.round(totalOwed * 100) / 100,
      }
    })
  )

  res.json({ data: enriched })
})

// Listar todas as salas
adminRoutes.get('/rooms', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { data, error } = await supabaseAdmin
    .from('rooms')
    .select('*, profiles:owner_id(display_name, email)')
    .order('created_at', { ascending: false })

  if (error) {
    res.status(500).json({ message: 'Erro ao listar salas' })
    return
  }

  // Contar membros e despesas
  const enriched = await Promise.all(
    (data || []).map(async (room) => {
      const [
        { count: memberCount },
        { count: expenseCount },
      ] = await Promise.all([
        supabaseAdmin.from('room_members').select('id', { count: 'exact', head: true })
          .eq('room_id', room.id).is('removed_at', null),
        supabaseAdmin.from('expenses').select('id', { count: 'exact', head: true })
          .eq('room_id', room.id).eq('status', 'active'),
      ])

      return {
        ...room,
        member_count: memberCount || 0,
        expense_count: expenseCount || 0,
      }
    })
  )

  res.json({ data: enriched })
})

// Deletar sala (admin pode deletar qualquer sala)
adminRoutes.delete('/rooms/:roomId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { roomId } = req.params

  // Verificar se sala existe
  const { data: room } = await supabaseAdmin
    .from('rooms')
    .select('id, name')
    .eq('id', roomId!)
    .single()

  if (!room) {
    res.status(404).json({ message: 'Sala nao encontrada' })
    return
  }

  // Arquivar (soft delete)
  const { error } = await supabaseAdmin
    .from('rooms')
    .update({ status: 'archived' })
    .eq('id', roomId!)

  if (error) {
    res.status(500).json({ message: 'Erro ao arquivar sala' })
    return
  }

  // Log
  await supabaseAdmin.from('activity_log').insert({
    room_id: roomId!,
    user_id: req.userId!,
    action: 'room_archived_by_admin',
    metadata: { admin_id: req.userId },
  })

  const io = req.app.get('io')
  io.to(`room:${roomId}`).emit('room_updated', { room: { ...room, status: 'archived' } })

  res.json({ message: `Sala "${room.name}" arquivada com sucesso` })
})

// Hard delete sala (remove completamente)
adminRoutes.delete('/rooms/:roomId/permanent', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { roomId } = req.params

  const { data: room } = await supabaseAdmin
    .from('rooms')
    .select('id, name')
    .eq('id', roomId!)
    .single()

  if (!room) {
    res.status(404).json({ message: 'Sala nao encontrada' })
    return
  }

  // Deletar em cascata (FK ON DELETE CASCADE cuida do resto)
  const { error } = await supabaseAdmin
    .from('rooms')
    .delete()
    .eq('id', roomId!)

  if (error) {
    console.error('Erro ao deletar sala:', error)
    res.status(500).json({ message: 'Erro ao deletar sala' })
    return
  }

  res.json({ message: `Sala "${room.name}" deletada permanentemente` })
})

// Zerar saldos de um usuario (marcar todas as dividas como pagas)
adminRoutes.post('/users/:userId/reset-balance', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { userId } = req.params

  // Marcar todos os splits nao pagos do usuario como pagos
  const { error: debtError, count: debtCount } = await supabaseAdmin
    .from('expense_splits')
    .update({
      is_paid: true,
      paid_at: new Date().toISOString(),
      marked_paid_by: req.userId!,
    })
    .eq('user_id', userId!)
    .eq('is_paid', false)

  if (debtError) {
    res.status(500).json({ message: 'Erro ao zerar dividas' })
    return
  }

  // Marcar todos os splits onde este usuario e credor como pagos
  const { data: userExpenses } = await supabaseAdmin
    .from('expenses')
    .select('id')
    .eq('created_by', userId!)
    .eq('status', 'active')

  let creditCount = 0
  if (userExpenses && userExpenses.length > 0) {
    const expenseIds = userExpenses.map(e => e.id)
    const { count, error: creditError } = await supabaseAdmin
      .from('expense_splits')
      .update({
        is_paid: true,
        paid_at: new Date().toISOString(),
        marked_paid_by: req.userId!,
      })
      .in('expense_id', expenseIds)
      .eq('is_paid', false)

    if (creditError) {
      res.status(500).json({ message: 'Erro ao zerar creditos' })
      return
    }
    creditCount = count || 0
  }

  res.json({
    message: 'Saldos zerados com sucesso',
    data: {
      debts_cleared: debtCount || 0,
      credits_cleared: creditCount,
    },
  })
})

// Promover/remover admin
adminRoutes.patch('/users/:userId/admin', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { userId } = req.params
  const { is_admin } = req.body

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ is_admin: !!is_admin })
    .eq('id', userId!)

  if (error) {
    res.status(500).json({ message: 'Erro ao atualizar permissao' })
    return
  }

  res.json({ message: is_admin ? 'Usuario promovido a admin' : 'Permissao de admin removida' })
})

// Atividade recente da plataforma
adminRoutes.get('/activity', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { data, error } = await supabaseAdmin
    .from('activity_log')
    .select('*, profiles:user_id(display_name), rooms:room_id(name)')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    res.status(500).json({ message: 'Erro ao carregar atividades' })
    return
  }

  res.json({ data: data || [] })
})
