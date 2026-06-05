'use strict';

const { BaseInitialize } = require('ryoforge-runtime-framework');

/**
 * Metadata for "user.create".
 * Auto-generated route: POST /user/create
 */
class UserCreateInitialize extends BaseInitialize {
  constructor() {
    super();
    this.initializer = {
      ...this.initializer,
      isSecured: true,
      requestMethod: ['POST'],
      version: 'v1',
      rateLimit: 100,
      permissions: ['USER_CREATE'],
      roles: ['admin'],
      tags: ['User'],
      summary: 'Create a new user',
      description: 'Creates a user with a unique email and optional password.',
    };
  }

  getParameter() {
    return {
      name: { type: 'string', required: true, minLength: 2, maxLength: 80, example: 'Ada Lovelace' },
      email: { type: 'email', required: true, example: 'ada@example.com' },
      password: { type: 'string', required: false, minLength: 6, example: 'secret123' },
      roles: { type: 'array', required: false, example: ['user'] },
    };
  }

  getResponses() {
    return {
      USER_CREATED: { id: 'uuid', name: 'Ada Lovelace', email: 'ada@example.com' },
      EMAIL_TAKEN: {},
    };
  }
}

module.exports = UserCreateInitialize;
