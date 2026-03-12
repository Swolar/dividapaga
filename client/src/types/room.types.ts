export type RoomCategory = 'jantar' | 'balada' | 'mercado' | 'viagem' | 'outro'
export type RoomStatus = 'active' | 'archived' | 'closed'
export type MemberRole = 'owner' | 'admin' | 'member'

export interface Room {
  id: string
  name: string
  description: string | null
  category: RoomCategory
  icon: string | null
  owner_id: string
  member_limit: number
  status: RoomStatus
  created_at: string
  updated_at: string
}

export interface RoomMember {
  id: string
  room_id: string
  user_id: string
  role: MemberRole
  joined_at: string
  removed_at: string | null
  profile?: {
    display_name: string
    avatar_url: string | null
    email: string
  }
}

export interface RoomWithMembers extends Room {
  members: RoomMember[]
  member_count: number
}

export interface CreateRoomPayload {
  name: string
  description?: string
  category: RoomCategory
  member_limit: number
}
