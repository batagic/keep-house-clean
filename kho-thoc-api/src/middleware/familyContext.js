function requireFamilyId(req, res, next) {
  const familyId = String(req.headers['x-family-id'] || '').trim();
  if (!familyId) {
    res.status(400).json({ result: 'error', message: 'Thiếu X-Family-Id' });
    return;
  }
  req.familyId = familyId;
  next();
}

module.exports = { requireFamilyId };
