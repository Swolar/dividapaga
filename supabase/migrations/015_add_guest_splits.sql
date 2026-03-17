-- Migration 015: Add guest (external) participants to expense splits
-- Allows splits for people who are not room members

-- 1. Make user_id nullable (guests don't have accounts)
ALTER TABLE expense_splits ALTER COLUMN user_id DROP NOT NULL;

-- 2. Add guest_name column
ALTER TABLE expense_splits ADD COLUMN guest_name VARCHAR(100);

-- 3. Replace UNIQUE constraint with partial indexes
ALTER TABLE expense_splits DROP CONSTRAINT IF EXISTS expense_splits_expense_id_user_id_key;

-- Members: one split per user per expense
CREATE UNIQUE INDEX IF NOT EXISTS expense_splits_member_unique
  ON expense_splits (expense_id, user_id)
  WHERE user_id IS NOT NULL;

-- Guests: one split per guest name per expense
CREATE UNIQUE INDEX IF NOT EXISTS expense_splits_guest_unique
  ON expense_splits (expense_id, guest_name)
  WHERE guest_name IS NOT NULL;

-- 4. Ensure exactly one of user_id or guest_name is set
ALTER TABLE expense_splits ADD CONSTRAINT split_member_or_guest
  CHECK (
    (user_id IS NOT NULL AND guest_name IS NULL)
    OR (user_id IS NULL AND guest_name IS NOT NULL)
  );
