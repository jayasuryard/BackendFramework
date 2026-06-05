'use strict';

const { BaseAction, jwt } = require('ryoforge-runtime-framework');

class AuthLoginAction extends BaseAction {
  async executeMethod() {
    const UserLib = this.lib('user');
    const user = await UserLib.findOne({ email: this.email });
    if (!user || !UserLib.verifyPassword(user, this.password)) {
      this.throwError('INVALID_CREDENTIALS', { httpStatus: 401 });
    }
    const accessToken = jwt.sign({
      id: user.id,
      roles: user.roles,
      permissions: user.permissions,
    });
    const refreshToken = jwt.sign({ id: user.id, type: 'refresh' }, { expiresIn: '7d' });
    this.setResponse('LOGIN_SUCCESS', { accessToken, refreshToken, user: UserLib.sanitize(user) });
  }
}

module.exports = AuthLoginAction;
