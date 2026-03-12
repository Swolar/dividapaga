import { z } from 'zod'

export const createInviteSchema = z.object({
  max_uses: z.number().int().positive().optional(),
  expires_hours: z.number().int().min(1).max(168).default(72),
})
