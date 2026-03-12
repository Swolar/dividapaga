-- ============================================
-- SCRIPT DE CORRECAO - Rodar no Supabase SQL Editor
-- Corrige migration 001 (profiles ja existe) e 011 (view + storage)
-- ============================================

-- 1) Garantir que a tabela profiles tem todas as colunas necessarias
DO $$
BEGIN
  -- Adicionar colunas que podem estar faltando
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'pix_key') THEN
    ALTER TABLE profiles ADD COLUMN pix_key TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'display_name') THEN
    ALTER TABLE profiles ADD COLUMN display_name TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- 2) RLS na profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies (com DROP IF EXISTS para evitar duplicatas)
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 3) Trigger para criar perfil automaticamente ao registrar
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

-- 4) Trigger updated_at
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

-- 5) View de balanco (OR REPLACE)
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

-- 6) Storage bucket para comprovantes
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Policies de storage (com DROP IF EXISTS)
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

-- Pronto! Todas as correcoes aplicadas.
