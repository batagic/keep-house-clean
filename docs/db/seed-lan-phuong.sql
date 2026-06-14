-- Seed bé Lan Phương (legacy) — nguồn: code/kho-thoc-api/data/*.csv
--
-- Khuyến nghị dùng script Node (tự sinh passcode bcrypt):
--   docker compose exec kho-thoc-api npm run seed:lan-phuong
--
-- SQL thủ công (không tạo passcode — vào admin Sinh mã mới sau đó):

\set ON_ERROR_STOP on

INSERT INTO profiles (id, name, avatar, total_grain, total_exp, family_id)
VALUES ('p_phuong', 'Lan Phương', '🐡', 674, 725, 'fam_v1_default')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  avatar = EXCLUDED.avatar,
  total_grain = EXCLUDED.total_grain,
  total_exp = EXCLUDED.total_exp,
  family_id = EXCLUDED.family_id;

INSERT INTO logs (profile_id, profile_name, date, grain, exp, tasks, bonus, note) VALUES
  ('p_phuong', 'Lan Phương', '2026-06-02 14:45', 70, 290, 't2,t3', false, ''),
  ('p_phuong', 'Lan Phương', '2026-06-06 12:43', 15, 10, 't3', false, 'Ở quê'),
  ('p_phuong', 'Lan Phương', '2026-06-06 12:44', 30, 25, 't10', false, ''),
  ('p_phuong', 'Lan Phương', '2026-06-07 10:00', 45, 35, 't3,t10', false, ''),
  ('p_phuong', 'Lan Phương', '2026-06-07 23:41', 15, 10, 't3', false, ''),
  ('p_phuong', 'Lan Phương', '2026-06-08 22:07', 55, 40, 't3,t5,t10', false, ''),
  ('p_phuong', 'Lan Phương', '2026-06-08 22:12', 12, 5, 't5', false, ''),
  ('p_phuong', 'Lan Phương', '2026-06-08 22:14', 12, 5, 't5', false, ''),
  ('p_phuong', 'Lan Phương', '2026-06-09 22:38', 96, 65, 't3,t9,t10', false, ''),
  ('p_phuong', 'Lan Phương', '2026-06-09 22:39', 15, 10, 't3', false, ''),
  ('p_phuong', 'Lan Phương', '2026-06-09 22:40', 10, 5, 't5', false, ''),
  ('p_phuong', 'Lan Phương', '2026-06-10 15:12', 25, 20, 't8', false, '')
ON CONFLICT (profile_id, date) DO UPDATE SET
  profile_name = EXCLUDED.profile_name,
  grain = EXCLUDED.grain,
  exp = EXCLUDED.exp,
  tasks = EXCLUDED.tasks,
  bonus = EXCLUDED.bonus,
  note = EXCLUDED.note;

-- Lưu ý: CSV có nhiều dòng trùng (profile_id, date) — DB chỉ giữ 1 dòng/ngày.
-- Số dư 674/725 lấy từ profiles.csv (không tính lại từ logs).
