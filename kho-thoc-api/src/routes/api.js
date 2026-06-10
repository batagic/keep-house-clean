const express = require('express');
const { readProfiles, writeProfile, deleteProfile } = require('../services/profiles');
const { readLogs, writeLog, deleteLog } = require('../services/logs');
const { redeemWithPasscode } = require('../services/redeem');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const type = req.query.type || 'all';

    if (type === 'ping') {
      return res.json({ result: 'ok', ts: Date.now() });
    }

    if (type === 'profiles') {
      const profiles = await readProfiles();
      return res.json({ profiles });
    }

    if (type === 'logs') {
      const profileId = req.query.profileId || '';
      const limit = parseInt(req.query.limit || '0', 10) || 0;
      const offset = parseInt(req.query.offset || '0', 10) || 0;
      const data = await readLogs({ profileId, limit, offset });
      return res.json(data);
    }

    const [profiles, allLogs] = await Promise.all([
      readProfiles(),
      readLogs(),
    ]);

    return res.json({
      profiles,
      logs: allLogs.logs,
      total: allLogs.total,
    });
  } catch (err) {
    console.error('GET error:', err);
    res.status(500).json({ result: 'error', message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const params = req.body || {};
    let result;

    switch (params.type) {
      case 'redeem':
        result = await redeemWithPasscode(params);
        break;
      case 'log':
        if (String(params.tasks || '') === 'REDEEM') {
          res.status(403).json({
            result: 'error',
            message: 'Đổi quà cần mã xác nhận. Dùng type=redeem.',
          });
          return;
        }
        result = await writeLog(params);
        break;
      case 'delete_log':
        result = await deleteLog(params);
        break;
      case 'delete_profile':
        result = await deleteProfile(params);
        break;
      case 'profile':
      default:
        result = await writeProfile(params);
        break;
    }

    res.json(result);
  } catch (err) {
    console.error('POST error:', err);
    const status = err.status || 500;
    res.status(status).json({ result: 'error', message: err.message });
  }
});

module.exports = router;
