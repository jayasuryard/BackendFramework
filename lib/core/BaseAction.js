'use strict';

const { FrameworkError } = require('./errors');

/**
 * BaseAction - every method's action.js extends this. It holds *business logic*
 * only. The Executor instantiates it, copies validated inputs onto `this`,
 * injects context, runs `executeMethod()` and reads back the chosen response.
 */
class BaseAction {
  constructor() {
    this._responseKey = 'SUCCESS';
    this._responseData = {};
    this._meta = {};
    this.context = null; // ExecutorContext
    this.input = {}; // validated inputs
    this.auth = null; // authenticated principal
  }

  /**
   * Bind runtime data onto the action instance. Called by the Executor before
   * `executeMethod`. Validated input keys are spread onto `this` for ergonomic
   * access (e.g. `this.email`) just like the framework spec shows.
   */
  _bind(context) {
    this.context = context;
    this.input = context.input;
    this.auth = context.auth;
    for (const [k, v] of Object.entries(context.input || {})) {
      if (!(k in this)) this[k] = v;
    }
  }

  /** Choose the response key (resolved against global responses.js). */
  setResponse(key, data) {
    this._responseKey = key;
    if (data !== undefined) this._responseData = data;
    return this;
  }

  /** Attach extra response metadata (pagination, totals, etc.). */
  setMeta(meta) {
    this._meta = { ...this._meta, ...meta };
    return this;
  }

  /** Throw a translated framework error from inside business logic. */
  throwError(key, opts) {
    throw new FrameworkError(key, opts);
  }

  /** Convenience accessor for a discovered library: this.lib('user'). */
  lib(name) {
    return require('./Registry').getLibrary(name);
  }

  /**
   * Implement business logic here. Return value becomes responseData unless
   * setResponse(key, data) was used explicitly.
   */
  // eslint-disable-next-line class-methods-use-this
  async executeMethod() {
    throw new Error('executeMethod() not implemented');
  }
}

module.exports = BaseAction;
