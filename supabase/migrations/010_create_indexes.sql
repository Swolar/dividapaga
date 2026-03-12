-- Indexes para performance
CREATE INDEX idx_room_members_user ON room_members(user_id) WHERE removed_at IS NULL;
CREATE INDEX idx_room_members_room ON room_members(room_id) WHERE removed_at IS NULL;
CREATE INDEX idx_expenses_room ON expenses(room_id) WHERE status = 'active';
CREATE INDEX idx_expense_splits_user ON expense_splits(user_id);
CREATE INDEX idx_expense_splits_unpaid ON expense_splits(user_id) WHERE is_paid = false;
CREATE INDEX idx_invite_links_token ON invite_links(token) WHERE is_revoked = false;
CREATE INDEX idx_activity_log_room ON activity_log(room_id, created_at DESC);
