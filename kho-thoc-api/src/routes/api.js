const express = require('express');
const { readProfiles, writeProfile, deleteProfile } = require('../services/profiles');
const { readLogs, writeLog, deleteLog } = require('../services/logs');
const { redeemWithPasscode } = require('../services/redeem');
const { requireFamilyId } = require('../middleware/familyContext');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const type = req.query.type || 'all';

    if (type === 'ping') {
      return res.json({ result: 'ok', ts: Date.now() });
    }

    const familyId = String(req.headers['x-family-id'] || '').trim();
    if (!familyId) {
      return res.status(400).json({ result: 'error', message: 'Thiếu X-Family-Id' });
    }

    if (type === 'profiles') {
      const profiles = await readProfiles(familyId);
      return res.json({ profiles });
    }

    if (type === 'logs') {
      const profileId = req.query.profileId || '';
      const limit = parseInt(req.query.limit || '0', 10) || 0;
      const offset = parseInt(req.query.offset || '0', 10) || 0;
      const data = await readLogs({ profileId, limit, offset, familyId });
      return res.json(data);
    }

    const [profiles, allLogs] = await Promise.all([
      readProfiles(familyId),
      readLogs({ familyId }),
    ]);

    return res.json({
      profiles,
      logs: allLogs.logs,
      total: allLogs.total,
    });
  } catch (err) {
    console.error('GET error:', err);
    const status = err.status || 500;
    res.status(status).json({ result: 'error', message: err.message });
  }
});

router.post('/', requireFamilyId, async (req, res) => {
  try {
    const params = req.body || {};
    const familyId = req.familyId;
    let result;

    switch (params.type) {
      case 'redeem':
        result = await redeemWithPasscode(params, familyId);
        break;
      case 'log':
        if (String(params.tasks || '') === 'REDEEM') {
          res.status(403).json({
            result: 'error',
            message: 'Đổi quà cần mã xác nhận. Dùng type=redeem.',
          });
          return;
        }
        result = await writeLog(params, familyId);
        break;
      case 'delete_log':
        result = await deleteLog(params, familyId);
        break;
      case 'delete_profile':
        result = await deleteProfile(params, familyId);
        break;
      case 'profile':
      default:
        result = await writeProfile(params, familyId);
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
