import {
  DEMO_USER,
  DEMO_ROOMS,
  DEMO_ROOM_MEMBERS,
  DEMO_EXPENSES,
  DEMO_BALANCES,
  DEMO_DASHBOARD,
  DEMO_MEMBERS,
} from './mock-data'

// Simulated delay for realism
const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

// Mutable state for demo
let rooms: any[] = []
let expenses: Record<string, any[]> = {}
let nextExpId = 100
let isNewUser = true

interface RequestOptions {
  method?: string
  body?: unknown
}

export async function mockApi<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body } = options
  await delay(300 + Math.random() * 400)

  // Auth routes
  if (endpoint === '/auth/signup' && method === 'POST') {
    const b = body as any
    const user = {
      id: `user-${Date.now()}`,
      display_name: b?.display_name || 'Novo Usuario',
      email: b?.email || 'novo@email.com',
      avatar_url: null,
      pix_key: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    isNewUser = true
    rooms = []
    expenses = {}
    localStorage.setItem('demo_user', JSON.stringify(user))
    return { data: { session: { access_token: 'demo-token', refresh_token: 'demo-refresh' }, user } } as T
  }

  if (endpoint === '/auth/login' && method === 'POST') {
    const b = body as any
    // Login com conta demo pre-populada
    if (b?.email === 'demo@demo.com') {
      isNewUser = false
      rooms = [...DEMO_ROOMS]
      expenses = JSON.parse(JSON.stringify(DEMO_EXPENSES))
      return { data: { session: { access_token: 'demo-token', refresh_token: 'demo-refresh' }, user: DEMO_USER } } as T
    }
    // Login normal - manter estado vazio
    const stored = localStorage.getItem('demo_user')
    const user = stored ? JSON.parse(stored) : DEMO_USER
    return { data: { session: { access_token: 'demo-token', refresh_token: 'demo-refresh' }, user } } as T
  }

  if (endpoint === '/auth/me') {
    const stored = localStorage.getItem('demo_user')
    const user = stored ? JSON.parse(stored) : DEMO_USER
    return { data: user } as T
  }

  if (endpoint === '/auth/logout' && method === 'POST') {
    return { message: 'Logout realizado com sucesso' } as T
  }

  // Profile
  if (endpoint === '/profiles/me' && method === 'GET') {
    const stored = localStorage.getItem('demo_user')
    return { data: stored ? JSON.parse(stored) : DEMO_USER } as T
  }

  if (endpoint === '/profiles/me' && method === 'PATCH') {
    const b = body as any
    const stored = localStorage.getItem('demo_user')
    const user = stored ? JSON.parse(stored) : { ...DEMO_USER }
    if (b?.display_name) user.display_name = b.display_name
    if (b?.pix_key !== undefined) user.pix_key = b.pix_key
    localStorage.setItem('demo_user', JSON.stringify(user))
    return { data: user } as T
  }

  // Dashboard
  if (endpoint === '/dashboard') {
    if (isNewUser || rooms.length === 0) {
      return { data: {
        total_owed: 0,
        total_receivable: 0,
        rooms: [],
        recent_debts: [],
        recent_credits: [],
      } } as T
    }
    return { data: DEMO_DASHBOARD } as T
  }

  // Rooms list
  if (endpoint === '/rooms' && method === 'GET') {
    return { data: rooms } as T
  }

  // Create room
  if (endpoint === '/rooms' && method === 'POST') {
    const b = body as any
    const newRoom = {
      id: `room-${Date.now()}`,
      name: b.name,
      description: b.description || null,
      category: b.category || 'outro',
      icon: null,
      owner_id: DEMO_USER.id,
      member_limit: b.member_limit || 10,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      my_role: 'owner',
      member_count: 1,
    }
    rooms = [newRoom, ...rooms]
    DEMO_ROOM_MEMBERS[newRoom.id] = [
      { user_id: DEMO_USER.id, role: 'owner', profiles: DEMO_MEMBERS[0] },
    ]
    expenses[newRoom.id] = []
    DEMO_BALANCES[newRoom.id] = []
    return { data: newRoom } as T
  }

  // Archive room
  const archiveMatch = endpoint.match(/^\/rooms\/([\w-]+)$/)
  if (archiveMatch && method === 'DELETE') {
    const roomId = archiveMatch[1]!
    rooms = rooms.map(r => r.id === roomId ? { ...r, status: 'archived' } : r)
    return { message: 'Sala arquivada com sucesso' } as T
  }

  // Room detail
  const roomDetailMatch = endpoint.match(/^\/rooms\/([\w-]+)$/)
  if (roomDetailMatch && method === 'GET') {
    const roomId = roomDetailMatch[1]!
    const room = rooms.find(r => r.id === roomId)
    if (!room) throw new Error('Sala nao encontrada')
    const members = DEMO_ROOM_MEMBERS[roomId] || []
    return { data: { ...room, members, member_count: members.length } } as T
  }

  // Room members
  const membersMatch = endpoint.match(/^\/rooms\/([\w-]+)\/members$/)
  if (membersMatch && method === 'GET') {
    const roomId = membersMatch[1]!
    return { data: DEMO_ROOM_MEMBERS[roomId] || [] } as T
  }

  // Room balances
  const balancesMatch = endpoint.match(/^\/rooms\/([\w-]+)\/balances$/)
  if (balancesMatch) {
    const roomId = balancesMatch[1]!
    return { data: DEMO_BALANCES[roomId] || [] } as T
  }

  // Room expenses list
  const expensesMatch = endpoint.match(/^\/rooms\/([\w-]+)\/expenses$/)
  if (expensesMatch && method === 'GET') {
    const roomId = expensesMatch[1]!
    return { data: expenses[roomId] || [] } as T
  }

  // Create expense
  if (expensesMatch && method === 'POST') {
    const roomId = expensesMatch[1]!
    const b = body as any
    const members = DEMO_ROOM_MEMBERS[roomId] || []
    const participants = b.participants || members.map((m: any) => m.user_id)
    const perPerson = Math.round((b.total_amount / participants.length) * 100) / 100

    const newExp = {
      id: `exp-${nextExpId++}`,
      room_id: roomId,
      created_by: DEMO_USER.id,
      description: b.description,
      total_amount: b.total_amount,
      split_type: b.split_type,
      receipt_url: b.receipt_url || 'receipts/demo/new.jpg',
      status: 'active',
      created_at: new Date().toISOString(),
      profiles: { display_name: DEMO_USER.display_name, avatar_url: null },
      expense_splits: participants.map((uid: string, i: number) => {
        const member = DEMO_MEMBERS.find(m => m.id === uid)
        return {
          id: `split-new-${nextExpId}-${i}`,
          user_id: uid,
          amount: perPerson,
          is_paid: uid === DEMO_USER.id,
          paid_at: uid === DEMO_USER.id ? new Date().toISOString() : null,
          profiles: { display_name: member?.display_name || 'Membro', avatar_url: null },
        }
      }),
    }

    if (!expenses[roomId]) expenses[roomId] = []
    expenses[roomId] = [newExp, ...expenses[roomId]!]

    return { data: { expense: newExp, splits: newExp.expense_splits } } as T
  }

  // Payment requests list
  const paymentReqListMatch = endpoint.match(/^\/rooms\/([\w-]+)\/payment-requests$/)
  if (paymentReqListMatch && method === 'GET') {
    return { data: [] } as T
  }

  // Submit payment request (proof)
  const paymentReqCreateMatch = endpoint.match(/^\/rooms\/([\w-]+)\/expenses\/([\w-]+)\/payment-requests$/)
  if (paymentReqCreateMatch && method === 'POST') {
    const b = body as any
    return { data: {
      id: `pr-${Date.now()}`,
      split_id: b?.split_id,
      expense_id: paymentReqCreateMatch[2],
      room_id: paymentReqCreateMatch[1],
      requester_id: DEMO_USER.id,
      proof_url: b?.proof_url,
      status: 'pending',
      created_at: new Date().toISOString(),
    } } as T
  }

  // Approve/reject payment request
  const reviewReqMatch = endpoint.match(/^\/rooms\/([\w-]+)\/payment-requests\/([\w-]+)$/)
  if (reviewReqMatch && method === 'PATCH') {
    const b = body as any
    return { message: b?.status === 'approved' ? 'Pagamento aprovado' : 'Pagamento rejeitado' } as T
  }

  // Toggle payment
  const splitMatch = endpoint.match(/^\/rooms\/([\w-]+)\/expenses\/([\w-]+)\/splits\/([\w-]+)$/)
  if (splitMatch && method === 'PATCH') {
    const roomId = splitMatch[1]!
    const expenseId = splitMatch[2]!
    const splitId = splitMatch[3]!
    const b = body as any

    const roomExpenses = expenses[roomId]
    if (roomExpenses) {
      const exp = roomExpenses.find(e => e.id === expenseId)
      if (exp) {
        const split = exp.expense_splits.find((s: any) => s.id === splitId)
        if (split) {
          split.is_paid = b.is_paid
          split.paid_at = b.is_paid ? new Date().toISOString() : null
        }
      }
    }

    return { data: { id: splitId, is_paid: b.is_paid } } as T
  }

  // Generate invite
  const inviteMatch = endpoint.match(/^\/rooms\/([\w-]+)\/invites$/)
  if (inviteMatch && method === 'POST') {
    return { data: { token: `demo-invite-${Date.now()}` } } as T
  }

  // Invite info
  const inviteInfoMatch = endpoint.match(/^\/invites\/([\w-]+)$/)
  if (inviteInfoMatch && method === 'GET') {
    return {
      data: {
        room_name: 'Sala Demo',
        room_category: 'outro',
        member_count: 3,
        member_limit: 10,
        is_valid: true,
      },
    } as T
  }

  // Join invite
  const joinMatch = endpoint.match(/^\/invites\/([\w-]+)\/join$/)
  if (joinMatch && method === 'POST') {
    return { data: { room_id: 'room-001' }, message: 'Voce entrou na sala!' } as T
  }

  // Admin routes
  if (endpoint === '/admin/stats') {
    return { data: {
      total_users: DEMO_MEMBERS.length,
      online_users: 1,
      online_user_ids: [DEMO_USER.id],
      total_rooms: rooms.length,
      active_rooms: rooms.filter(r => r.status === 'active').length,
      total_expenses: Object.values(expenses).flat().length,
      unpaid_splits: 7,
      total_pending: 712.16,
    } } as T
  }

  if (endpoint === '/admin/users') {
    return { data: DEMO_MEMBERS.map((m, i) => ({
      ...m,
      pix_key: null,
      is_admin: i === 0,
      is_online: i === 0,
      room_count: i < 3 ? 3 : i < 4 ? 2 : 1,
      expense_count: i < 2 ? 2 : 1,
      total_owed: i === 0 ? 236 : i === 2 ? 286 : i === 3 ? 190.16 : i === 4 ? 236 : 0,
      created_at: new Date().toISOString(),
    })) } as T
  }

  if (endpoint === '/admin/rooms') {
    return { data: rooms.map(r => ({
      ...r,
      profiles: DEMO_MEMBERS.find(m => m.id === r.owner_id) || { display_name: 'N/A', email: 'n/a' },
      expense_count: (expenses[r.id] || []).length,
    })) } as T
  }

  // Admin actions (archive/delete rooms, reset balances, toggle admin)
  if (endpoint.startsWith('/admin/')) {
    return { message: 'Acao executada com sucesso', data: {} } as T
  }

  console.warn(`[Mock API] Unhandled: ${method} ${endpoint}`)
  return { data: null } as T
}

export async function mockUpload<T>(endpoint: string, _formData: FormData): Promise<T> {
  await delay(500)
  // Avatar and room-image endpoints return { url }, receipt returns { path }
  if (endpoint.includes('/avatar') || endpoint.includes('/room-image')) {
    return { data: { url: `https://demo.storage/uploads/${Date.now()}.jpg` } } as T
  }
  return { data: { path: `receipts/demo/${Date.now()}.jpg` } } as T
}
