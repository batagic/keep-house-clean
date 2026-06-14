const express = require('express');
const {
  verifyAdminPassword,
  signAdminToken,
  listPasscodesWithProfiles,
  generateRedeemPasscode,
  revokeActivePasscode,
} = require('../services/auth');
const { requireAdmin } = require('../middleware/requireAdmin');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');

    if (!username || !password) {
      res.status(400).json({ result: 'error', message: 'Thiếu username hoặc password' });
      return;
    }

    const admin = await verifyAdminPassword(username, password);
    if (!admin) {
      res.status(401).json({ result: 'error', message: 'Sai tài khoản hoặc mật khẩu' });
      return;
    }

    const session = signAdminToken(admin);
    res.json({ result: 'success', ...session });
  } catch (err) {
    console.error('admin login error:', err);
    res.status(500).json({ result: 'error', message: err.message });
  }
});

router.get('/passcode', requireAdmin, async (_req, res) => {
  try {
    const profiles = await listPasscodesWithProfiles();
    res.json({ result: 'success', profiles });
  } catch (err) {
    console.error('passcode list error:', err);
    res.status(500).json({ result: 'error', message: err.message });
  }
});

router.post('/passcode/generate', requireAdmin, async (req, res) => {
  try {
    const profileId = String(req.body?.profileId || '').trim();
    const length = Number(req.body?.length) || 4;

    if (!profileId) {
      res.status(400).json({ result: 'error', message: 'Thiếu profileId' });
      return;
    }

    const data = await generateRedeemPasscode(req.admin.id, profileId, length);
    res.json({ result: 'success', ...data });
  } catch (err) {
    console.error('passcode generate error:', err);
    const status = err.status || 500;
    res.status(status).json({ result: 'error', message: err.message });
  }
});

router.post('/passcode/revoke', requireAdmin, async (req, res) => {
  try {
    const profileId = String(req.body?.profileId || '').trim();

    if (!profileId) {
      res.status(400).json({ result: 'error', message: 'Thiếu profileId' });
      return;
    }

    const revoked = await revokeActivePasscode(profileId);
    res.json({
      result: 'success',
      revoked,
      message: revoked
        ? 'Đã thu hồi mã đổi quà của bé'
        : 'Bé này không có mã active để thu hồi',
    });
  } catch (err) {
    console.error('passcode revoke error:', err);
    const status = err.status || 500;
    res.status(status).json({ result: 'error', message: err.message });
  }
});

module.exports = router;
