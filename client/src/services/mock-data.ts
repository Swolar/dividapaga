// Demo data for testing without backend

export const DEMO_USER = {
  id: 'demo-user-001',
  email: 'tarik@demo.com',
  display_name: 'Tarik Hamdar',
  avatar_url: null,
  pix_key: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const DEMO_MEMBERS = [
  { id: 'demo-user-001', display_name: 'Tarik Hamdar', avatar_url: null, email: 'tarik@demo.com' },
  { id: 'demo-user-002', display_name: 'Lucas Silva', avatar_url: null, email: 'lucas@demo.com' },
  { id: 'demo-user-003', display_name: 'Camila Santos', avatar_url: null, email: 'camila@demo.com' },
  { id: 'demo-user-004', display_name: 'Rafael Costa', avatar_url: null, email: 'rafael@demo.com' },
  { id: 'demo-user-005', display_name: 'Ana Oliveira', avatar_url: null, email: 'ana@demo.com' },
]

export const DEMO_ROOMS = [
  {
    id: 'room-001',
    name: 'Churrasco do Sabado',
    description: 'Churrasco na casa do Lucas',
    category: 'jantar',
    icon: null,
    owner_id: 'demo-user-001',
    member_limit: 10,
    status: 'active',
    created_at: '2026-03-08T18:00:00Z',
    updated_at: '2026-03-08T18:00:00Z',
    my_role: 'owner',
    member_count: 5,
  },
  {
    id: 'room-002',
    name: 'Balada Sexta',
    description: 'Noite no club',
    category: 'balada',
    icon: null,
    owner_id: 'demo-user-002',
    member_limit: 8,
    status: 'active',
    created_at: '2026-03-10T22:00:00Z',
    updated_at: '2026-03-10T22:00:00Z',
    my_role: 'member',
    member_count: 4,
  },
  {
    id: 'room-003',
    name: 'Mercado Mensal',
    description: 'Compras do apartamento',
    category: 'mercado',
    icon: null,
    owner_id: 'demo-user-001',
    member_limit: 4,
    status: 'active',
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z',
    my_role: 'owner',
    member_count: 3,
  },
]

export const DEMO_ROOM_MEMBERS: Record<string, any[]> = {
  'room-001': [
    { user_id: 'demo-user-001', role: 'owner', profiles: DEMO_MEMBERS[0] },
    { user_id: 'demo-user-002', role: 'member', profiles: DEMO_MEMBERS[1] },
    { user_id: 'demo-user-003', role: 'member', profiles: DEMO_MEMBERS[2] },
    { user_id: 'demo-user-004', role: 'member', profiles: DEMO_MEMBERS[3] },
    { user_id: 'demo-user-005', role: 'member', profiles: DEMO_MEMBERS[4] },
  ],
  'room-002': [
    { user_id: 'demo-user-002', role: 'owner', profiles: DEMO_MEMBERS[1] },
    { user_id: 'demo-user-001', role: 'member', profiles: DEMO_MEMBERS[0] },
    { user_id: 'demo-user-003', role: 'member', profiles: DEMO_MEMBERS[2] },
    { user_id: 'demo-user-005', role: 'member', profiles: DEMO_MEMBERS[4] },
  ],
  'room-003': [
    { user_id: 'demo-user-001', role: 'owner', profiles: DEMO_MEMBERS[0] },
    { user_id: 'demo-user-003', role: 'member', profiles: DEMO_MEMBERS[2] },
    { user_id: 'demo-user-004', role: 'member', profiles: DEMO_MEMBERS[3] },
  ],
}

export const DEMO_EXPENSES: Record<string, any[]> = {
  'room-001': [
    {
      id: 'exp-001',
      room_id: 'room-001',
      created_by: 'demo-user-001',
      description: 'Carne e Carvao',
      total_amount: 250.00,
      split_type: 'equal',
      receipt_url: 'receipts/demo/carne.jpg',
      status: 'active',
      created_at: '2026-03-08T16:00:00Z',
      profiles: { display_name: 'Tarik Hamdar', avatar_url: null },
      expense_splits: [
        { id: 'split-001', user_id: 'demo-user-001', amount: 50.00, is_paid: true, paid_at: '2026-03-08T20:00:00Z', profiles: { display_name: 'Tarik Hamdar', avatar_url: null } },
        { id: 'split-002', user_id: 'demo-user-002', amount: 50.00, is_paid: true, paid_at: '2026-03-09T10:00:00Z', profiles: { display_name: 'Lucas Silva', avatar_url: null } },
        { id: 'split-003', user_id: 'demo-user-003', amount: 50.00, is_paid: false, paid_at: null, profiles: { display_name: 'Camila Santos', avatar_url: null } },
        { id: 'split-004', user_id: 'demo-user-004', amount: 50.00, is_paid: false, paid_at: null, profiles: { display_name: 'Rafael Costa', avatar_url: null } },
        { id: 'split-005', user_id: 'demo-user-005', amount: 50.00, is_paid: true, paid_at: '2026-03-09T14:00:00Z', profiles: { display_name: 'Ana Oliveira', avatar_url: null } },
      ],
    },
    {
      id: 'exp-002',
      room_id: 'room-001',
      created_by: 'demo-user-002',
      description: 'Bebidas e Gelo',
      total_amount: 180.00,
      split_type: 'equal',
      receipt_url: 'receipts/demo/bebidas.jpg',
      status: 'active',
      created_at: '2026-03-08T17:30:00Z',
      profiles: { display_name: 'Lucas Silva', avatar_url: null },
      expense_splits: [
        { id: 'split-006', user_id: 'demo-user-001', amount: 36.00, is_paid: false, paid_at: null, profiles: { display_name: 'Tarik Hamdar', avatar_url: null } },
        { id: 'split-007', user_id: 'demo-user-002', amount: 36.00, is_paid: true, paid_at: '2026-03-08T17:30:00Z', profiles: { display_name: 'Lucas Silva', avatar_url: null } },
        { id: 'split-008', user_id: 'demo-user-003', amount: 36.00, is_paid: false, paid_at: null, profiles: { display_name: 'Camila Santos', avatar_url: null } },
        { id: 'split-009', user_id: 'demo-user-004', amount: 36.00, is_paid: true, paid_at: '2026-03-10T09:00:00Z', profiles: { display_name: 'Rafael Costa', avatar_url: null } },
        { id: 'split-010', user_id: 'demo-user-005', amount: 36.00, is_paid: false, paid_at: null, profiles: { display_name: 'Ana Oliveira', avatar_url: null } },
      ],
    },
  ],
  'room-002': [
    {
      id: 'exp-003',
      room_id: 'room-002',
      created_by: 'demo-user-002',
      description: 'Mesa VIP + Garrafa',
      total_amount: 800.00,
      split_type: 'equal',
      receipt_url: 'receipts/demo/vip.jpg',
      status: 'active',
      created_at: '2026-03-10T23:00:00Z',
      profiles: { display_name: 'Lucas Silva', avatar_url: null },
      expense_splits: [
        { id: 'split-011', user_id: 'demo-user-001', amount: 200.00, is_paid: false, paid_at: null, profiles: { display_name: 'Tarik Hamdar', avatar_url: null } },
        { id: 'split-012', user_id: 'demo-user-002', amount: 200.00, is_paid: true, paid_at: '2026-03-10T23:00:00Z', profiles: { display_name: 'Lucas Silva', avatar_url: null } },
        { id: 'split-013', user_id: 'demo-user-003', amount: 200.00, is_paid: false, paid_at: null, profiles: { display_name: 'Camila Santos', avatar_url: null } },
        { id: 'split-014', user_id: 'demo-user-005', amount: 200.00, is_paid: false, paid_at: null, profiles: { display_name: 'Ana Oliveira', avatar_url: null } },
      ],
    },
  ],
  'room-003': [
    {
      id: 'exp-004',
      room_id: 'room-003',
      created_by: 'demo-user-001',
      description: 'Compras Supermercado',
      total_amount: 420.50,
      split_type: 'equal',
      receipt_url: 'receipts/demo/mercado.jpg',
      status: 'active',
      created_at: '2026-03-05T11:00:00Z',
      profiles: { display_name: 'Tarik Hamdar', avatar_url: null },
      expense_splits: [
        { id: 'split-015', user_id: 'demo-user-001', amount: 140.17, is_paid: true, paid_at: '2026-03-05T11:00:00Z', profiles: { display_name: 'Tarik Hamdar', avatar_url: null } },
        { id: 'split-016', user_id: 'demo-user-003', amount: 140.17, is_paid: true, paid_at: '2026-03-06T08:00:00Z', profiles: { display_name: 'Camila Santos', avatar_url: null } },
        { id: 'split-017', user_id: 'demo-user-004', amount: 140.16, is_paid: false, paid_at: null, profiles: { display_name: 'Rafael Costa', avatar_url: null } },
      ],
    },
  ],
}

export const DEMO_BALANCES: Record<string, any[]> = {
  'room-001': [
    { user_id: 'demo-user-001', display_name: 'Tarik Hamdar', avatar_url: null, total_owed: 36.00, total_receivable: 100.00, net_balance: 64.00 },
    { user_id: 'demo-user-002', display_name: 'Lucas Silva', avatar_url: null, total_owed: 0, total_receivable: 72.00, net_balance: 72.00 },
    { user_id: 'demo-user-003', display_name: 'Camila Santos', avatar_url: null, total_owed: 86.00, total_receivable: 0, net_balance: -86.00 },
    { user_id: 'demo-user-004', display_name: 'Rafael Costa', avatar_url: null, total_owed: 50.00, total_receivable: 0, net_balance: -50.00 },
    { user_id: 'demo-user-005', display_name: 'Ana Oliveira', avatar_url: null, total_owed: 36.00, total_receivable: 0, net_balance: -36.00 },
  ],
  'room-002': [
    { user_id: 'demo-user-001', display_name: 'Tarik Hamdar', avatar_url: null, total_owed: 200.00, total_receivable: 0, net_balance: -200.00 },
    { user_id: 'demo-user-002', display_name: 'Lucas Silva', avatar_url: null, total_owed: 0, total_receivable: 600.00, net_balance: 600.00 },
    { user_id: 'demo-user-003', display_name: 'Camila Santos', avatar_url: null, total_owed: 200.00, total_receivable: 0, net_balance: -200.00 },
    { user_id: 'demo-user-005', display_name: 'Ana Oliveira', avatar_url: null, total_owed: 200.00, total_receivable: 0, net_balance: -200.00 },
  ],
  'room-003': [
    { user_id: 'demo-user-001', display_name: 'Tarik Hamdar', avatar_url: null, total_owed: 0, total_receivable: 140.16, net_balance: 140.16 },
    { user_id: 'demo-user-003', display_name: 'Camila Santos', avatar_url: null, total_owed: 0, total_receivable: 0, net_balance: 0 },
    { user_id: 'demo-user-004', display_name: 'Rafael Costa', avatar_url: null, total_owed: 140.16, total_receivable: 0, net_balance: -140.16 },
  ],
}

export const DEMO_DASHBOARD = {
  total_owed: 236.00,
  total_receivable: 312.16,
  rooms: DEMO_ROOMS.map(r => ({
    id: r.id,
    name: r.name,
    category: r.category,
    member_count: r.member_count,
    status: r.status,
  })),
  recent_debts: [
    { expense_id: 'exp-003', room_name: 'Balada Sexta', description: 'Mesa VIP + Garrafa', amount: 200.00, creditor_name: 'Lucas Silva' },
    { expense_id: 'exp-002', room_name: 'Churrasco do Sabado', description: 'Bebidas e Gelo', amount: 36.00, creditor_name: 'Lucas Silva' },
  ],
  recent_credits: [
    { expense_id: 'exp-004', room_name: 'Mercado Mensal', description: 'Compras Supermercado', amount: 140.16, debtor_name: 'Rafael Costa' },
    { expense_id: 'exp-001', room_name: 'Churrasco do Sabado', description: 'Carne e Carvao', amount: 50.00, debtor_name: 'Camila Santos' },
    { expense_id: 'exp-001', room_name: 'Churrasco do Sabado', description: 'Carne e Carvao', amount: 50.00, debtor_name: 'Rafael Costa' },
  ],
}
