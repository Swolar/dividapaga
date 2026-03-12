import { z } from 'zod'

export const createRoomSchema = z.object({
  name: z.string().min(1, 'Nome obrigatorio').max(100),
  description: z.string().max(500).optional(),
  category: z.enum(['jantar', 'balada', 'mercado', 'viagem', 'outro']),
  member_limit: z.number().int().min(2).max(50).default(10),
})

export const updateRoomSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  category: z.enum(['jantar', 'balada', 'mercado', 'viagem', 'outro']).optional(),
  member_limit: z.number().int().min(2).max(50).optional(),
  status: z.enum(['active', 'archived', 'closed']).optional(),
})
