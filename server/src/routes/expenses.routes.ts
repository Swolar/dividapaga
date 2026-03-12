import { Router } from 'express'
import type { Response } from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { roomMemberMiddleware, roomOwnerMiddleware } from '../middleware/room-access.middleware.js'
import { supabaseAdmin } from '../services/supabase.js'
import { splitEqual, splitByItem, splitManual } from '../services/splits.service.js'
import type { AuthenticatedRequest } from '../types/index.js'

export const expenseRoutes = Router()

expenseRoutes.use(authMiddleware)

// Listar despesas da sala
expenseRoutes.get('/:roomId/expenses', roomMemberMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { data, error } = await supabaseAdmin
    .from('expenses')
    .select(`
      *,
      profiles:created_by(display_name, avatar_url),
      expense_splits(id, user_id, amount, is_paid, paid_at,
        profiles:user_id(display_name, avatar_url)
      )
    `)
    .eq('room_id', req.params.roomId!)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    res.status(500).json({ message: 'Erro ao listar despesas' })
    return
  }

  res.json({ data })
})

// Criar despesa
expenseRoutes.post('/:roomId/expenses', roomMemberMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { roomId } = req.params
  const { description, total_amount, split_type, receipt_url, participants, items, manual_splits } = req.body

  if (!receipt_url) {
    res.status(400).json({ message: 'Comprovante obrigatorio' })
    return
  }

  // Criar despesa
  const { data: expense, error } = await supabaseAdmin
    .from('expenses')
    .insert({
      room_id: roomId!,
      created_by: req.userId!,
      description,
      total_amount,
      split_type,
      receipt_url,
    })
    .select()
    .single()

  if (error) {
    res.status(500).json({ message: 'Erro ao criar despesa' })
    return
  }

  // Calcular splits
  let splits: { user_id: string; amount: number }[]

  try {
    switch (split_type) {
      case 'equal':
        splits = splitEqual(total_amount, participants, req.userId!)
        break
      case 'by_item':
        splits = await splitByItem(expense.id, items || [], supabaseAdmin)
        break
      case 'manual':
        splits = splitManual(total_amount, manual_splits || [])
        break
      default:
        res.status(400).json({ message: 'Tipo de divisao invalido' })
        return
    }
  } catch (err: any) {
    // Rollback expense
    await supabaseAdmin.from('expenses').delete().eq('id', expense.id)
    res.status(400).json({ message: err.message })
    return
  }

  // Inserir splits
  const { error: splitError } = await supabaseAdmin
    .from('expense_splits')
    .insert(splits.map(s => ({
      expense_id: expense.id,
      user_id: s.user_id,
      amount: s.amount,
    })))

  if (splitError) {
    await supabaseAdmin.from('expenses').delete().eq('id', expense.id)
    res.status(500).json({ message: 'Erro ao criar divisoes' })
    return
  }

  // Log
  await supabaseAdmin.from('activity_log').insert({
    room_id: roomId!,
    user_id: req.userId!,
    action: 'expense_created',
    metadata: { expense_id: expense.id, total_amount },
  })

  // Emit real-time
  const io = req.app.get('io')
  io.to(`room:${roomId}`).emit('expense_created', { expense, splits })

  res.status(201).json({ data: { expense, splits } })
})

// Detalhe da despesa
expenseRoutes.get('/:roomId/expenses/:expenseId', roomMemberMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { data, error } = await supabaseAdmin
    .from('expenses')
    .select(`
      *,
      profiles:created_by(display_name, avatar_url),
      expense_items(*, expense_item_consumers(user_id, profiles:user_id(display_name))),
      expense_splits(*, profiles:user_id(display_name, avatar_url))
    `)
    .eq('id', req.params.expenseId!)
    .eq('room_id', req.params.roomId!)
    .single()

  if (error) {
    res.status(404).json({ message: 'Despesa nao encontrada' })
    return
  }

  res.json({ data })
})

// Soft delete despesa
expenseRoutes.delete('/:roomId/expenses/:expenseId', roomMemberMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { data: expense } = await supabaseAdmin
    .from('expenses')
    .select('created_by')
    .eq('id', req.params.expenseId!)
    .single()

  const memberRole = (req as any).memberRole
  if (expense?.created_by !== req.userId && !['owner', 'admin'].includes(memberRole)) {
    res.status(403).json({ message: 'Sem permissao para deletar esta despesa' })
    return
  }

  await supabaseAdmin
    .from('expenses')
    .update({ status: 'deleted' })
    .eq('id', req.params.expenseId!)

  const io = req.app.get('io')
  io.to(`room:${req.params.roomId}`).emit('expense_deleted', { expenseId: req.params.expenseId })

  res.json({ message: 'Despesa removida' })
})

// Marcar pagamento
expenseRoutes.patch('/:roomId/expenses/:expenseId/splits/:splitId', roomOwnerMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { is_paid } = req.body

  const { data, error } = await supabaseAdmin
    .from('expense_splits')
    .update({
      is_paid,
      paid_at: is_paid ? new Date().toISOString() : null,
      marked_paid_by: is_paid ? req.userId! : null,
    })
    .eq('id', req.params.splitId!)
    .eq('expense_id', req.params.expenseId!)
    .select()
    .single()

  if (error) {
    res.status(500).json({ message: 'Erro ao atualizar pagamento' })
    return
  }

  // Log
  await supabaseAdmin.from('activity_log').insert({
    room_id: req.params.roomId!,
    user_id: req.userId!,
    action: 'payment_marked',
    metadata: { split_id: req.params.splitId, is_paid },
  })

  const io = req.app.get('io')
  io.to(`room:${req.params.roomId}`).emit('payment_updated', {
    splitId: req.params.splitId,
    isPaid: is_paid,
    markedBy: req.userId,
  })

  res.json({ data })
})

// Balancos da sala
expenseRoutes.get('/:roomId/balances', roomMemberMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { roomId } = req.params

  const { data: members } = await supabaseAdmin
    .from('room_members')
    .select('user_id, profiles(display_name, avatar_url)')
    .eq('room_id', roomId!)
    .is('removed_at', null)

  const { data: expenses } = await supabaseAdmin
    .from('expenses')
    .select('id, created_by, total_amount, expense_splits(user_id, amount, is_paid)')
    .eq('room_id', roomId!)
    .eq('status', 'active')

  const balances = (members || []).map(m => {
    const profile = m.profiles as any
    let totalOwed = 0
    let totalReceivable = 0

    for (const exp of expenses || []) {
      for (const split of (exp as any).expense_splits || []) {
        if (split.user_id === m.user_id && !split.is_paid) {
          totalOwed += Number(split.amount)
        }
        if (exp.created_by === m.user_id && split.user_id !== m.user_id && !split.is_paid) {
          totalReceivable += Number(split.amount)
        }
      }
    }

    return {
      user_id: m.user_id,
      display_name: profile?.display_name,
      avatar_url: profile?.avatar_url,
      total_owed: Math.round(totalOwed * 100) / 100,
      total_receivable: Math.round(totalReceivable * 100) / 100,
      net_balance: Math.round((totalReceivable - totalOwed) * 100) / 100,
    }
  })

  res.json({ data: balances })
})
