'use strict';

const lambda = require('./lambda');
const expressRuntime = require('./express');

/**
 * Serverless runtime - thin convenience layer for the Serverless Framework.
 * It can either reuse the Lambda adapter directly, or wrap the full Express app
 * with `serverless-http` when that package is present (so all routes, Swagger
 * and Postman endpoints work unchanged in a Lambda).
 */
function handler(appRoot = process.cwd()) {
  let serverlessHttp = null;
  try {
    // eslint-disable-next-line global-require
    serverlessHttp = require('serverless-http');
  } catch (_) {
    serverlessHttp = null;
  }

  if (serverlessHttp) {
    const app = expressRuntime.buildApp(appRoot);
    return serverlessHttp(app);
  }
  // Fallback to the native Lambda adapter (method routes only).
  return lambda.handler(appRoot);
}

module.exports = { handler };
