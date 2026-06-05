'use strict';

const path = require('path');
const templates = require('./templates');

/**
 * Scaffold - emits a complete, runnable RRF project (or augments an existing
 * one for db:init / db:generate). All file contents live here so `rrf create`
 * has zero runtime dependencies beyond Node.
 */
const scaffold = {
  project(target, name, io) {
    const w = (rel, content, opts) => io.writeFile(path.join(target, rel), content, opts);

    w('package.json', projectPackageJson(name));
    w('.env', envFile());
    w('.gitignore', gitignore());
    w('README.md', projectReadme(name));

    // Root runtime entry files.
    w('express.js', entry("express", "start({ port: process.env.PORT || 3000 })"));
    w('websocket.js', entry("websocket", "start({ port: process.env.WS_PORT || 4000 })"));
    w('cron.js', entry("cron", "start()"));
    w('lambda.js', lambdaEntry());
    w('serverless.js', serverlessEntry());
    w('postman.js', postmanEntry());
    w('socketio.js', socketioEntry());

    // Config.
    w('src/config/config.json', JSON.stringify(configJson(name), null, 2) + '\n');
    w('src/config/route.json', JSON.stringify({ overrides: {} }, null, 2) + '\n');
    w('src/config/config.md', configMd());

    // Global.
    w('src/global/constants.js', constantsFile());
    w('src/global/responses.js', responsesFile());
    w('src/global/index.js', globalIndexFile());
    w('src/global/i18n/strings/string.en.js', stringsFile('en', { GREETING: 'Hello' }));
    w('src/global/i18n/strings/string.hi.js', stringsFile('hi', { GREETING: 'नमस्ते' }));
    w('src/global/i18n/strings/string.kn.js', stringsFile('kn', { GREETING: 'ನಮಸ್ಕಾರ' }));
    w('src/global/i18n/strings/string.ar.js', stringsFile('ar', { GREETING: 'مرحبا' }));

    // Library + sample method + task.
    w('src/library/userlib/index.js', templates.library('user'));
    w('src/methods/auth.login/init.js', templates.methodInit('auth.login', 'POST'));
    w('src/methods/auth.login/action.js', templates.methodAction('auth.login'));
    w('src/methods/auth.login/examples.json', templates.methodExamples());
    w('src/tasks/cleanup.task.js', templates.task('cleanup'));

    // Empty conventional folders (keep with .gitkeep).
    for (const dir of ['Assets/Uploads', 'Assets/Downloads', 'logs', 'migrations', 'storage', 'postman']) {
      w(`${dir}/.gitkeep`, '');
    }
  },

  dbInit(cwd, io) {
    const w = (rel, content, opts) => io.writeFile(path.join(cwd, rel), content, opts);
    w('migrations/.gitkeep', '');
    w('src/library/sqllib/index.js', sqlLibFile());
    console.log('  → Ensure DATABASE_URL (or DB_* vars) are set in .env');
  },

  model(cwd, table, columns, io) {
    const cls = templates.className(table);
    const content = `'use strict';

/**
 * ${cls}Model - generated from the "${table}" schema.
 */
module.exports = {
  table: '${table}',
  columns: ${JSON.stringify(
    columns.map((c) => ({ name: c.column_name, type: c.data_type, nullable: c.is_nullable === 'YES' })),
    null,
    2
  )},
};
`;
    io.writeFile(path.join(cwd, 'src', 'models', `${table}.model.js`), content);
  },
};

/* ------------------------------------------------------------ file bodies */

function projectPackageJson(name) {
  return JSON.stringify(
    {
      name,
      version: '1.0.0',
      private: true,
      main: 'express.js',
      scripts: {
        start: 'node express.js',
        'start:ws': 'node websocket.js',
        'start:cron': 'node cron.js',
        postman: 'node postman.js',
        swagger: 'rrf swagger:generate',
        migrate: 'rrf migrate:up',
      },
      dependencies: {
        '@ryoforge17/cli': '^1.0.0',
      },
    },
    null,
    2
  ) + '\n';
}

function entry(runtime, call) {
  return `'use strict';

require('dotenv').config();
const { ${runtime} } = require('@ryoforge17/cli');

${runtime}.${call};
`;
}

function lambdaEntry() {
  return `'use strict';

const { lambda } = require('@ryoforge17/cli');

// AWS Lambda / API Gateway entry point.
exports.handler = lambda.handler();
`;
}

function serverlessEntry() {
  return `'use strict';

const { serverless } = require('@ryoforge17/cli');

// Serverless Framework entry point (wraps Express when serverless-http exists).
module.exports.handler = serverless.handler();
`;
}

function postmanEntry() {
  return `'use strict';

const fs = require('fs');
const path = require('path');
const { postman } = require('@ryoforge17/cli');

const collection = postman.generate();
const out = path.join(process.cwd(), 'postman', 'collection.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(collection, null, 2));
console.log('Postman collection written to', out);
`;
}

function socketioEntry() {
  return `'use strict';

// Optional Socket.IO style bootstrap. RRF ships a native 'ws' runtime
// (websocket.js); this file is a placeholder for a Socket.IO adapter if you
// prefer that protocol. The Executor pipeline is identical either way.
require('dotenv').config();
const { websocket } = require('@ryoforge17/cli');

websocket.start({ port: process.env.WS_PORT || 4000 });
`;
}

function configJson(name) {
  return {
    appName: name,
    version: '1.0.0',
    baseUrl: 'http://localhost:3000',
    defaultLang: 'en',
    languages: ['en', 'hi', 'kn', 'ar', 'es', 'fr'],
  };
}

function envFile() {
  return `# Server
PORT=3000
WS_PORT=4000
LOG_LEVEL=info
DEFAULT_LANG=en

# Security
JWT_SECRET=change-me-in-production
JWT_EXPIRES=1h
API_KEY=

# Database (PostgreSQL)
DATABASE_URL=
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=rrf
DB_SSL=false

# Redis (optional)
REDIS_URL=
`;
}

function gitignore() {
  return `node_modules/
logs/*.log
.env
storage/
Assets/Uploads/*
Assets/Downloads/*
!**/.gitkeep
swagger.json
`;
}

function constantsFile() {
  return `'use strict';

module.exports = {
  ROLES: { ADMIN: 'admin', USER: 'user', SUPERADMIN: 'superadmin' },
  STATUS: { ACTIVE: 'active', INACTIVE: 'inactive', DELETED: 'deleted' },
  PERMISSIONS: { USER_CREATE: 'USER_CREATE', USER_DELETE: 'USER_DELETE' },
};
`;
}

function responsesFile() {
  return `'use strict';

/**
 * Global response catalog. Keys are referenced via this.setResponse('KEY').
 * Messages are translated automatically based on the Accept-Language header.
 */
const RESPONSE = {
  SUCCESS: { responseCode: 200, responseMessage: { en: 'Success', hi: 'सफल', ar: 'نجاح' } },

  USER_CREATED: {
    responseCode: 200,
    responseMessage: { en: 'User created successfully', hi: 'उपयोगकर्ता सफलतापूर्वक बनाया गया' },
  },
  INVALID_USER: {
    responseCode: 1001,
    responseMessage: { en: 'Invalid user', hi: 'अमान्य उपयोगकर्ता' },
  },
  INVALID_CREDENTIALS: {
    responseCode: 1002,
    responseMessage: { en: 'Invalid credentials', hi: 'अमान्य प्रमाण-पत्र' },
  },
  LOGIN_SUCCESS: {
    responseCode: 200,
    responseMessage: { en: 'Logged in successfully' },
  },
};

module.exports = { RESPONSE };
`;
}

function globalIndexFile() {
  return `'use strict';

module.exports = {
  constants: require('./constants'),
  responses: require('./responses').RESPONSE,
};
`;
}

function stringsFile(lang, extra) {
  return `'use strict';

const STRINGS = ${JSON.stringify(extra, null, 2)};

module.exports = { STRINGS };
`;
}

function sqlLibFile() {
  return `'use strict';

const { SQLManager } = require('@ryoforge17/cli');

// Re-export the SQLManager so methods/libraries can require it via the library layer.
module.exports = SQLManager;
`;
}

function configMd() {
  return `# Configuration

\`config.json\` holds app-level settings (name, version, languages).
\`route.json\` holds optional route overrides.

Routes are generated automatically from method folder names, so you rarely need
to touch \`route.json\`.
`;
}

function projectReadme(name) {
  return `# ${name}

Built with the ${''}RyoForge Runtime Framework (RRF).

## Run
\`\`\`bash
npm install
npm start          # Express runtime  -> http://localhost:3000
npm run start:ws   # WebSocket runtime -> ws://localhost:4000
npm run start:cron # Scheduler
\`\`\`

## Create things
\`\`\`bash
rrf make:method user.create
rrf make:crud user
rrf make:task dailyReward
rrf make:socket room.join
\`\`\`

## Docs
- Swagger UI:  http://localhost:3000/swagger
- Postman:     http://localhost:3000/postman
`;
}

module.exports = scaffold;
