import { Router } from 'express'
import type { Response } from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { supabaseAdmin } from '../services/supabase.js'
import type { AuthenticatedRequest } from '../types/index.js'

export const dashboardRoutes = Router()

dashboardRoutes.use(authMiddleware)

dashboardRoutes.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!

    // Salas do usuario
    const { data: memberships } = await supabaseAdmin
      .from('room_members')
      .select('room_id, rooms(id, name, category, member_limit, status, image_url, owner_id)')
      .eq('user_id', userId)
      .is('removed_at', null)

    const roomIds = memberships?.map(m => m.room_id) || []

    // Se nao tem salas, retorna vazio
    if (roomIds.length === 0) {
      res.json({
        data: {
          total_owed: 0,
          total_receivable: 0,
          rooms: [],
          recent_debts: [],
          recent_credits: [],
        },
      })
      return
    }

    // Buscar expenses das salas do usuario
    const { data: activeExpenses } = await supabaseAdmin
      .from('expenses')
      .select('id')
      .in('room_id', roomIds)
      .eq('status', 'active')

    const expenseIds = activeExpenses?.map(e => e.id) || []

    // Splits pendentes do usuario (deve)
    let myDebts: any[] = []
    if (expenseIds.length > 0) {
      const { data } = await supabaseAdmin
        .from('expense_splits')
        .select(`
          amount, expense_id,
          expenses(description, room_id, created_by,
            profiles:created_by(display_name),
            rooms:room_id(name)
          )
        `)
        .eq('user_id', userId)
        .eq('is_paid', false)
        .in('expense_id', expenseIds)
      myDebts = data || []
    }

    // Splits onde o usuario e credor
    const { data: myCredits } = await supabaseAdmin
      .from('expense_splits')
      .select(`
        amount, user_id, expense_id,
        profiles:user_id(display_name),
        expenses!inner(description, room_id, created_by,
          rooms:room_id(name)
        )
      `)
      .eq('is_paid', false)
      .filter('expenses.created_by', 'eq', userId)
      .neq('user_id', userId)

    const totalOwed = myDebts.reduce((sum, d) => sum + Number(d.amount), 0)
    const totalReceivable = (myCredits || []).reduce((sum, c) => sum + Number(c.amount), 0)

    // Contar membros por sala
    const rooms = await Promise.all(
      (memberships || []).map(async (m) => {
        const room = m.rooms as any
        if (!room) return null

        const { count } = await supabaseAdmin
          .from('room_members')
          .select('id', { count: 'exact', head: true })
          .eq('room_id', m.room_id)
          .is('removed_at', null)

        return {
          id: room.id,
          name: room.name,
          category: room.category,
          member_count: count || 0,
          member_limit: room.member_limit || 10,
          status: room.status,
          image_url: room.image_url || null,
          owner_id: room.owner_id,
        }
      })
    )

    res.json({
      data: {
        total_owed: Math.round(totalOwed * 100) / 100,
        total_receivable: Math.round(totalReceivable * 100) / 100,
        rooms: rooms.filter(r => r && r.status === 'active'),
        recent_debts: myDebts.slice(0, 5).map(d => {
          const exp = d.expenses as any
          return {
            expense_id: d.expense_id,
            room_name: exp?.rooms?.name || 'Sala',
            description: exp?.description || '',
            amount: Number(d.amount),
            creditor_name: exp?.profiles?.display_name || 'Desconhecido',
          }
        }),
        recent_credits: (myCredits || []).slice(0, 5).map(c => {
          const exp = c.expenses as any
          const profile = c.profiles as any
          return {
            expense_id: c.expense_id,
            room_name: exp?.rooms?.name || 'Sala',
            description: exp?.description || '',
            amount: Number(c.amount),
            debtor_name: profile?.display_name || 'Desconhecido',
          }
        }),
      },
    })
  } catch (err) {
    console.error('Erro no dashboard:', err)
    res.status(500).json({ message: 'Erro ao carregar dashboard' })
  }
})
