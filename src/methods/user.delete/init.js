'use strict';

const { BaseInitialize } = require('ryoforge-runtime-framework');

/** Auto-generated route: DELETE /user/delete */
class UserDeleteInitialize extends BaseInitialize {
  constructor() {
    super();
    this.initializer = {
      ...this.initializer,
      isSecured: true,
      requestMethod: ['DELETE'],
      version: 'v1',
      permissions: ['USER_DELETE'],
      roles: ['admin'],
      tags: ['User'],
      summary: 'Delete a user',
    };
  }

  getParameter() {
    return {
      id: { type: 'uuid', required: true, example: '00000000-0000-0000-0000-000000000000' },
    };
  }

  getResponses() {
    return { USER_DELETED: {}, USER_NOT_FOUND: {} };
  }
}

module.exports = UserDeleteInitialize;
