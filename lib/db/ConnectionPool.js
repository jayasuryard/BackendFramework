'use strict';

/**
 * ConnectionPool - lazy PostgreSQL connection pool. Uses `pg` when available;
 * otherwise exposes a clear error so the rest of the framework still loads.
 */
const logger = require('../core/logger');

let Pool = null;
try {
  // eslint-disable-next-line global-require
  ({ Pool } = require('pg'));
} catch (_) {
  Pool = null;
}

let pool = null;

function buildConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.DB_POOL_MAX || 10),
    };
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'rrf',
    max: Number(process.env.DB_POOL_MAX || 10),
    idleTimeoutMillis: 30000,
  };
}

module.exports = {
  get() {
    if (pool) return pool;
    if (!Pool) {
      throw new Error("PostgreSQL driver 'pg' is not installed. Run: npm install pg");
    }
    pool = new Pool(buildConfig());
    pool.on('error', (err) => logger.error(`PG pool error: ${err.message}`));
    logger.info('PostgreSQL pool created');
    return pool;
  },

  async query(text, params) {
    return this.get().query(text, params);
  },

  async end() {
    if (pool) {
      await pool.end();
      pool = null;
    }
  },

  isAvailable() {
    return Boolean(Pool);
  },
};
