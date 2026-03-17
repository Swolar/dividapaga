import type { SupabaseClient } from '@supabase/supabase-js'

export interface SplitResult {
  user_id: string | null
  guest_name: string | null
  amount: number
}

export function splitEqual(
  totalAmount: number,
  participantIds: string[],
  creatorId: string,
  guestNames: string[] = []
): SplitResult[] {
  const count = participantIds.length + guestNames.length
  if (count === 0) throw new Error('Selecione ao menos 1 participante')

  const perPerson = Math.round((totalAmount / count) * 100) / 100
  const totalSplit = perPerson * count
  const diff = Math.round((totalAmount - totalSplit) * 100) / 100

  const memberSplits: SplitResult[] = participantIds.map(uid => ({
    user_id: uid,
    guest_name: null,
    amount: uid === creatorId ? perPerson + diff : perPerson,
  }))

  // If creator not in participants, assign rounding diff to first member
  if (diff !== 0 && !participantIds.includes(creatorId) && memberSplits.length > 0) {
    memberSplits[0]!.amount += diff
  }

  const guestSplits: SplitResult[] = guestNames.map(name => ({
    user_id: null,
    guest_name: name,
    amount: perPerson,
  }))

  return [...memberSplits, ...guestSplits]
}

export async function splitByItem(
  expenseId: string,
  items: {
    name: string
    unit_price: number
    quantity: number
    consumer_ids: string[]
  }[],
  supabase: SupabaseClient
): Promise<SplitResult[]> {
  if (!items.length) throw new Error('Adicione ao menos 1 item')

  const userTotals = new Map<string, number>()

  for (const item of items) {
    // Insert item
    const { data: dbItem } = await supabase
      .from('expense_items')
      .insert({
        expense_id: expenseId,
        name: item.name,
        unit_price: item.unit_price,
        quantity: item.quantity,
      })
      .select()
      .single()

    if (!dbItem) continue

    // Insert consumers
    await supabase.from('expense_item_consumers').insert(
      item.consumer_ids.map(uid => ({
        expense_item_id: dbItem.id,
        user_id: uid,
      }))
    )

    // Calculate per person
    const itemTotal = item.unit_price * item.quantity
    const perPerson = Math.round((itemTotal / item.consumer_ids.length) * 100) / 100

    for (const uid of item.consumer_ids) {
      userTotals.set(uid, (userTotals.get(uid) || 0) + perPerson)
    }
  }

  return Array.from(userTotals.entries()).map(([user_id, amount]) => ({
    user_id,
    guest_name: null,
    amount: Math.round(amount * 100) / 100,
  }))
}

export function splitManual(
  totalAmount: number,
  splits: { user_id: string; amount: number }[]
): SplitResult[] {
  if (!splits.length) throw new Error('Defina valores para ao menos 1 participante')

  const sum = splits.reduce((acc, s) => acc + s.amount, 0)
  const diff = Math.abs(totalAmount - sum)

  if (diff > 0.01) {
    throw new Error(`Soma das parcelas (R$${sum.toFixed(2)}) difere do total (R$${totalAmount.toFixed(2)})`)
  }

  return splits.map(s => ({ ...s, guest_name: null }))
}
