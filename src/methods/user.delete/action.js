'use strict';

const { BaseAction } = require('ryoforge-runtime-framework');

class UserDeleteAction extends BaseAction {
  async executeMethod() {
    const UserLib = this.lib('user');
    const removed = await UserLib.delete(this.id);
    if (!removed) this.throwError('USER_NOT_FOUND', { httpStatus: 404 });
    this.setResponse('USER_DELETED', { id: this.id });
  }
}

module.exports = UserDeleteAction;
