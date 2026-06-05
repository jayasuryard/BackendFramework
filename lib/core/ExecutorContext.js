'use strict';

/**
 * ExecutorContext - the normalized request object that flows through the
 * Executor pipeline regardless of transport (HTTP, WebSocket, Lambda, Cron...).
 *
 * Every transport adapter builds one of these and hands it to the Executor.
 */
class ExecutorContext {
  /**
   * @param {object} opts
   * @param {string} opts.transport   - http | ws | lambda | cron | queue | internal
   * @param {string} opts.method      - HTTP-style verb (POST/GET/...)
   * @param {string} [opts.route]     - resolved route, e.g. /user/create
   * @param {string} [opts.methodName]- explicit method name (e.g. user.create)
   * @param {object} [opts.headers]
   * @param {object} [opts.params]    - path params
   * @param {object} [opts.query]
   * @param {object} [opts.body]
   * @param {string} [opts.requestId]
   * @param {string} [opts.lang]
   * @param {object} [opts.raw]       - transport-specific raw objects (req,res,socket)
   */
  constructor(opts = {}) {
    this.transport = opts.transport || 'internal';
    this.method = (opts.method || 'POST').toUpperCase();
    this.route = opts.route || null;
    this.methodName = opts.methodName || null;
    this.headers = lowerKeys(opts.headers || {});
    this.params = opts.params || {};
    this.query = opts.query || {};
    this.body = opts.body || {};
    this.requestId = opts.requestId || generateId();
    this.lang = opts.lang || detectLang(this.headers);
    this.raw = opts.raw || {};

    // Populated during the pipeline:
    this.input = {}; // merged + validated params
    this.auth = null; // decoded principal { id, roles, permissions }
    this.startedAt = Date.now();
    this.descriptor = null; // resolved MethodDescriptor
  }

  get clientIp() {
    return (
      this.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      this.raw?.req?.socket?.remoteAddress ||
      this.raw?.ip ||
      'unknown'
    );
  }

  header(name) {
    return this.headers[String(name).toLowerCase()];
  }
}

function lowerKeys(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k.toLowerCase()] = v;
  return out;
}

function detectLang(headers) {
  const raw = headers['accept-language'];
  if (!raw) return process.env.DEFAULT_LANG || 'en';
  // "en-US,en;q=0.9,hi;q=0.8" -> "en"
  return raw.split(',')[0].split('-')[0].trim().toLowerCase();
}

function generateId() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  ).toUpperCase();
}

ExecutorContext.generateId = generateId;
module.exports = ExecutorContext;
