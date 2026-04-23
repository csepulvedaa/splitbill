ALTER TABLE bills ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS bills_user_id_idx ON bills (user_id);
