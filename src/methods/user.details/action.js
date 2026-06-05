'use strict';

const { BaseAction } = require('ryoforge-runtime-framework');

class UserDetailsAction extends BaseAction {
  async executeMethod() {
    const UserLib = this.lib('user');
    const user = await UserLib.findById(this.id);
    if (!user) this.throwError('USER_NOT_FOUND', { httpStatus: 404 });
    this.setResponse('USER_DETAILS', user);
    return user;
  }
}

module.exports = UserDetailsAction;
