'use strict';

const Executor = require('../core/Executor');
const ExecutorContext = require('../core/ExecutorContext');
const registry = require('../core/Registry');
const loaders = require('../core/MethodLoader');

/**
 * AWS Lambda runtime - a single handler that adapts API Gateway (REST & HTTP
 * API v2), ALB and direct invocation events into ExecutorContexts.
 *
 *   exports.handler = require('rrf').lambda.handler;
 */
function handler(appRoot = process.cwd()) {
  loaders.bootstrap(appRoot);

  return async function lambdaHandler(event, context) {
    const ctx = buildContext(event);
    const { envelope, httpStatus } = await Executor.execute(ctx);

    // Direct invocation (no HTTP wrapper) -> return the envelope as-is.
    if (!isHttpEvent(event)) return envelope;

    return {
      statusCode: httpStatus,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
    };
  };
}

function isHttpEvent(event) {
  return Boolean(event.requestContext || event.httpMethod || event.rawPath || event.path);
}

function buildContext(event) {
  // Direct invocation: { action, body, headers, method }
  if (!isHttpEvent(event)) {
    return new ExecutorContext({
      transport: 'lambda',
      method: event.method || 'POST',
      methodName: event.action,
      headers: event.headers || {},
      body: event.body || {},
      raw: { event },
    });
  }

  const method =
    event.httpMethod ||
    event.requestContext?.http?.method ||
    'POST';
  const path = event.path || event.rawPath || '/';
  let body = event.body || {};
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (_) {
      body = {};
    }
  }
  const methodName = registry.resolveRoute(method, path);

  return new ExecutorContext({
    transport: 'lambda',
    method,
    route: path,
    methodName,
    headers: event.headers || {},
    query: event.queryStringParameters || {},
    params: event.pathParameters || {},
    body,
    requestId: event.requestContext?.requestId,
    raw: { event },
  });
}

module.exports = { handler };
