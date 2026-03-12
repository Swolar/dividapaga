export interface InviteLink {
  id: string
  room_id: string
  token: string
  created_by: string
  expires_at: string
  max_uses: number | null
  use_count: number
  is_revoked: boolean
  created_at: string
}

export interface InviteInfo {
  room_name: string
  room_category: string
  member_count: number
  member_limit: number
  creator_name: string
  is_valid: boolean
  reason?: string
}
