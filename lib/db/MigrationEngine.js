'use strict';

const fs = require('fs');
const path = require('path');
const pool = require('./ConnectionPool');
const logger = require('../core/logger');

/**
 * MigrationEngine - applies SQL migration files from /migrations in order and
 * tracks applied migrations in the rrf_migrations table.
 *
 * Each migration file is named `<timestamp>_<name>.sql` and may contain an
 * `-- @UP` and optional `-- @DOWN` section.
 */
const MigrationEngine = {
  dir: path.join(process.cwd(), 'migrations'),

  async ensureTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rrf_migrations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  },

  list() {
    if (!fs.existsSync(this.dir)) return [];
    return fs
      .readdirSync(this.dir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
  },

  parse(content) {
    const up = content.split(/--\s*@DOWN/i)[0].replace(/--\s*@UP/i, '').trim();
    const downMatch = content.split(/--\s*@DOWN/i)[1];
    return { up, down: downMatch ? downMatch.trim() : '' };
  },

  async applied() {
    await this.ensureTable();
    const res = await pool.query('SELECT name FROM rrf_migrations ORDER BY id');
    return new Set(res.rows.map((r) => r.name));
  },

  async up() {
    const applied = await this.applied();
    const files = this.list().filter((f) => !applied.has(f));
    if (!files.length) {
      logger.info('Migrations: nothing to apply');
      return [];
    }
    const done = [];
    for (const file of files) {
      const { up } = this.parse(fs.readFileSync(path.join(this.dir, file), 'utf8'));
      const client = await pool.get().connect();
      try {
        await client.query('BEGIN');
        if (up) await client.query(up);
        await client.query('INSERT INTO rrf_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        logger.info(`Migration applied: ${file}`);
        done.push(file);
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error(`Migration failed: ${file} - ${err.message}`);
        throw err;
      } finally {
        client.release();
      }
    }
    return done;
  },

  async down(steps = 1) {
    const applied = [...(await this.applied())];
    const toRollback = applied.slice(-steps).reverse();
    for (const file of toRollback) {
      const { down } = this.parse(fs.readFileSync(path.join(this.dir, file), 'utf8'));
      const client = await pool.get().connect();
      try {
        await client.query('BEGIN');
        if (down) await client.query(down);
        await client.query('DELETE FROM rrf_migrations WHERE name = $1', [file]);
        await client.query('COMMIT');
        logger.info(`Migration rolled back: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
  },

  async status() {
    const applied = await this.applied();
    return this.list().map((f) => ({ name: f, applied: applied.has(f) }));
  },
};

module.exports = MigrationEngine;
