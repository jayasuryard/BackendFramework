'use strict';

const fs = require('fs');
const path = require('path');
const registry = require('../core/Registry');
const loaders = require('../core/MethodLoader');

/**
 * Swagger / OpenAPI 3.0 generator - builds a full specification purely from
 * method metadata (init.js). No manual annotations anywhere.
 */
const TYPE_MAP = {
  string: { type: 'string' },
  email: { type: 'string', format: 'email' },
  uuid: { type: 'string', format: 'uuid' },
  date: { type: 'string', format: 'date-time' },
  number: { type: 'number' },
  float: { type: 'number', format: 'float' },
  integer: { type: 'integer' },
  boolean: { type: 'boolean' },
  array: { type: 'array', items: { type: 'string' } },
  object: { type: 'object' },
};

function schemaFor(rule) {
  const base = { ...(TYPE_MAP[rule.type] || TYPE_MAP.string) };
  if (rule.enum) base.enum = rule.enum;
  if (rule.example !== undefined) base.example = rule.example;
  if (rule.minLength !== undefined) base.minLength = rule.minLength;
  if (rule.maxLength !== undefined) base.maxLength = rule.maxLength;
  if (rule.min !== undefined) base.minimum = rule.min;
  if (rule.max !== undefined) base.maximum = rule.max;
  if (rule.pattern) base.pattern = rule.pattern;
  if (rule.description) base.description = rule.description;
  return base;
}

function generate(appRoot = process.cwd()) {
  loaders.bootstrap(appRoot);

  const paths = {};
  const tags = new Set();

  for (const method of registry.listMethods()) {
    const params = method.getParameter();
    const verb = (method.requestMethods[0] || 'POST').toLowerCase();
    const tag = (method.meta.tags && method.meta.tags[0]) || 'General';
    tags.add(tag);

    const operation = {
      tags: [tag],
      summary: method.meta.summary || method.name,
      description: method.meta.description || '',
      operationId: method.name,
      deprecated: Boolean(method.meta.deprecated),
      parameters: [],
      responses: buildResponses(method),
    };
    if (method.meta.isSecured) {
      operation.security = [method.meta.auth === 'apikey' ? { ApiKeyAuth: [] } : { BearerAuth: [] }];
    }

    const bodyProps = {};
    const required = [];
    for (const [name, ruleRaw] of Object.entries(params)) {
      const rule = typeof ruleRaw === 'string' ? { type: ruleRaw } : ruleRaw;
      const where = rule.in || (verb === 'get' ? 'query' : 'body');
      if (where === 'body') {
        bodyProps[name] = schemaFor(rule);
        if (rule.required) required.push(name);
      } else {
        operation.parameters.push({
          name,
          in: where === 'path' ? 'path' : where === 'header' ? 'header' : 'query',
          required: Boolean(rule.required) || where === 'path',
          schema: schemaFor(rule),
          description: rule.description || '',
        });
      }
    }

    if (Object.keys(bodyProps).length) {
      operation.requestBody = {
        required: required.length > 0,
        content: {
          'application/json': {
            schema: { type: 'object', properties: bodyProps, required: required.length ? required : undefined },
            example: method.examples?.request || undefined,
          },
        },
      };
    }

    if (!paths[method.route]) paths[method.route] = {};
    paths[method.route][verb] = operation;
  }

  return {
    openapi: '3.0.3',
    info: {
      title: registry.config.appName || 'RRF API',
      version: registry.config.version || '1.0.0',
      description: 'Auto-generated OpenAPI specification by RyoForge Runtime Framework',
    },
    servers: [{ url: registry.config.baseUrl || 'http://localhost:3000' }],
    tags: [...tags].map((name) => ({ name })),
    paths,
    components: {
      securitySchemes: {
        BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' },
      },
      schemas: {
        ResponseEnvelope: {
          type: 'object',
          properties: {
            responseCode: { type: 'integer', example: 200 },
            responseMessage: { type: 'string', example: 'Success' },
            responseData: { type: 'object' },
            requestId: { type: 'string' },
          },
        },
      },
    },
  };
}

function buildResponses(method) {
  const out = {
    200: {
      description: 'Successful response',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ResponseEnvelope' } } },
    },
  };
  const responses = method.getResponses();
  for (const [key, sample] of Object.entries(responses || {})) {
    const def = registry.responses[key];
    if (!def) continue;
    const status = typeof def.responseCode === 'number' && def.responseCode < 600 ? def.responseCode : 200;
    out[status] = {
      description: def.responseMessage?.en || key,
      content: {
        'application/json': {
          example: {
            responseCode: def.responseCode,
            responseMessage: def.responseMessage?.en || key,
            responseData: sample || {},
          },
        },
      },
    };
  }
  return out;
}

/** Minimal embedded Swagger UI (loaded from CDN) for /swagger. */
function uiHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>RRF API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({ url: '/swagger.json', dom_id: '#swagger-ui' });
  </script>
</body>
</html>`;
}

/** Persist the spec to disk (used by `rrf swagger:generate`). */
function write(appRoot = process.cwd()) {
  const spec = generate(appRoot);
  const out = path.join(appRoot, 'swagger.json');
  fs.writeFileSync(out, JSON.stringify(spec, null, 2));
  return out;
}

module.exports = { generate, uiHtml, write };
