'use strict';

/**
 * RyoForge Runtime Framework (RRF) - public API surface.
 *
 * Application code imports from here:
 *   const { BaseAction, BaseInitialize, BaseLibrary, SQLManager } = require('@ryoforge17/cli');
 */
require('dotenv').config();

module.exports = {
  // Base classes for methods & libraries.
  BaseInitialize: require('./core/BaseInitialize'),
  BaseAction: require('./core/BaseAction'),
  BaseLibrary: require('./db/BaseLibrary'),

  // Core engine.
  Executor: require('./core/Executor'),
  ExecutorContext: require('./core/ExecutorContext'),
  Registry: require('./core/Registry'),
  RouteResolver: require('./core/RouteResolver'),
  Validator: require('./core/Validator'),
  ResponseBuilder: require('./core/ResponseBuilder'),
  i18n: require('./core/i18n'),
  logger: require('./core/logger'),
  loaders: require('./core/MethodLoader'),
  errors: require('./core/errors'),

  // Database.
  SQLManager: require('./db/SQLManager'),
  ConnectionPool: require('./db/ConnectionPool'),
  MigrationEngine: require('./db/MigrationEngine'),

  // Security.
  jwt: require('./security/jwt'),
  rbac: require('./security/rbac'),
  rateLimit: require('./security/rateLimit'),

  // Runtimes.
  express: require('./runtimes/express'),
  websocket: require('./runtimes/websocket'),
  cron: require('./runtimes/cron'),
  lambda: require('./runtimes/lambda'),
  serverless: require('./runtimes/serverless'),

  // Generators.
  postman: require('./generators/postman'),
  swagger: require('./generators/swagger'),

  /** Convenience: run an internal method call programmatically. */
  async call(methodName, body = {}, opts = {}) {
    const Executor = require('./core/Executor');
    const ExecutorContext = require('./core/ExecutorContext');
    require('./core/MethodLoader').bootstrap(opts.appRoot || process.cwd());
    const ctx = new ExecutorContext({
      transport: 'internal',
      method: opts.method || 'POST',
      methodName,
      headers: opts.headers || {},
      body,
    });
    if (opts.auth) ctx.auth = opts.auth;
    const { envelope } = await Executor.execute(ctx);
    return envelope;
  },
};
