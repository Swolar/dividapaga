-- Tabela de membros da sala
CREATE TABLE room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at TIMESTAMPTZ,
  UNIQUE(room_id, user_id)
);

ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;

-- RLS: membros da sala podem ver outros membros
CREATE POLICY "room_members_select" ON room_members
  FOR SELECT USING (
    room_id IN (
      SELECT rm.room_id FROM room_members rm
      WHERE rm.user_id = auth.uid() AND rm.removed_at IS NULL
    )
  );

-- RLS para rooms (depende de room_members existir)
CREATE POLICY "rooms_select_member" ON rooms
  FOR SELECT USING (
    id IN (
      SELECT room_id FROM room_members
      WHERE user_id = auth.uid() AND removed_at IS NULL
    )
  );

CREATE POLICY "rooms_insert_auth" ON rooms
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "rooms_update_owner" ON rooms
  FOR UPDATE USING (auth.uid() = owner_id);
