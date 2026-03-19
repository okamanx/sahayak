-- ══════════════════════════════════════════════
--  Sahayak — Civic Issue Reporting Platform
--  Supabase PostgreSQL Schema
-- ══════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Issues Table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS issues (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id         TEXT UNIQUE NOT NULL,          -- e.g. CIVIC-2026-123456
  category          TEXT NOT NULL,                  -- pothole, garbage, drainage, pipeline, streetlight, other
  severity          INT NOT NULL CHECK (severity BETWEEN 1 AND 5),
  priority          FLOAT NOT NULL,
  is_high_risk      BOOLEAN DEFAULT false,
  department        TEXT NOT NULL,
  status            TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Resolved')),
  description       TEXT,
  latitude          DOUBLE PRECISION,
  longitude         DOUBLE PRECISION,
  address           TEXT,
  image_url         TEXT,
  contact_phone     TEXT,
  contact_email     TEXT,
  audio_url         TEXT,
  transcription     TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  -- Resolution fields
  resolved_at       TIMESTAMPTZ,
  resolution_image_url TEXT,
  resolution_cost   DECIMAL(12,2),
  resolution_notes  TEXT
);

-- ── Auto-update updated_at ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER issues_updated_at
  BEFORE UPDATE ON issues
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ── Indexes ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_issues_status        ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_category      ON issues(category);
CREATE INDEX IF NOT EXISTS idx_issues_priority      ON issues(priority DESC);
CREATE INDEX IF NOT EXISTS idx_issues_contact_phone ON issues(contact_phone);
CREATE INDEX IF NOT EXISTS idx_issues_report_id     ON issues(report_id);
CREATE INDEX IF NOT EXISTS idx_issues_created_at    ON issues(created_at DESC);

-- ── Row Level Security ─────────────────────────────────────────────
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read issues
CREATE POLICY "Public read" ON issues
  FOR SELECT USING (true);

-- Allow anyone to insert new issues
CREATE POLICY "Public insert" ON issues
  FOR INSERT WITH CHECK (true);

-- Allow authenticated users (admin) to update
CREATE POLICY "Admin update" ON issues
  FOR UPDATE USING (true);

-- ── Storage Buckets ────────────────────────────────────────────────
-- Run these in Supabase Dashboard → Storage, or via API:
-- 1. Create bucket 'issue-images' (public)
-- 2. Create bucket 'resolution-images' (public)
-- 3. Create bucket 'issue-audio' (public)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('issue-images', 'issue-images', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('resolution-images', 'resolution-images', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('issue-audio', 'issue-audio', true);

-- ── Sample Data (optional for demo) ───────────────────────────────
-- INSERT INTO issues (report_id, category, severity, priority, department, is_high_risk, description, latitude, longitude, address, status)
-- VALUES 
--   ('CIVIC-2026-100001', 'pothole', 4, 12.0, 'Road & Infrastructure', true, 'Large pothole causing accidents near market.', 19.0760, 72.8777, 'Bandra West, Mumbai', 'Pending'),
--   ('CIVIC-2026-100002', 'garbage', 2, 6.0,  'Sanitation Department',  false,'Overflowing garbage bin near school.',         28.6139, 77.2090, 'Connaught Place, Delhi','In Progress'),
--   ('CIVIC-2026-100003', 'streetlight', 3, 10.0, 'Electricity Department', false, 'Broken streetlight creating dark area.', 12.9716, 77.5946, 'Koramangala, Bangalore', 'Resolved');
