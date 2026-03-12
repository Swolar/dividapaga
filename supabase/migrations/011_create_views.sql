-- View de balanco por usuario por sala
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

-- Storage bucket para comprovantes
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: membros da sala podem fazer upload
CREATE POLICY "receipts_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'receipts'
    AND auth.role() = 'authenticated'
  );

-- Policy: membros da sala podem ler comprovantes
CREATE POLICY "receipts_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'receipts'
    AND auth.role() = 'authenticated'
  );
