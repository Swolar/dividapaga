-- Tabela de despesas
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  description VARCHAR(200) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount > 0),
  split_type VARCHAR(20) NOT NULL
    CHECK (split_type IN ('equal', 'by_item', 'manual')),
  receipt_url TEXT NOT NULL,
  rounding_adjustment DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: membros da sala podem ver despesas
CREATE POLICY "expenses_select_member" ON expenses
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM room_members
      WHERE user_id = auth.uid() AND removed_at IS NULL
    )
  );

CREATE POLICY "expenses_insert_member" ON expenses
  FOR INSERT WITH CHECK (
    room_id IN (
      SELECT room_id FROM room_members
      WHERE user_id = auth.uid() AND removed_at IS NULL
    )
    AND auth.uid() = created_by
  );

CREATE POLICY "expenses_update_creator" ON expenses
  FOR UPDATE USING (
    auth.uid() = created_by
    OR room_id IN (
      SELECT room_id FROM room_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND removed_at IS NULL
    )
  );
