'use strict';

const { BaseInitialize } = require('@ryoforge17/cli');

/** Auto-generated route: PUT /user/update */
class UserUpdateInitialize extends BaseInitialize {
  constructor() {
    super();
    this.initializer = {
      ...this.initializer,
      isSecured: true,
      requestMethod: ['PUT'],
      version: 'v1',
      permissions: ['USER_UPDATE'],
      tags: ['User'],
      summary: 'Update an existing user',
    };
  }

  getParameter() {
    return {
      id: { type: 'uuid', required: true, example: '00000000-0000-0000-0000-000000000000' },
      name: { type: 'string', required: false, minLength: 2, maxLength: 80 },
      status: { type: 'string', required: false, enum: ['active', 'inactive', 'deleted'] },
    };
  }

  getResponses() {
    return { USER_UPDATED: {}, USER_NOT_FOUND: {} };
  }
}

module.exports = UserUpdateInitialize;
