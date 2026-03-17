import { z } from 'zod'

export const createRoomSchema = z.object({
  name: z.string().min(1, 'Nome obrigatorio').max(100),
  description: z.string().max(500).optional(),
  category: z.enum(['jantar', 'balada', 'mercado', 'viagem', 'outro']),
  member_limit: z.number().int().min(2).max(50).default(10),
  image_url: z.string().url().optional().nullable(),
})

export const updateRoomSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  category: z.enum(['jantar', 'balada', 'mercado', 'viagem', 'outro']).optional(),
  member_limit: z.number().int().min(2).max(50).optional(),
  image_url: z.string().url().optional().nullable(),
  status: z.enum(['active', 'archived', 'closed']).optional(),
})
