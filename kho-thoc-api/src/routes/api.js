const express = require('express');
const { readProfiles, writeProfile } = require('../services/profiles');
const { readLogs, writeLog, deleteLog } = require('../services/logs');

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
      case 'log':
        result = await writeLog(params);
        break;
      case 'delete_log':
        result = await deleteLog(params);
        break;
      case 'profile':
      default:
        result = await writeProfile(params);
        break;
    }

    res.json(result);
  } catch (err) {
    console.error('POST error:', err);
    res.status(500).json({ result: 'error', message: err.message });
  }
});

module.exports = router;
