'use strict';

const registry = require('./Registry');

/**
 * i18n - resolves a message template for a given language with graceful
 * fallback (requested lang -> default lang -> raw key). Supports {{var}}
 * interpolation against response data.
 */
const i18n = {
  defaultLang: process.env.DEFAULT_LANG || 'en',
  supported: ['en', 'hi', 'kn', 'ar', 'es', 'fr'],

  /**
   * Resolve a message. `message` may be a string or an object keyed by lang
   * (as stored in responses.js). Falls back through the language chain.
   */
  resolve(message, lang) {
    const target = (lang || this.defaultLang).toLowerCase();
    if (message && typeof message === 'object') {
      return (
        message[target] ||
        message[this.defaultLang] ||
        Object.values(message)[0] ||
        ''
      );
    }
    return String(message ?? '');
  },

  /** Look up a free-standing string from the i18n string tables. */
  t(key, lang, vars) {
    const target = (lang || this.defaultLang).toLowerCase();
    const table = registry.strings[target] || registry.strings[this.defaultLang] || {};
    const raw = table[key] ?? registry.strings[this.defaultLang]?.[key] ?? key;
    return this.interpolate(raw, vars);
  },

  interpolate(template, vars) {
    if (!vars || typeof template !== 'string') return template;
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) =>
      vars[k] !== undefined ? String(vars[k]) : `{{${k}}}`
    );
  },
};

module.exports = i18n;
