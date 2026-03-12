import { z } from 'zod'

export const createExpenseSchema = z.object({
  description: z.string().min(1, 'Descricao obrigatoria').max(200),
  total_amount: z.number().positive('Valor deve ser positivo'),
  split_type: z.enum(['equal', 'by_item', 'manual']),
  participants: z.array(z.string().uuid()).min(1, 'Selecione ao menos 1 participante'),
  items: z.array(z.object({
    name: z.string().min(1).max(100),
    unit_price: z.number().positive(),
    quantity: z.number().int().positive(),
    consumer_ids: z.array(z.string().uuid()).min(1),
  })).optional(),
  manual_splits: z.array(z.object({
    user_id: z.string().uuid(),
    amount: z.number().positive(),
  })).optional(),
})
