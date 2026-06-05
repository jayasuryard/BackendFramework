'use strict';

const { BaseInitialize } = require('@ryoforge17/cli');

/** Auto-generated route: POST /auth/refreshToken */
class AuthRefreshTokenInitialize extends BaseInitialize {
  constructor() {
    super();
    this.initializer = {
      ...this.initializer,
      isSecured: false,
      requestMethod: ['POST'],
      version: 'v1',
      rateLimit: 60,
      tags: ['Auth'],
      summary: 'Exchange a refresh token for a new access token',
    };
  }

  getParameter() {
    return {
      refreshToken: { type: 'string', required: true, example: '<jwt>' },
    };
  }

  getResponses() {
    return { TOKEN_REFRESHED: { accessToken: 'jwt' }, INVALID_TOKEN: {} };
  }
}

module.exports = AuthRefreshTokenInitialize;
