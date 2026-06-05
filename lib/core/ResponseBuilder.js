'use strict';

const registry = require('./Registry');
const i18n = require('./i18n');

/**
 * ResponseBuilder - converts a response key + data into the framework's
 * canonical envelope, translating the message for the request language.
 *
 *   { responseCode, responseMessage, responseData, requestId, meta }
 */
const ResponseBuilder = {
  /** Build a success/known-key response. */
  build(key, data = {}, ctx = {}, meta = {}) {
    const def = registry.responses[key] || registry.responses.UNKNOWN || {
      responseCode: 520,
      responseMessage: { en: key },
    };
    const message = i18n.resolve(def.responseMessage, ctx.lang);
    return {
      responseCode: def.responseCode,
      responseMessage: i18n.interpolate(message, data),
      responseData: data ?? {},
      requestId: ctx.requestId || null,
      ...(meta && Object.keys(meta).length ? { meta } : {}),
    };
  },

  /** Build an error response from a FrameworkError or generic Error. */
  buildError(err, ctx = {}) {
    const key = err.responseKey || 'INTERNAL_ERROR';
    const envelope = this.build(key, err.data || {}, ctx);
    return { envelope, httpStatus: err.httpStatus || 500 };
  },

  /** HTTP status helper derived from responseCode for known-key responses. */
  httpStatusFor(key) {
    const def = registry.responses[key];
    if (!def) return 200;
    const code = def.responseCode;
    if (code >= 100 && code < 600) return code;
    return 200; // business codes (e.g. 1001) still return HTTP 200 by default
  },
};

module.exports = ResponseBuilder;
