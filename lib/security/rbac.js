'use strict';

/**
 * rbac - role & permission checks. A principal carries `roles` and/or
 * `permissions`. A method declares required `roles`/`permissions` in init.js.
 * Access is granted when the principal satisfies ALL declared permissions and
 * at least one declared role (when roles are declared).
 */
const RBAC = {
  hasPermissions(principal, required = []) {
    if (!required.length) return true;
    const granted = new Set([...(principal?.permissions || [])]);
    if (granted.has('*')) return true;
    return required.every((p) => granted.has(p));
  },

  hasRole(principal, roles = []) {
    if (!roles.length) return true;
    const granted = new Set([...(principal?.roles || [])]);
    if (granted.has('superadmin')) return true;
    return roles.some((r) => granted.has(r));
  },

  authorize(principal, meta = {}) {
    return (
      this.hasRole(principal, meta.roles || []) &&
      this.hasPermissions(principal, meta.permissions || [])
    );
  },
};

module.exports = RBAC;
