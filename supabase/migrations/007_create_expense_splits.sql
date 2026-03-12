-- Tabela de divisoes (quanto cada membro deve por despesa)
CREATE TABLE expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  amount DECIMAL(10,2) NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  marked_paid_by UUID REFERENCES profiles(id),
  payment_proof_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(expense_id, user_id)
);

ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER expense_splits_updated_at
  BEFORE UPDATE ON expense_splits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE POLICY "splits_select_member" ON expense_splits
  FOR SELECT USING (
    expense_id IN (
      SELECT e.id FROM expenses e
      JOIN room_members rm ON rm.room_id = e.room_id
      WHERE rm.user_id = auth.uid() AND rm.removed_at IS NULL
    )
  );

CREATE POLICY "splits_update_admin" ON expense_splits
  FOR UPDATE USING (
    expense_id IN (
      SELECT e.id FROM expenses e
      JOIN room_members rm ON rm.room_id = e.room_id
      WHERE rm.user_id = auth.uid()
        AND rm.role IN ('owner', 'admin')
        AND rm.removed_at IS NULL
    )
  );
