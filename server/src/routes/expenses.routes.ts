import { Router } from 'express'
import type { Response } from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { roomMemberMiddleware } from '../middleware/room-access.middleware.js'
import { supabaseAdmin } from '../services/supabase.js'
import { splitEqual, splitByItem, splitManual, type SplitResult } from '../services/splits.service.js'
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
      expense_splits(id, user_id, guest_name, amount, is_paid, paid_at,
        profiles:user_id(display_name, avatar_url)
      )
    `)
    .eq('room_id', req.params.roomId!)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao listar despesas:', error)
    res.status(500).json({ message: error.message || 'Erro ao listar despesas' })
    return
  }

  res.json({ data })
})

// Criar despesa
expenseRoutes.post('/:roomId/expenses', roomMemberMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { roomId } = req.params
  const { description, total_amount, split_type, receipt_url, participants, items, manual_splits, guest_names } = req.body

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
    console.error('Erro ao criar despesa:', error)
    res.status(500).json({ message: error.message || 'Erro ao criar despesa' })
    return
  }

  // Calcular splits
  let splits: SplitResult[]

  try {
    switch (split_type) {
      case 'equal':
        splits = splitEqual(total_amount, participants, req.userId!, guest_names || [])
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
      user_id: s.user_id || null,
      guest_name: s.guest_name || null,
      amount: s.amount,
    })))

  if (splitError) {
    console.error('Erro ao criar divisoes:', splitError)
    await supabaseAdmin.from('expenses').delete().eq('id', expense.id)
    res.status(500).json({ message: splitError.message || 'Erro ao criar divisoes' })
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
      expense_splits(*, guest_name, profiles:user_id(display_name, avatar_url))
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

// Marcar pagamento (apenas criador da despesa pode marcar)
expenseRoutes.patch('/:roomId/expenses/:expenseId/splits/:splitId', roomMemberMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { is_paid } = req.body

  // Verificar se o usuario e o criador da despesa
  const { data: expense } = await supabaseAdmin
    .from('expenses')
    .select('created_by')
    .eq('id', req.params.expenseId!)
    .single()

  if (!expense || expense.created_by !== req.userId) {
    res.status(403).json({ message: 'Apenas o criador da despesa pode marcar pagamentos' })
    return
  }

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

// Enviar solicitacao de pagamento (membro envia comprovante para o criador da despesa)
expenseRoutes.post('/:roomId/expenses/:expenseId/payment-requests', roomMemberMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { split_id, proof_url } = req.body

  if (!proof_url) {
    res.status(400).json({ message: 'Comprovante obrigatorio' })
    return
  }

  // Verificar se o split pertence a este usuario
  const { data: split } = await supabaseAdmin
    .from('expense_splits')
    .select('user_id, is_paid')
    .eq('id', split_id)
    .eq('expense_id', req.params.expenseId!)
    .single()

  if (!split || split.user_id !== req.userId) {
    res.status(403).json({ message: 'Voce so pode solicitar pagamento da sua propria divida' })
    return
  }

  if (split.is_paid) {
    res.status(400).json({ message: 'Esta divida ja foi marcada como paga' })
    return
  }

  // Verificar se ja existe request pendente
  const { data: existingRequest } = await supabaseAdmin
    .from('payment_requests')
    .select('id')
    .eq('split_id', split_id)
    .eq('status', 'pending')
    .single()

  if (existingRequest) {
    res.status(400).json({ message: 'Ja existe uma solicitacao pendente para esta divida' })
    return
  }

  // Criar request
  const { data: request, error } = await supabaseAdmin
    .from('payment_requests')
    .insert({
      split_id,
      expense_id: req.params.expenseId!,
      room_id: req.params.roomId!,
      requester_id: req.userId!,
      proof_url,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar solicitacao:', error)
    res.status(500).json({ message: 'Erro ao enviar solicitacao' })
    return
  }

  // Notificar via socket
  const io = req.app.get('io')
  io.to(`room:${req.params.roomId}`).emit('payment_request_created', { request })

  res.status(201).json({ data: request })
})

// Listar solicitacoes de pagamento da sala
expenseRoutes.get('/:roomId/payment-requests', roomMemberMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  // Fetch payment requests with requester profile
  const { data: requests, error } = await supabaseAdmin
    .from('payment_requests')
    .select('*, profiles:requester_id(display_name, avatar_url)')
    .eq('room_id', req.params.roomId!)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao listar solicitacoes:', error)
    res.status(500).json({ message: 'Erro ao listar solicitacoes' })
    return
  }

  // Enrich each request with split amount and expense info
  const enriched = await Promise.all(
    (requests || []).map(async (req) => {
      const { data: split } = await supabaseAdmin
        .from('expense_splits')
        .select('amount')
        .eq('id', req.split_id)
        .single()

      const { data: expense } = await supabaseAdmin
        .from('expenses')
        .select('description, created_by')
        .eq('id', req.expense_id)
        .single()

      return {
        ...req,
        expense_splits: {
          amount: split?.amount || 0,
          expenses: {
            description: expense?.description || '',
            created_by: expense?.created_by || '',
          },
        },
      }
    })
  )

  res.json({ data: enriched })
})

// Aprovar ou rejeitar solicitacao de pagamento
expenseRoutes.patch('/:roomId/payment-requests/:requestId', roomMemberMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { status: newStatus } = req.body // 'approved' ou 'rejected'

  if (!['approved', 'rejected'].includes(newStatus)) {
    res.status(400).json({ message: 'Status invalido. Use approved ou rejected' })
    return
  }

  // Buscar a solicitacao
  const { data: request } = await supabaseAdmin
    .from('payment_requests')
    .select('*')
    .eq('id', req.params.requestId!)
    .single()

  if (!request) {
    res.status(404).json({ message: 'Solicitacao nao encontrada' })
    return
  }

  // Buscar o criador da despesa
  const { data: expense } = await supabaseAdmin
    .from('expenses')
    .select('created_by')
    .eq('id', request.expense_id)
    .single()

  // Verificar se o usuario e o criador da despesa
  const expenseCreator = expense?.created_by
  if (expenseCreator !== req.userId) {
    res.status(403).json({ message: 'Apenas o criador da despesa pode aprovar ou rejeitar' })
    return
  }

  // Atualizar status da solicitacao
  const { error: updateError } = await supabaseAdmin
    .from('payment_requests')
    .update({
      status: newStatus,
      reviewed_by: req.userId!,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', req.params.requestId!)

  if (updateError) {
    res.status(500).json({ message: 'Erro ao atualizar solicitacao' })
    return
  }

  // Se aprovado, marcar split como pago
  if (newStatus === 'approved') {
    await supabaseAdmin
      .from('expense_splits')
      .update({
        is_paid: true,
        paid_at: new Date().toISOString(),
        marked_paid_by: req.userId!,
        payment_proof_url: request.proof_url,
      })
      .eq('id', request.split_id)

    // Log
    await supabaseAdmin.from('activity_log').insert({
      room_id: req.params.roomId!,
      user_id: req.userId!,
      action: 'payment_approved',
      metadata: { request_id: req.params.requestId, split_id: request.split_id },
    })
  }

  // Notificar via socket
  const io = req.app.get('io')
  io.to(`room:${req.params.roomId}`).emit('payment_request_updated', {
    requestId: req.params.requestId,
    status: newStatus,
  })
  if (newStatus === 'approved') {
    io.to(`room:${req.params.roomId}`).emit('payment_updated', {
      splitId: request.split_id,
      isPaid: true,
      markedBy: req.userId,
    })
  }

  res.json({ message: newStatus === 'approved' ? 'Pagamento aprovado' : 'Pagamento rejeitado' })
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
        if (!split.user_id) continue // Skip guest splits
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
      display_name: profile?.display_name || 'Usuário',
      avatar_url: profile?.avatar_url || null,
      total_owed: Math.round(totalOwed * 100) / 100,
      total_receivable: Math.round(totalReceivable * 100) / 100,
      net_balance: Math.round((totalReceivable - totalOwed) * 100) / 100,
    }
  })

  res.json({ data: balances })
})
