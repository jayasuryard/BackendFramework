'use strict';

const { BaseAction } = require('@ryoforge17/cli');

class AuthLogoutAction extends BaseAction {
  async executeMethod() {
    // Stateless JWT: logout is a client-side token discard. For server-side
    // revocation, push this.auth.id + token jti into a Redis denylist here.
    this.setResponse('LOGOUT_SUCCESS', { userId: this.auth?.id || null });
  }
}

module.exports = AuthLogoutAction;
