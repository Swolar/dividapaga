-- =============================================
-- DIVIDAPAGA - TODAS AS MIGRATIONS EM UM ARQUIVO
-- Cole TUDO isso no Supabase SQL Editor e clique Run
-- =============================================

-- ========== 001: PROFILES ==========
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  pix_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========== 002: ROOMS ==========
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(20) NOT NULL DEFAULT 'outro'
    CHECK (category IN ('jantar', 'balada', 'mercado', 'viagem', 'outro')),
  icon VARCHAR(50),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_limit INT NOT NULL DEFAULT 10
    CHECK (member_limit >= 2 AND member_limit <= 50),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS rooms_updated_at ON rooms;
CREATE TRIGGER rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========== 003: ROOM_MEMBERS ==========
CREATE TABLE IF NOT EXISTS room_members (
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

DROP POLICY IF EXISTS "room_members_select" ON room_members;
CREATE POLICY "room_members_select" ON room_members
  FOR SELECT USING (
    room_id IN (
      SELECT rm.room_id FROM room_members rm
      WHERE rm.user_id = auth.uid() AND rm.removed_at IS NULL
    )
  );

DROP POLICY IF EXISTS "rooms_select_member" ON rooms;
CREATE POLICY "rooms_select_member" ON rooms
  FOR SELECT USING (
    id IN (
      SELECT room_id FROM room_members
      WHERE user_id = auth.uid() AND removed_at IS NULL
    )
  );

DROP POLICY IF EXISTS "rooms_insert_auth" ON rooms;
CREATE POLICY "rooms_insert_auth" ON rooms
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "rooms_update_owner" ON rooms;
CREATE POLICY "rooms_update_owner" ON rooms
  FOR UPDATE USING (auth.uid() = owner_id);

-- ========== 004: INVITE_LINKS ==========
CREATE TABLE IF NOT EXISTS invite_links (
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

DROP POLICY IF EXISTS "invites_select_room_admin" ON invite_links;
CREATE POLICY "invites_select_room_admin" ON invite_links
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM room_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND removed_at IS NULL
    )
  );

DROP POLICY IF EXISTS "invites_insert_room_admin" ON invite_links;
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

DROP POLICY IF EXISTS "invites_update_room_admin" ON invite_links;
CREATE POLICY "invites_update_room_admin" ON invite_links
  FOR UPDATE USING (
    room_id IN (
      SELECT room_id FROM room_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND removed_at IS NULL
    )
  );

-- ========== 005: EXPENSES ==========
CREATE TABLE IF NOT EXISTS expenses (
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

DROP TRIGGER IF EXISTS expenses_updated_at ON expenses;
CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP POLICY IF EXISTS "expenses_select_member" ON expenses;
CREATE POLICY "expenses_select_member" ON expenses
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM room_members
      WHERE user_id = auth.uid() AND removed_at IS NULL
    )
  );

DROP POLICY IF EXISTS "expenses_insert_member" ON expenses;
CREATE POLICY "expenses_insert_member" ON expenses
  FOR INSERT WITH CHECK (
    room_id IN (
      SELECT room_id FROM room_members
      WHERE user_id = auth.uid() AND removed_at IS NULL
    )
    AND auth.uid() = created_by
  );

DROP POLICY IF EXISTS "expenses_update_creator" ON expenses;
CREATE POLICY "expenses_update_creator" ON expenses
  FOR UPDATE USING (
    auth.uid() = created_by
    OR room_id IN (
      SELECT room_id FROM room_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND removed_at IS NULL
    )
  );

-- ========== 006: EXPENSE_ITEMS ==========
CREATE TABLE IF NOT EXISTS expense_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price > 0),
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expense_items_select_member" ON expense_items;
CREATE POLICY "expense_items_select_member" ON expense_items
  FOR SELECT USING (
    expense_id IN (
      SELECT e.id FROM expenses e
      JOIN room_members rm ON rm.room_id = e.room_id
      WHERE rm.user_id = auth.uid() AND rm.removed_at IS NULL
    )
  );

DROP POLICY IF EXISTS "expense_items_insert_member" ON expense_items;
CREATE POLICY "expense_items_insert_member" ON expense_items
  FOR INSERT WITH CHECK (
    expense_id IN (
      SELECT e.id FROM expenses e
      JOIN room_members rm ON rm.room_id = e.room_id
      WHERE rm.user_id = auth.uid() AND rm.removed_at IS NULL
    )
  );

-- ========== 007: EXPENSE_SPLITS ==========
CREATE TABLE IF NOT EXISTS expense_splits (
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

DROP TRIGGER IF EXISTS expense_splits_updated_at ON expense_splits;
CREATE TRIGGER expense_splits_updated_at
  BEFORE UPDATE ON expense_splits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP POLICY IF EXISTS "splits_select_member" ON expense_splits;
CREATE POLICY "splits_select_member" ON expense_splits
  FOR SELECT USING (
    expense_id IN (
      SELECT e.id FROM expenses e
      JOIN room_members rm ON rm.room_id = e.room_id
      WHERE rm.user_id = auth.uid() AND rm.removed_at IS NULL
    )
  );

DROP POLICY IF EXISTS "splits_update_admin" ON expense_splits;
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

-- ========== 008: EXPENSE_ITEM_CONSUMERS ==========
CREATE TABLE IF NOT EXISTS expense_item_consumers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_item_id UUID NOT NULL REFERENCES expense_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  UNIQUE(expense_item_id, user_id)
);

ALTER TABLE expense_item_consumers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "item_consumers_select_member" ON expense_item_consumers;
CREATE POLICY "item_consumers_select_member" ON expense_item_consumers
  FOR SELECT USING (
    expense_item_id IN (
      SELECT ei.id FROM expense_items ei
      JOIN expenses e ON e.id = ei.expense_id
      JOIN room_members rm ON rm.room_id = e.room_id
      WHERE rm.user_id = auth.uid() AND rm.removed_at IS NULL
    )
  );

DROP POLICY IF EXISTS "item_consumers_insert_member" ON expense_item_consumers;
CREATE POLICY "item_consumers_insert_member" ON expense_item_consumers
  FOR INSERT WITH CHECK (
    expense_item_id IN (
      SELECT ei.id FROM expense_items ei
      JOIN expenses e ON e.id = ei.expense_id
      JOIN room_members rm ON rm.room_id = e.room_id
      WHERE rm.user_id = auth.uid() AND rm.removed_at IS NULL
    )
  );

-- ========== 009: ACTIVITY_LOG ==========
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  action VARCHAR(50) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_log_select_member" ON activity_log;
CREATE POLICY "activity_log_select_member" ON activity_log
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM room_members
      WHERE user_id = auth.uid() AND removed_at IS NULL
    )
  );

-- ========== 010: INDEXES ==========
CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members(user_id) WHERE removed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_room_members_room ON room_members(room_id) WHERE removed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_room ON expenses(room_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_expense_splits_user ON expense_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_unpaid ON expense_splits(user_id) WHERE is_paid = false;
CREATE INDEX IF NOT EXISTS idx_invite_links_token ON invite_links(token) WHERE is_revoked = false;
CREATE INDEX IF NOT EXISTS idx_activity_log_room ON activity_log(room_id, created_at DESC);

-- ========== 011: VIEWS + STORAGE ==========
CREATE OR REPLACE VIEW user_room_balances AS
SELECT
  rm.user_id,
  rm.room_id,
  COALESCE(SUM(
    CASE WHEN e.created_by = rm.user_id THEN e.total_amount ELSE 0 END
  ), 0) AS total_paid,
  COALESCE(SUM(
    CASE WHEN es.user_id = rm.user_id AND es.is_paid = false THEN es.amount ELSE 0 END
  ), 0) AS total_owed,
  COALESCE(SUM(
    CASE WHEN e.created_by = rm.user_id AND es.is_paid = false THEN es.amount ELSE 0 END
  ), 0) AS total_receivable
FROM room_members rm
LEFT JOIN expenses e ON e.room_id = rm.room_id AND e.status = 'active'
LEFT JOIN expense_splits es ON es.expense_id = e.id
WHERE rm.removed_at IS NULL
GROUP BY rm.user_id, rm.room_id;

INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "receipts_insert" ON storage.objects;
CREATE POLICY "receipts_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'receipts'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "receipts_select" ON storage.objects;
CREATE POLICY "receipts_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'receipts'
    AND auth.role() = 'authenticated'
  );

-- ========== 012: IMAGE_URL NA ROOMS ==========
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ========== 013: PAYMENT_REQUESTS ==========
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

CREATE INDEX IF NOT EXISTS idx_payment_requests_split ON payment_requests(split_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_payment_requests_room ON payment_requests(room_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_payment_requests_requester ON payment_requests(requester_id);

ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Room members can view payment requests" ON payment_requests;
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

DROP POLICY IF EXISTS "Users can create own payment requests" ON payment_requests;
CREATE POLICY "Users can create own payment requests"
  ON payment_requests FOR INSERT
  WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS "Expense creators can update payment requests" ON payment_requests;
CREATE POLICY "Expense creators can update payment requests"
  ON payment_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM expenses
      WHERE expenses.id = payment_requests.expense_id
        AND expenses.created_by = auth.uid()
    )
  );

-- ========== 014: ADMIN ==========
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_profiles_admin ON profiles(is_admin) WHERE is_admin = true;

-- =============================================
-- PRONTO! Todas as tabelas, policies, indexes,
-- views e storage bucket criados.
-- =============================================
