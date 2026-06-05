'use strict';

/**
 * Code templates used by the `rrf make:*` generators. Each function returns the
 * file contents as a string. Keeping them here makes the generators tiny.
 */
function className(methodName) {
  return methodName
    .split(/[._-]/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
}

const templates = {
  className,

  methodInit(methodName, verb = 'POST') {
    const cls = className(methodName);
    return `'use strict';

const { BaseInitialize } = require('@ryoforge17/cli');

/**
 * Metadata for the "${methodName}" method.
 * Route is generated automatically: ${verb} /${methodName.split('.').join('/')}
 */
class ${cls}Initialize extends BaseInitialize {
  constructor() {
    super();
    this.initializer = {
      ...this.initializer,
      isSecured: false,
      requestMethod: ['${verb}'],
      version: 'v1',
      rateLimit: 100,
      permissions: [],
      roles: [],
      tags: ['${cls.replace(/[A-Z][a-z]*$/, '') || cls}'],
      summary: '${methodName} method',
      description: 'Describe what ${methodName} does.',
    };
  }

  getParameter() {
    return {
      // name: { type: 'string', required: true, description: 'Example field' },
    };
  }

  getResponses() {
    return {
      // SUCCESS: { example: true },
    };
  }
}

module.exports = ${cls}Initialize;
`;
  },

  methodAction(methodName) {
    const cls = className(methodName);
    return `'use strict';

const { BaseAction } = require('@ryoforge17/cli');

/**
 * Business logic for the "${methodName}" method.
 * Validated inputs are available on \`this\` (e.g. this.name).
 */
class ${cls}Action extends BaseAction {
  async executeMethod() {
    // const lib = this.lib('user');
    // const result = await lib.create({ ... });

    this.setResponse('SUCCESS');
    return { method: '${methodName}', input: this.input };
  }
}

module.exports = ${cls}Action;
`;
  },

  methodSchema(methodName) {
    return `'use strict';

/**
 * Optional JSON-schema style description for "${methodName}". The framework
 * primarily uses init.getParameter(); this file documents richer shapes for
 * tooling and tests.
 */
module.exports = {
  request: {},
  response: {},
};
`;
  },

  methodExamples() {
    return JSON.stringify({ request: {}, response: {} }, null, 2) + '\n';
  },

  methodReadme(methodName, verb = 'POST') {
    const route = '/' + methodName.split('.').join('/');
    return `# ${methodName}

Auto-generated method.

- **Route:** \`${verb} ${route}\`
- **Secured:** edit \`init.js\` -> \`initializer.isSecured\`

## Parameters
Defined in [init.js](./init.js) \`getParameter()\`.

## Logic
Implemented in [action.js](./action.js) \`executeMethod()\`.
`;
  },

  library(name) {
    const cls = className(name);
    const table = name.toLowerCase().endsWith('s') ? name.toLowerCase() : `${name.toLowerCase()}s`;
    return `'use strict';

const { BaseLibrary } = require('@ryoforge17/cli');

/**
 * ${cls}Library - data access for the "${table}" table.
 * Methods call this library; the library is the only place that touches SQL.
 */
class ${cls}Library extends BaseLibrary {
  constructor() {
    super('${table}', { primaryKey: 'id' });
  }

  // Add domain-specific data methods here, e.g.:
  // findByEmail(email) { return this.findOne({ email }); }
}

module.exports = new ${cls}Library();
`;
  },

  task(name) {
    return `'use strict';

/**
 * Scheduled task: ${name}
 * Discovered automatically from src/tasks/*.task.js
 */
module.exports = {
  name: '${name}',
  schedule: '0 * * * *', // every hour — edit this cron expression
  retries: 2,
  timezone: 'UTC',

  async handler({ logger }) {
    logger.info('Running task ${name}');
    // ... task logic ...
  },
};
`;
  },

  migration(name) {
    return `-- Migration: ${name}
-- @UP
CREATE TABLE IF NOT EXISTS example (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- @DOWN
DROP TABLE IF EXISTS example;
`;
  },

  crudMigration(entity) {
    const table = entity.toLowerCase().endsWith('s') ? entity.toLowerCase() : `${entity.toLowerCase()}s`;
    return `-- Migration: create_${table}
-- @UP
CREATE TABLE IF NOT EXISTS ${table} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- @DOWN
DROP TABLE IF EXISTS ${table};
`;
  },
};

module.exports = templates;
