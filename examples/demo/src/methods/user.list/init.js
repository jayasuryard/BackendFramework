'use strict';

const { BaseInitialize } = require('@ryoforge17/cli');

/** Auto-generated route: GET /user/list */
class UserListInitialize extends BaseInitialize {
  constructor() {
    super();
    this.initializer = {
      ...this.initializer,
      isSecured: true,
      requestMethod: ['GET'],
      version: 'v1',
      permissions: ['USER_LIST'],
      tags: ['User'],
      summary: 'List users (paginated)',
    };
  }

  getParameter() {
    return {
      page: { type: 'integer', required: false, default: 1, min: 1, in: 'query', example: 1 },
      pageSize: { type: 'integer', required: false, default: 20, min: 1, max: 100, in: 'query', example: 20 },
    };
  }

  getResponses() {
    return { USER_LIST: { items: [], total: 0 } };
  }
}

module.exports = UserListInitialize;
