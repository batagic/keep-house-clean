const express = require('express');
const cors = require('cors');
const { port, basePath, corsOrigins } = require('./config');
const { pool } = require('./db');
const apiRouter = require('./routes/api');

const app = express();

app.use(cors({
  origin(origin, callback) {
    if (!origin || corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked: ${origin}`));
  },
}));

app.use(express.json({ limit: '256kb' }));
app.use(express.text({ type: 'text/plain', limit: '256kb' }));

app.use((req, res, next) => {
  if (typeof req.body === 'string' && req.body.trim().startsWith('{')) {
    try {
      req.body = JSON.parse(req.body);
    } catch {
      /* giữ nguyên string nếu không parse được */
    }
  }
  next();
});

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', ts: Date.now() });
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});

const mount = basePath || '/';
app.use(mount, apiRouter);

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ result: 'error', message: err.message || 'Internal error' });
});

app.listen(port, () => {
  console.log(`kho-thoc-api listening on :${port}${mount === '/' ? '' : mount}`);
});
