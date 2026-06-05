'use strict';

module.exports = {
  ROLES: { ADMIN: 'admin', USER: 'user', SUPERADMIN: 'superadmin' },
  STATUS: { ACTIVE: 'active', INACTIVE: 'inactive', DELETED: 'deleted' },
  PERMISSIONS: {
    USER_CREATE: 'USER_CREATE',
    USER_UPDATE: 'USER_UPDATE',
    USER_DELETE: 'USER_DELETE',
    USER_LIST: 'USER_LIST',
  },
};
