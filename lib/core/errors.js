'use strict';

/**
 * FrameworkError - structured error that carries a response key so the
 * ResponseBuilder can translate it. Throw this from anywhere in a Method.
 */
class FrameworkError extends Error {
  /**
   * @param {string} responseKey - key present in global responses.js
   * @param {object} [opts]
   * @param {number} [opts.httpStatus]
   * @param {object} [opts.data]
   * @param {Error}  [opts.cause]
   */
  constructor(responseKey, opts = {}) {
    super(responseKey);
    this.name = 'FrameworkError';
    this.responseKey = responseKey;
    this.httpStatus = opts.httpStatus || 400;
    this.data = opts.data || {};
    if (opts.cause) this.cause = opts.cause;
  }
}

class ValidationError extends FrameworkError {
  constructor(errors) {
    super('VALIDATION_FAILED', { httpStatus: 422, data: { errors } });
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends FrameworkError {
  constructor(key = 'UNAUTHORIZED') {
    super(key, { httpStatus: 401 });
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends FrameworkError {
  constructor(key = 'FORBIDDEN') {
    super(key, { httpStatus: 403 });
    this.name = 'AuthorizationError';
  }
}

class RateLimitError extends FrameworkError {
  constructor() {
    super('RATE_LIMIT_EXCEEDED', { httpStatus: 429 });
    this.name = 'RateLimitError';
  }
}

class NotFoundError extends FrameworkError {
  constructor(key = 'ROUTE_NOT_FOUND') {
    super(key, { httpStatus: 404 });
    this.name = 'NotFoundError';
  }
}

module.exports = {
  FrameworkError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  NotFoundError,
};
