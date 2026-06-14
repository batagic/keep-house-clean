const { verifyAdminToken } = require('../services/auth');

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({ result: 'error', message: 'Cần đăng nhập admin' });
    return;
  }

  const admin = verifyAdminToken(match[1]);
  if (!admin) {
    res.status(401).json({ result: 'error', message: 'Phiên đăng nhập hết hạn' });
    return;
  }

  req.admin = admin;
  next();
}

module.exports = { requireAdmin };
