'use strict';

const { BaseAction } = require('ryoforge-runtime-framework');

class UserUpdateAction extends BaseAction {
  async executeMethod() {
    const UserLib = this.lib('user');
    const patch = {};
    if (this.name !== undefined) patch.name = this.name;
    if (this.status !== undefined) patch.status = this.status;
    const user = await UserLib.update(this.id, patch);
    if (!user) this.throwError('USER_NOT_FOUND', { httpStatus: 404 });
    this.setResponse('USER_UPDATED', user);
    return user;
  }
}

module.exports = UserUpdateAction;
