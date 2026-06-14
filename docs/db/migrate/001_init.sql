-- Phase 1: single family, no auth
-- Chạy: npm run migrate  (hoặc psql -f migrations/001_init.sql)

CREATE TABLE IF NOT EXISTS profiles (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL DEFAULT '',
  avatar      TEXT NOT NULL DEFAULT '👶',
  total_grain INTEGER NOT NULL DEFAULT 0,
  total_exp   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS logs (
  id           SERIAL PRIMARY KEY,
  profile_id   TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profile_name TEXT NOT NULL DEFAULT '',
  date         TEXT NOT NULL,
  grain        INTEGER NOT NULL DEFAULT 0,
  exp          INTEGER NOT NULL DEFAULT 0,
  tasks        TEXT NOT NULL DEFAULT '',
  bonus        BOOLEAN NOT NULL DEFAULT FALSE,
  note         TEXT NOT NULL DEFAULT '',
  UNIQUE (profile_id, date)
);

CREATE INDEX IF NOT EXISTS idx_logs_profile_date ON logs (profile_id, date DESC);
