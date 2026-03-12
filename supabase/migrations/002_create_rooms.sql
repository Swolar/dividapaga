-- Tabela de salas
CREATE TABLE rooms (
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

CREATE TRIGGER rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
