'use strict';

const { BaseInitialize } = require('@ryoforge17/cli');

/** Auto-generated route: GET /user/details */
class UserDetailsInitialize extends BaseInitialize {
  constructor() {
    super();
    this.initializer = {
      ...this.initializer,
      isSecured: true,
      requestMethod: ['GET'],
      version: 'v1',
      tags: ['User'],
      summary: 'Fetch a single user by id',
    };
  }

  getParameter() {
    return {
      id: { type: 'uuid', required: true, in: 'query', example: '00000000-0000-0000-0000-000000000000' },
    };
  }

  getResponses() {
    return { USER_DETAILS: {}, USER_NOT_FOUND: {} };
  }
}

module.exports = UserDetailsInitialize;
