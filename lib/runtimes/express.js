'use strict';

const express = require('express');
const cors = require('cors');
const registry = require('../core/Registry');
const Executor = require('../core/Executor');
const ExecutorContext = require('../core/ExecutorContext');
const loaders = require('../core/MethodLoader');
const logger = require('../core/logger');
const postman = require('../generators/postman');
const swagger = require('../generators/swagger');

/**
 * Express runtime - turns the discovered registry into a running HTTP server.
 * Every method route is wired to flow through the Executor. There is no manual
 * route registration: routes come entirely from method folder names.
 */
function buildApp(appRoot = process.cwd()) {
  loaders.bootstrap(appRoot);

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: process.env.BODY_LIMIT || '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request id passthrough.
  app.use((req, _res, next) => {
    req.requestId = req.headers['x-request-id'] || ExecutorContext.generateId();
    next();
  });

  // Built-in framework endpoints.
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      methods: registry.methods.size,
      tasks: registry.tasks.size,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/postman', (req, res) => {
    const collection = postman.generate();
    if (req.query.download !== 'false') {
      res.setHeader('Content-Disposition', 'attachment; filename="rrf.postman_collection.json"');
    }
    res.json(collection);
  });

  app.get('/swagger.json', (_req, res) => res.json(swagger.generate()));
  app.get('/swagger', (_req, res) => res.type('html').send(swagger.uiHtml()));

  app.get('/methods', (_req, res) => {
    res.json(
      registry.listMethods().map((m) => ({
        name: m.name,
        route: m.route,
        methods: m.requestMethods,
        secured: m.meta.isSecured,
        tags: m.meta.tags,
        version: m.meta.version,
      }))
    );
  });

  // Register a single dynamic handler per (verb, route) discovered.
  for (const [routeKey, methodName] of registry.routes.entries()) {
    const [verb, route] = routeKey.split(' ');
    const expressVerb = verb.toLowerCase();
    if (typeof app[expressVerb] !== 'function') continue;
    app[expressVerb](route, makeHandler(methodName));
    logger.debug(`Route mapped: ${verb} ${route} -> ${methodName}`);
  }

  // 404 + error fallbacks.
  app.use((req, res) => {
    res.status(404).json({
      responseCode: 404,
      responseMessage: 'Route not found',
      responseData: {},
      requestId: req.requestId,
    });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    logger.error(`Express error: ${err.message}`, { stack: err.stack });
    res.status(500).json({
      responseCode: 500,
      responseMessage: 'Internal server error',
      responseData: {},
      requestId: req.requestId,
    });
  });

  return app;
}

function makeHandler(methodName) {
  return async (req, res) => {
    const ctx = new ExecutorContext({
      transport: 'http',
      method: req.method,
      route: req.route?.path || req.path,
      methodName,
      headers: req.headers,
      params: req.params,
      query: req.query,
      body: req.body,
      requestId: req.requestId,
      raw: { req, res, ip: req.ip },
    });
    const { envelope, httpStatus } = await Executor.execute(ctx);
    res.status(httpStatus).json(envelope);
  };
}

function start(opts = {}) {
  const appRoot = opts.appRoot || process.cwd();
  const port = opts.port || process.env.PORT || 3000;
  const app = buildApp(appRoot);
  const server = app.listen(port, () => {
    logger.info(`RRF Express runtime listening on http://localhost:${port}`);
    logger.info(`Swagger UI:   http://localhost:${port}/swagger`);
    logger.info(`Postman:      http://localhost:${port}/postman`);
  });
  return { app, server };
}

module.exports = { buildApp, start };
