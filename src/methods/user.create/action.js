'use strict';

const { BaseAction } = require('ryoforge-runtime-framework');

/**
 * Business logic for "user.create". Validated inputs are on `this`.
 */
class UserCreateAction extends BaseAction {
  async executeMethod() {
    const UserLib = this.lib('user');
    try {
      const user = await UserLib.create({
        name: this.name,
        email: this.email,
        password: this.password,
        roles: this.roles || ['user'],
      });
      this.setResponse('USER_CREATED', user);
      return user;
    } catch (err) {
      if (err.code === 'EMAIL_TAKEN') this.throwError('EMAIL_TAKEN', { httpStatus: 409 });
      throw err;
    }
  }
}

module.exports = UserCreateAction;
