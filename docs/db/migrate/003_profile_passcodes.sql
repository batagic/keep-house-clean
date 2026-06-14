-- Nâng cấp từ mã global (002 cũ) → mã theo từng bé

ALTER TABLE redeem_passcodes
  ADD COLUMN IF NOT EXISTS profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE;

-- Mã global cũ (không gắn bé) — xóa để admin sinh lại theo từng bé
DELETE FROM redeem_passcodes WHERE profile_id IS NULL;

ALTER TABLE redeem_passcodes
  ALTER COLUMN profile_id SET NOT NULL;

DROP INDEX IF EXISTS idx_redeem_passcodes_active;

CREATE INDEX IF NOT EXISTS idx_redeem_passcodes_profile_active
  ON redeem_passcodes (profile_id, created_at DESC)
  WHERE revoked_at IS NULL;
