-- Phase 3: tách dữ liệu theo gia đình (family_id)

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS family_id TEXT;

-- Bé đã có trước khi bật multi-family → gán vào gia đình legacy (khớp LEGACY_FAMILY_ID trên frontend)
UPDATE profiles SET family_id = 'fam_v1_default' WHERE family_id IS NULL OR family_id = '';

ALTER TABLE profiles ALTER COLUMN family_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_family ON profiles (family_id);
