-- Tabela de itens de despesa (para divisao por item)
CREATE TABLE expense_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price > 0),
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expense_items_select_member" ON expense_items
  FOR SELECT USING (
    expense_id IN (
      SELECT e.id FROM expenses e
      JOIN room_members rm ON rm.room_id = e.room_id
      WHERE rm.user_id = auth.uid() AND rm.removed_at IS NULL
    )
  );

CREATE POLICY "expense_items_insert_member" ON expense_items
  FOR INSERT WITH CHECK (
    expense_id IN (
      SELECT e.id FROM expenses e
      JOIN room_members rm ON rm.room_id = e.room_id
      WHERE rm.user_id = auth.uid() AND rm.removed_at IS NULL
    )
  );
