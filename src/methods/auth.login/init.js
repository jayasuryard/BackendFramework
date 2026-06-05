'use strict';

const { BaseInitialize } = require('ryoforge-runtime-framework');

/** Auto-generated route: POST /auth/login */
class AuthLoginInitialize extends BaseInitialize {
  constructor() {
    super();
    this.initializer = {
      ...this.initializer,
      isSecured: false,
      requestMethod: ['POST'],
      version: 'v1',
      rateLimit: 20,
      tags: ['Auth'],
      summary: 'Authenticate and obtain a JWT',
      description: 'Exchanges email + password for an access token.',
    };
  }

  getParameter() {
    return {
      email: { type: 'email', required: true, example: 'ada@example.com' },
      password: { type: 'string', required: true, example: 'secret123' },
    };
  }

  getResponses() {
    return { LOGIN_SUCCESS: { accessToken: 'jwt', user: {} }, INVALID_CREDENTIALS: {} };
  }
}

module.exports = AuthLoginInitialize;
