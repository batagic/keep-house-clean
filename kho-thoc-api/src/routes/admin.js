const express = require('express');
const {
  verifyAdminPassword,
  signAdminToken,
  getPasscodeStatus,
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
    const status = await getPasscodeStatus();
    res.json({ result: 'success', ...status });
  } catch (err) {
    console.error('passcode status error:', err);
    res.status(500).json({ result: 'error', message: err.message });
  }
});

router.post('/passcode/generate', requireAdmin, async (req, res) => {
  try {
    const length = Number(req.body?.length) || 4;
    const data = await generateRedeemPasscode(req.admin.id, length);
    res.json({ result: 'success', ...data });
  } catch (err) {
    console.error('passcode generate error:', err);
    res.status(500).json({ result: 'error', message: err.message });
  }
});

router.post('/passcode/revoke', requireAdmin, async (_req, res) => {
  try {
    const revoked = await revokeActivePasscode();
    res.json({
      result: 'success',
      revoked,
      message: revoked ? 'Đã thu hồi mã đổi quà' : 'Không có mã active để thu hồi',
    });
  } catch (err) {
    console.error('passcode revoke error:', err);
    res.status(500).json({ result: 'error', message: err.message });
  }
});

module.exports = router;
