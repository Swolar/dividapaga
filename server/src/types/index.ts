import type { Request } from 'express'

export interface AuthenticatedRequest extends Request {
  userId?: string
  accessToken?: string
}

export interface RoomMemberInfo {
  role: 'owner' | 'admin' | 'member'
  room_id: string
  user_id: string
}
