'use strict';

const { BaseAction } = require('@ryoforge17/cli');

class UserListAction extends BaseAction {
  async executeMethod() {
    const UserLib = this.lib('user');
    const result = await UserLib.list({ page: this.page, pageSize: this.pageSize });
    this.setResponse('USER_LIST', { items: result.items });
    this.setMeta({ total: result.total, page: result.page, pageSize: result.pageSize });
    return { items: result.items };
  }
}

module.exports = UserListAction;
