export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  message: string
  code?: string
  status: number
}

export interface DashboardData {
  total_owed: number
  total_receivable: number
  rooms: {
    id: string
    name: string
    category: string
    member_count: number
    pending_amount: number
  }[]
  recent_debts: {
    expense_id: string
    room_name: string
    description: string
    amount: number
    creditor_name: string
  }[]
  recent_credits: {
    expense_id: string
    room_name: string
    description: string
    amount: number
    debtor_name: string
  }[]
}

export interface RoomBalance {
  user_id: string
  display_name: string
  avatar_url: string | null
  total_owed: number
  total_paid: number
  net_balance: number
}
