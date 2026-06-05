'use strict';

const pool = require('./ConnectionPool');

/**
 * SQLManager - a small, safe query builder + data-access façade over the
 * PostgreSQL pool. All values are parameterized ($1, $2 ...) to avoid SQL
 * injection. Methods never call this directly — Libraries do.
 */
const OPERATORS = {
  eq: '=', ne: '!=', gt: '>', gte: '>=', lt: '<', lte: '<=', like: 'ILIKE',
};

function buildWhere(where, startIndex = 1) {
  const keys = Object.keys(where || {});
  if (!keys.length) return { clause: '', values: [], next: startIndex };
  const parts = [];
  const values = [];
  let i = startIndex;
  for (const key of keys) {
    const val = where[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      // operator object: { op: 'gte', value: 5 }
      const op = OPERATORS[val.op] || '=';
      parts.push(`"${key}" ${op} $${i}`);
      values.push(val.value);
      i += 1;
    } else if (Array.isArray(val)) {
      const placeholders = val.map(() => `$${i++}`).join(', ');
      parts.push(`"${key}" IN (${placeholders})`);
      values.push(...val);
    } else {
      parts.push(`"${key}" = $${i}`);
      values.push(val);
      i += 1;
    }
  }
  return { clause: `WHERE ${parts.join(' AND ')}`, values, next: i };
}

/**
 * Build a data-access API bound to a specific executor (the pool by default,
 * or a single transaction client). The `exec(sql, params)` contract is all
 * that differs between the two.
 */
function makeApi(exec) {
  const api = {
    /** Find many rows. opts: { where, columns, orderBy, limit, offset } */
    async find(table, opts = {}) {
      const cols = opts.columns ? opts.columns.map((c) => `"${c}"`).join(', ') : '*';
      const { clause, values } = buildWhere(opts.where);
      let sql = `SELECT ${cols} FROM "${table}" ${clause}`;
      if (opts.orderBy) sql += ` ORDER BY ${opts.orderBy}`;
      if (opts.limit) sql += ` LIMIT ${Number(opts.limit)}`;
      if (opts.offset) sql += ` OFFSET ${Number(opts.offset)}`;
      const res = await exec(sql, values);
      return res.rows;
    },

    /** Find a single row or null. */
    async findOne(table, where = {}, opts = {}) {
      const rows = await api.find(table, { ...opts, where, limit: 1 });
      return rows[0] || null;
    },

    /** Count rows. */
    async count(table, where = {}) {
      const { clause, values } = buildWhere(where);
      const res = await exec(`SELECT COUNT(*)::int AS count FROM "${table}" ${clause}`, values);
      return res.rows[0].count;
    },

    /** Insert one row, returning the created row. */
    async insert(table, data) {
      const keys = Object.keys(data);
      const cols = keys.map((k) => `"${k}"`).join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const values = keys.map((k) => data[k]);
      const sql = `INSERT INTO "${table}" (${cols}) VALUES (${placeholders}) RETURNING *`;
      const res = await exec(sql, values);
      return res.rows[0];
    },

    /** Update rows matching where, returning updated rows. */
    async update(table, where, data) {
      const dataKeys = Object.keys(data);
      const setParts = dataKeys.map((k, i) => `"${k}" = $${i + 1}`);
      const values = dataKeys.map((k) => data[k]);
      const { clause, values: whereValues } = buildWhere(where, dataKeys.length + 1);
      const sql = `UPDATE "${table}" SET ${setParts.join(', ')} ${clause} RETURNING *`;
      const res = await exec(sql, [...values, ...whereValues]);
      return res.rows;
    },

    /** Delete rows matching where, returning deleted count. */
    async delete(table, where) {
      const { clause, values } = buildWhere(where);
      const res = await exec(`DELETE FROM "${table}" ${clause}`, values);
      return res.rowCount;
    },

    /** Run a raw parameterized query. */
    async raw(sql, params = []) {
      const res = await exec(sql, params);
      return res.rows;
    },
  };
  return api;
}

const SQLManager = makeApi((sql, params) => pool.query(sql, params));

/**
 * Run a function inside a transaction. The callback receives a `tx` object
 * exposing the same data-access methods bound to a single client.
 */
SQLManager.transaction = async function transaction(callback) {
  const client = await pool.get().connect();
  const tx = makeApi((sql, params) => client.query(sql, params));
  try {
    await client.query('BEGIN');
    const result = await callback(tx);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = SQLManager;
