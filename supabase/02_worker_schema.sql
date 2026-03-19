-- ── Workers Table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow public read/insert for prototype simplicity so workers can auto-register
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public worker access" ON workers FOR ALL USING (true) WITH CHECK (true);

-- ── Modify Issues Table ────────────────────────────────────────────
ALTER TABLE issues 
ADD COLUMN IF NOT EXISTS worker_phone TEXT,
ADD COLUMN IF NOT EXISTS worker_name TEXT;

CREATE INDEX IF NOT EXISTS idx_issues_worker_phone ON issues(worker_phone);
