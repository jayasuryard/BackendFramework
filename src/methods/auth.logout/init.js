'use strict';

const { BaseInitialize } = require('ryoforge-runtime-framework');

/** Auto-generated route: POST /auth/logout */
class AuthLogoutInitialize extends BaseInitialize {
  constructor() {
    super();
    this.initializer = {
      ...this.initializer,
      isSecured: true,
      requestMethod: ['POST'],
      version: 'v1',
      tags: ['Auth'],
      summary: 'Log out the current session',
    };
  }

  getParameter() {
    return {};
  }

  getResponses() {
    return { LOGOUT_SUCCESS: {} };
  }
}

module.exports = AuthLogoutInitialize;
