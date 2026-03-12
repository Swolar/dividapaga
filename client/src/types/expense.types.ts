export type SplitType = 'equal' | 'by_item' | 'manual'

export interface Expense {
  id: string
  room_id: string
  created_by: string
  description: string
  total_amount: number
  split_type: SplitType
  receipt_url: string
  rounding_adjustment: number
  status: 'active' | 'deleted'
  created_at: string
  updated_at: string
  creator?: {
    display_name: string
    avatar_url: string | null
  }
}

export interface ExpenseItem {
  id: string
  expense_id: string
  name: string
  unit_price: number
  quantity: number
  consumers?: string[]
}

export interface ExpenseSplit {
  id: string
  expense_id: string
  user_id: string
  amount: number
  is_paid: boolean
  paid_at: string | null
  marked_paid_by: string | null
  payment_proof_url: string | null
  profile?: {
    display_name: string
    avatar_url: string | null
  }
}

export interface CreateExpensePayload {
  description: string
  total_amount: number
  split_type: SplitType
  receipt: File
  participants: string[]
  items?: {
    name: string
    unit_price: number
    quantity: number
    consumer_ids: string[]
  }[]
  manual_splits?: {
    user_id: string
    amount: number
  }[]
}
