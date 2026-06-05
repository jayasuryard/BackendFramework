'use strict';

/**
 * HelperLibrary - small, reusable utilities available to every method via
 * this.lib('helper').
 */
class HelperLibrary {
  isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
  }

  pick(obj, keys) {
    const out = {};
    for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
    return out;
  }

  omit(obj, keys) {
    const set = new Set(keys);
    return Object.fromEntries(Object.entries(obj).filter(([k]) => !set.has(k)));
  }

  paginate(items, page = 1, pageSize = 20) {
    const start = (page - 1) * pageSize;
    return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
  }

  sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
}

module.exports = new HelperLibrary();
