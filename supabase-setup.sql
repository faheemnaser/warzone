-- Run this in your Supabase SQL Editor before deploying
-- Go to: https://supabase.com/dashboard/project/kbgsextjrvsifoprirze/sql/new

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (good practice)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Allow all operations (no auth on this app)
CREATE POLICY "Allow all" ON sessions FOR ALL USING (true) WITH CHECK (true);
