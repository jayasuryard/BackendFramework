'use strict';

/**
 * BaseInitialize - every method's init.js extends this.
 *
 * It declares *metadata* about the method: security, allowed verbs, version,
 * rate limit, permissions, tags and the parameter contract. The framework reads
 * this metadata to drive routing, validation, auth, Swagger and Postman.
 */
class BaseInitialize {
  constructor() {
    /**
     * Default initializer. Subclasses override fields in their constructor:
     *   this.initializer = { ...this.initializer, isSecured: true };
     */
    this.initializer = {
      isSecured: false,
      requestMethod: ['POST'],
      version: 'v1',
      rateLimit: 0, // 0 = unlimited
      permissions: [],
      roles: [],
      tags: ['Default'],
      summary: '',
      description: '',
      deprecated: false,
      socketAction: null, // override to expose over WebSocket
      auth: 'jwt', // jwt | apikey | none
    };
  }

  /**
   * Parameter contract. Return an object describing every accepted field.
   * Supported keys per field:
   *   type (string|number|integer|boolean|email|uuid|date|array|object),
   *   required, default, enum, min, max, minLength, maxLength, pattern,
   *   in (body|query|path|header), description, example, items (for arrays).
   */
  getParameter() {
    return {};
  }

  /** Optional: declare response examples keyed by response key. */
  getResponses() {
    return {};
  }
}

module.exports = BaseInitialize;
