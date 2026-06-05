'use strict';

const SQLManager = require('./SQLManager');

/**
 * BaseLibrary - the data-access base every Library extends. It binds a Library
 * to a single table and exposes ergonomic CRUD on top of SQLManager so that
 * Methods never write SQL directly.
 *
 *   class UserLibrary extends BaseLibrary {
 *     constructor() { super('users'); }
 *   }
 */
class BaseLibrary {
  constructor(table, options = {}) {
    this.table = table;
    this.primaryKey = options.primaryKey || 'id';
    this.sql = SQLManager;
  }

  create(data) {
    return this.sql.insert(this.table, data);
  }

  findById(id, opts = {}) {
    return this.sql.findOne(this.table, { [this.primaryKey]: id }, opts);
  }

  findOne(where = {}, opts = {}) {
    return this.sql.findOne(this.table, where, opts);
  }

  find(opts = {}) {
    return this.sql.find(this.table, opts);
  }

  count(where = {}) {
    return this.sql.count(this.table, where);
  }

  async update(id, data) {
    const rows = await this.sql.update(this.table, { [this.primaryKey]: id }, data);
    return rows[0] || null;
  }

  updateWhere(where, data) {
    return this.sql.update(this.table, where, data);
  }

  delete(id) {
    return this.sql.delete(this.table, { [this.primaryKey]: id });
  }

  raw(query, params) {
    return this.sql.raw(query, params);
  }

  transaction(cb) {
    return this.sql.transaction(cb);
  }

  /** Paginated list: returns { items, total, page, pageSize }. */
  async paginate({ page = 1, pageSize = 20, where = {}, orderBy } = {}) {
    const limit = Math.max(1, Number(pageSize));
    const offset = (Math.max(1, Number(page)) - 1) * limit;
    const [items, total] = await Promise.all([
      this.sql.find(this.table, { where, limit, offset, orderBy }),
      this.sql.count(this.table, where),
    ]);
    return { items, total, page: Number(page), pageSize: limit };
  }
}

module.exports = BaseLibrary;
