'use strict';

const crypto = require('crypto');

/**
 * UserLibrary - data access for users.
 *
 * This demo implementation uses an in-memory store so the framework runs
 * out-of-the-box without PostgreSQL. In a real project, extend BaseLibrary:
 *
 *   const { BaseLibrary } = require('ryoforge-runtime-framework');
 *   class UserLibrary extends BaseLibrary { constructor() { super('users'); } }
 *
 * The method-facing interface (create/findOne/update/delete/...) is identical,
 * so swapping to the SQL-backed version requires no changes in any method.
 */
class UserLibrary {
  constructor() {
    this.store = new Map(); // id -> user
    this.byEmail = new Map(); // email -> id
  }

  hashPassword(password) {
    return crypto.createHash('sha256').update(String(password)).digest('hex');
  }

  async create({ name, email, password, roles = ['user'], permissions = [] }) {
    if (email && this.byEmail.has(email)) {
      const err = new Error('EMAIL_TAKEN');
      err.code = 'EMAIL_TAKEN';
      throw err;
    }
    const id = crypto.randomUUID();
    const user = {
      id,
      name,
      email,
      passwordHash: password ? this.hashPassword(password) : null,
      roles,
      permissions,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.store.set(id, user);
    if (email) this.byEmail.set(email, id);
    return this.sanitize(user);
  }

  async findById(id) {
    const user = this.store.get(id);
    return user ? this.sanitize(user) : null;
  }

  async findOne({ email } = {}) {
    if (email) {
      const id = this.byEmail.get(email);
      return id ? this.store.get(id) : null; // returns raw (with hash) for auth
    }
    return null;
  }

  async list({ page = 1, pageSize = 20 } = {}) {
    const all = [...this.store.values()].map((u) => this.sanitize(u));
    const start = (page - 1) * pageSize;
    return { items: all.slice(start, start + pageSize), total: all.length, page, pageSize };
  }

  async update(id, data) {
    const user = this.store.get(id);
    if (!user) return null;
    Object.assign(user, data, { updatedAt: new Date().toISOString() });
    return this.sanitize(user);
  }

  async delete(id) {
    const user = this.store.get(id);
    if (!user) return 0;
    if (user.email) this.byEmail.delete(user.email);
    this.store.delete(id);
    return 1;
  }

  verifyPassword(user, password) {
    return user && user.passwordHash === this.hashPassword(password);
  }

  sanitize(user) {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}

module.exports = new UserLibrary();
