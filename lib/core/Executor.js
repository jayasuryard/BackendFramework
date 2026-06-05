'use strict';

const registry = require('./Registry');
const RouteResolver = require('./RouteResolver');
const Validator = require('./Validator');
const ResponseBuilder = require('./ResponseBuilder');
const logger = require('./logger');
const {
  FrameworkError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  NotFoundError,
} = require('./errors');
const jwt = require('../security/jwt');
const rbac = require('../security/rbac');
const rateLimit = require('../security/rateLimit');

/**
 * Executor - the single execution pipeline for every transport.
 *
 *   resolve -> load init -> validate -> authenticate -> authorize ->
 *   rate limit -> load action -> execute -> build response -> log -> return
 *
 * Returns a canonical envelope { responseCode, responseMessage, responseData,
 * requestId, meta } plus an httpStatus hint for HTTP transports.
 */
const Executor = {
  /**
   * @param {ExecutorContext} ctx
   * @returns {Promise<{ envelope: object, httpStatus: number }>}
   */
  async execute(ctx) {
    try {
      const descriptor = this.resolve(ctx);
      ctx.descriptor = descriptor;
      ctx.methodName = descriptor.name;

      this.checkRequestMethod(ctx, descriptor);
      this.validateInput(ctx, descriptor);
      await this.authenticate(ctx, descriptor);
      this.authorize(ctx, descriptor);
      this.applyRateLimit(ctx, descriptor);

      const result = await this.runAction(ctx, descriptor);
      const envelope = this.buildResponse(ctx, result);
      this.log(ctx, envelope, null);
      return { envelope, httpStatus: ResponseBuilder.httpStatusFor(result.key) || 200 };
    } catch (err) {
      const fe = err instanceof FrameworkError ? err : this.wrap(err);
      const { envelope, httpStatus } = ResponseBuilder.buildError(fe, ctx);
      this.log(ctx, envelope, fe);
      return { envelope, httpStatus };
    }
  },

  /** Resolve a MethodDescriptor from route or explicit method name. */
  resolve(ctx) {
    let name = ctx.methodName;
    if (!name && ctx.route) name = registry.resolveRoute(ctx.method, ctx.route);
    if (!name && ctx.route) name = RouteResolver.toMethodName(ctx.route);
    const descriptor = name && registry.getMethod(name);
    if (!descriptor) throw new NotFoundError('ROUTE_NOT_FOUND');
    return descriptor;
  },

  checkRequestMethod(ctx, descriptor) {
    // Cron/internal/queue transports bypass the HTTP verb gate.
    if (['cron', 'internal', 'queue'].includes(ctx.transport)) return;
    if (!descriptor.requestMethods.includes(ctx.method)) {
      throw new FrameworkError('METHOD_NOT_ALLOWED', { httpStatus: 405 });
    }
  },

  validateInput(ctx, descriptor) {
    const source = {
      ...ctx.query,
      ...ctx.params,
      ...ctx.body,
    };
    ctx.input = Validator.validate(descriptor.getParameter(), source);
  },

  async authenticate(ctx, descriptor) {
    const meta = descriptor.meta || {};
    if (!meta.isSecured) return;

    // Trusted internal calls may supply a pre-authenticated principal. RBAC is
    // still enforced in authorize(); only token extraction is skipped.
    if (ctx.transport === 'internal' && ctx.auth) return;

    if (meta.auth === 'apikey') {
      const provided = ctx.header('x-api-key');
      const expected = process.env.API_KEY;
      if (!expected || provided !== expected) throw new AuthenticationError('INVALID_API_KEY');
      ctx.auth = { id: 'api-key', roles: ['service'], permissions: ['*'] };
      return;
    }

    // Default: JWT bearer.
    const authz = ctx.header('authorization') || '';
    const token = authz.startsWith('Bearer ') ? authz.slice(7) : ctx.header('x-access-token');
    if (!token) throw new AuthenticationError('UNAUTHORIZED');
    try {
      const principal = jwt.verify(token);
      ctx.auth = {
        id: principal.id || principal.sub,
        roles: principal.roles || [],
        permissions: principal.permissions || [],
        raw: principal,
      };
    } catch (e) {
      throw new AuthenticationError('INVALID_TOKEN');
    }
  },

  authorize(ctx, descriptor) {
    const meta = descriptor.meta || {};
    if (!meta.isSecured) return;
    if (!rbac.authorize(ctx.auth, meta)) throw new AuthorizationError('FORBIDDEN');
  },

  applyRateLimit(ctx, descriptor) {
    const limit = descriptor.meta?.rateLimit || 0;
    if (!limit) return;
    const identity = ctx.auth?.id || ctx.clientIp;
    const { allowed } = rateLimit.consume(identity, descriptor.name, limit);
    if (!allowed) throw new RateLimitError();
  },

  async runAction(ctx, descriptor) {
    const action = new descriptor.ActionClass();
    action._bind(ctx);
    const returned = await action.executeMethod();
    const data = action._responseData && Object.keys(action._responseData).length
      ? action._responseData
      : returned ?? {};
    return { key: action._responseKey, data, meta: action._meta };
  },

  buildResponse(ctx, result) {
    return ResponseBuilder.build(result.key, result.data, ctx, result.meta);
  },

  wrap(err) {
    logger.error(`Unhandled error in executor: ${err.message}`, { stack: err.stack });
    return new FrameworkError('INTERNAL_ERROR', { httpStatus: 500, cause: err });
  },

  log(ctx, envelope, err) {
    const durationMs = Date.now() - ctx.startedAt;
    const payload = {
      requestId: ctx.requestId,
      transport: ctx.transport,
      method: ctx.methodName || ctx.route,
      verb: ctx.method,
      code: envelope.responseCode,
      durationMs,
      ip: ctx.clientIp,
    };
    if (err) logger.warn(`${ctx.methodName || ctx.route} -> ${envelope.responseCode}`, payload);
    else logger.info(`${ctx.methodName || ctx.route} -> ${envelope.responseCode}`, payload);
  },
};

module.exports = Executor;
