require('dotenv').config();

const port = Number(process.env.PORT) || 3001;
const basePath = (process.env.BASE_PATH || '').replace(/\/$/, '');

module.exports = {
  port,
  basePath,
  databaseUrl: process.env.DATABASE_URL || '',
  corsOrigins: (process.env.CORS_ORIGINS || 'https://batagic.github.io,http://localhost:5500,http://127.0.0.1:5500')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
};
