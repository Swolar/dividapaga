-- Adiciona coluna image_url na tabela rooms
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS image_url TEXT;
