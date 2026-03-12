-- Tabela de consumidores por item (para divisao por item)
CREATE TABLE expense_item_consumers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_item_id UUID NOT NULL REFERENCES expense_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  UNIQUE(expense_item_id, user_id)
);

ALTER TABLE expense_item_consumers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "item_consumers_select_member" ON expense_item_consumers
  FOR SELECT USING (
    expense_item_id IN (
      SELECT ei.id FROM expense_items ei
      JOIN expenses e ON e.id = ei.expense_id
      JOIN room_members rm ON rm.room_id = e.room_id
      WHERE rm.user_id = auth.uid() AND rm.removed_at IS NULL
    )
  );

CREATE POLICY "item_consumers_insert_member" ON expense_item_consumers
  FOR INSERT WITH CHECK (
    expense_item_id IN (
      SELECT ei.id FROM expense_items ei
      JOIN expenses e ON e.id = ei.expense_id
      JOIN room_members rm ON rm.room_id = e.room_id
      WHERE rm.user_id = auth.uid() AND rm.removed_at IS NULL
    )
  );
