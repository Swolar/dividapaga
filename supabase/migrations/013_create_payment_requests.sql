-- Tabela de solicitacoes de pagamento
CREATE TABLE IF NOT EXISTS payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id UUID NOT NULL REFERENCES expense_splits(id) ON DELETE CASCADE,
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES profiles(id),
  proof_url TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_requests_split ON payment_requests(split_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_payment_requests_room ON payment_requests(room_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_payment_requests_requester ON payment_requests(requester_id);

-- RLS
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- Members of the room can view payment requests
CREATE POLICY "Room members can view payment requests"
  ON payment_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_members.room_id = payment_requests.room_id
        AND room_members.user_id = auth.uid()
        AND room_members.removed_at IS NULL
    )
  );

-- Users can create payment requests for their own splits
CREATE POLICY "Users can create own payment requests"
  ON payment_requests FOR INSERT
  WITH CHECK (requester_id = auth.uid());

-- Expense creators can update payment requests (approve/reject)
CREATE POLICY "Expense creators can update payment requests"
  ON payment_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM expenses
      WHERE expenses.id = payment_requests.expense_id
        AND expenses.created_by = auth.uid()
    )
  );
