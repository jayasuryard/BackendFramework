'use strict';

/**
 * Logger - lightweight structured logger used across the framework.
 * Writes human-readable lines to stdout and JSON lines to logs/app.log.
 */

const fs = require('fs');
const path = require('path');

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

let logDir = path.join(process.cwd(), 'logs');
let minLevel = LEVELS[(process.env.LOG_LEVEL || 'info').toLowerCase()] || LEVELS.info;

function ensureDir() {
  try {
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  } catch (_) {
    /* ignore */
  }
}

function color(level, text) {
  const codes = { debug: 90, info: 36, warn: 33, error: 31 };
  const c = codes[level] || 37;
  return `\u001b[${c}m${text}\u001b[0m`;
}

function write(level, message, meta) {
  if (LEVELS[level] < minLevel) return;
  const ts = new Date().toISOString();
  const line = `${ts} ${color(level, level.toUpperCase().padEnd(5))} ${message}`;
  // eslint-disable-next-line no-console
  console.log(meta ? `${line} ${safeJson(meta)}` : line);
  ensureDir();
  try {
    fs.appendFileSync(
      path.join(logDir, 'app.log'),
      JSON.stringify({ ts, level, message, ...(meta || {}) }) + '\n'
    );
  } catch (_) {
    /* ignore */
  }
}

function safeJson(obj) {
  try {
    return JSON.stringify(obj);
  } catch (_) {
    return '[unserializable]';
  }
}

module.exports = {
  configure(opts = {}) {
    if (opts.dir) logDir = opts.dir;
    if (opts.level) minLevel = LEVELS[opts.level] || minLevel;
  },
  debug: (m, meta) => write('debug', m, meta),
  info: (m, meta) => write('info', m, meta),
  warn: (m, meta) => write('warn', m, meta),
  error: (m, meta) => write('error', m, meta),
};
