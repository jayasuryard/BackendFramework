'use strict';

const { BaseAction, jwt } = require('ryoforge-runtime-framework');

class AuthRefreshTokenAction extends BaseAction {
  async executeMethod() {
    let payload;
    try {
      payload = jwt.verify(this.refreshToken);
    } catch (_) {
      this.throwError('INVALID_TOKEN', { httpStatus: 401 });
    }
    if (payload.type !== 'refresh') this.throwError('INVALID_TOKEN', { httpStatus: 401 });

    const UserLib = this.lib('user');
    const user = await UserLib.findById(payload.id);
    if (!user) this.throwError('USER_NOT_FOUND', { httpStatus: 404 });

    const accessToken = jwt.sign({ id: user.id, roles: user.roles, permissions: user.permissions });
    this.setResponse('TOKEN_REFRESHED', { accessToken });
  }
}

module.exports = AuthRefreshTokenAction;
