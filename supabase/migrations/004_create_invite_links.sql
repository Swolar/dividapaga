-- Tabela de links de convite
CREATE TABLE invite_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  token VARCHAR(64) UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '72 hours'),
  max_uses INT,
  use_count INT NOT NULL DEFAULT 0,
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;

-- Apenas owner/admin da sala pode gerenciar convites
CREATE POLICY "invites_select_room_admin" ON invite_links
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM room_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND removed_at IS NULL
    )
  );

CREATE POLICY "invites_insert_room_admin" ON invite_links
  FOR INSERT WITH CHECK (
    room_id IN (
      SELECT room_id FROM room_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND removed_at IS NULL
    )
    AND auth.uid() = created_by
  );

CREATE POLICY "invites_update_room_admin" ON invite_links
  FOR UPDATE USING (
    room_id IN (
      SELECT room_id FROM room_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND removed_at IS NULL
    )
  );
