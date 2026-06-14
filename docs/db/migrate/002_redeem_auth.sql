-- Phase 2: passcode đổi quà + admin login

CREATE TABLE IF NOT EXISTS admin_users (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS redeem_passcodes (
  id              SERIAL PRIMARY KEY,
  profile_id      TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  passcode_hash   TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at      TIMESTAMPTZ,
  created_by      INT REFERENCES admin_users(id),
  last_used_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_redeem_passcodes_profile_active
  ON redeem_passcodes (profile_id, created_at DESC)
  WHERE revoked_at IS NULL;
