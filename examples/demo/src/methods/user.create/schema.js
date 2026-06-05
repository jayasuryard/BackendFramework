'use strict';

/**
 * Richer schema documentation for "user.create" (used by tests & tooling).
 * The framework's runtime validation is driven by init.getParameter().
 */
module.exports = {
  request: {
    type: 'object',
    required: ['name', 'email'],
    properties: {
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 6 },
      roles: { type: 'array', items: { type: 'string' } },
    },
  },
  response: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      email: { type: 'string' },
      roles: { type: 'array' },
    },
  },
};
