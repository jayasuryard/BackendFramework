'use strict';

const fs = require('fs');
const path = require('path');
const templates = require('./templates');
const scaffold = require('./scaffold');

/* Minimal colorizer (no dependency required). */
const c = {
  green: (s) => `\u001b[32m${s}\u001b[0m`,
  cyan: (s) => `\u001b[36m${s}\u001b[0m`,
  yellow: (s) => `\u001b[33m${s}\u001b[0m`,
  red: (s) => `\u001b[31m${s}\u001b[0m`,
  bold: (s) => `\u001b[1m${s}\u001b[0m`,
  dim: (s) => `\u001b[2m${s}\u001b[0m`,
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(file, content, { force = false } = {}) {
  if (fs.existsSync(file) && !force) {
    console.log(c.dim(`  skip   ${rel(file)} (exists)`));
    return false;
  }
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content);
  console.log(c.green(`  create ${rel(file)}`));
  return true;
}

function rel(file) {
  return path.relative(process.cwd(), file) || file;
}

const commands = {
  /* ---------------------------------------------------------------- create */
  create(args) {
    const name = args._[0];
    if (!name) return fail('Usage: rrf create <app-name>');
    const target = path.resolve(process.cwd(), name);
    scaffold.project(target, name, { writeFile, ensureDir });
    console.log(c.bold(c.green(`\n✔ Project "${name}" created.`)));
    console.log(`\nNext steps:\n  ${c.cyan(`cd ${name}`)}\n  ${c.cyan('npm install')}\n  ${c.cyan('npm start')}\n`);
  },

  /* ----------------------------------------------------------- make:method */
  'make:method'(args) {
    const name = args._[0];
    if (!name) return fail('Usage: rrf make:method <name>  (e.g. user.create)');
    const verb = args.get ? 'GET' : (args.method || 'POST').toUpperCase();
    makeMethod(name, verb);
    console.log(c.bold(c.green(`\n✔ Method "${name}" created -> ${verb} /${name.split('.').join('/')}`)));
  },

  /* -------------------------------------------------------------- make:lib */
  'make:lib'(args) {
    const name = args._[0];
    if (!name) return fail('Usage: rrf make:lib <name>');
    const dir = path.join(srcDir(), 'library', `${name.toLowerCase()}lib`);
    writeFile(path.join(dir, 'index.js'), templates.library(name));
    console.log(c.bold(c.green(`\n✔ Library "${name}" created.`)));
  },

  /* ------------------------------------------------------------- make:task */
  'make:task'(args) {
    const name = args._[0];
    if (!name) return fail('Usage: rrf make:task <name>');
    const file = path.join(srcDir(), 'tasks', `${name}.task.js`);
    writeFile(file, templates.task(name));
    console.log(c.bold(c.green(`\n✔ Task "${name}" created.`)));
  },

  /* -------------------------------------------------------- make:migration */
  'make:migration'(args) {
    const name = args._[0];
    if (!name) return fail('Usage: rrf make:migration <name>');
    const stamp = timestamp();
    const file = path.join(process.cwd(), 'migrations', `${stamp}_${name}.sql`);
    writeFile(file, templates.migration(name));
    console.log(c.bold(c.green(`\n✔ Migration "${name}" created.`)));
  },

  /* ------------------------------------------------------------ make:socket */
  'make:socket'(args) {
    const name = args._[0];
    if (!name) return fail('Usage: rrf make:socket <action>  (e.g. room.join)');
    makeMethod(name, 'POST', { socketAction: name });
    console.log(c.bold(c.green(`\n✔ Socket action "${name}" created.`)));
  },

  /* ------------------------------------------------------------ make:crud */
  'make:crud'(args) {
    const entity = args._[0];
    if (!entity) return fail('Usage: rrf make:crud <entity>  (e.g. user)');
    const e = entity.toLowerCase();
    // Library
    writeFile(path.join(srcDir(), 'library', `${e}lib`, 'index.js'), templates.library(e));
    // Methods
    makeMethod(`${e}.create`, 'POST');
    makeMethod(`${e}.list`, 'GET');
    makeMethod(`${e}.details`, 'GET');
    makeMethod(`${e}.update`, 'PUT');
    makeMethod(`${e}.delete`, 'DELETE');
    // Migration
    writeFile(
      path.join(process.cwd(), 'migrations', `${timestamp()}_create_${e}s.sql`),
      templates.crudMigration(e)
    );
    console.log(c.bold(c.green(`\n✔ CRUD for "${entity}" scaffolded (library + 5 methods + migration).`)));
  },

  /* -------------------------------------------------------------- db:init */
  'db:init'(args) {
    const driver = (args._[0] || 'postgres').toLowerCase();
    if (driver !== 'postgres') {
      console.log(c.yellow(`Driver "${driver}" not yet supported. Defaulting to postgres.`));
    }
    scaffold.dbInit(process.cwd(), { writeFile });
    console.log(c.bold(c.green('\n✔ PostgreSQL database layer initialized.')));
  },

  /* ---------------------------------------------------------- db:generate */
  async 'db:generate'() {
    const pool = require('../db/ConnectionPool');
    if (!pool.isAvailable()) return fail("'pg' not installed. Run: npm install pg");
    try {
      const tables = await pool.raw
        ? await pool.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'"
          )
        : { rows: [] };
      const rows = tables.rows || [];
      console.log(c.cyan(`Discovered ${rows.length} table(s).`));
      for (const t of rows) {
        const cols = await pool.query(
          'SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name=$1',
          [t.table_name]
        );
        scaffold.model(process.cwd(), t.table_name, cols.rows, { writeFile });
      }
      console.log(c.bold(c.green('\n✔ Models generated from database schema.')));
    } catch (e) {
      fail(`db:generate failed: ${e.message}`);
    } finally {
      await pool.end();
    }
  },

  /* --------------------------------------------------------------- migrate */
  async 'migrate:up'() {
    const engine = require('../db/MigrationEngine');
    const done = await engine.up();
    console.log(c.green(`Applied ${done.length} migration(s).`));
    await require('../db/ConnectionPool').end();
  },
  async 'migrate:down'(args) {
    const engine = require('../db/MigrationEngine');
    await engine.down(Number(args._[0] || 1));
    await require('../db/ConnectionPool').end();
  },
  async 'migrate:status'() {
    const engine = require('../db/MigrationEngine');
    const status = await engine.status();
    for (const s of status) {
      console.log(`${s.applied ? c.green('✔') : c.yellow('•')} ${s.name}`);
    }
    await require('../db/ConnectionPool').end();
  },

  /* ----------------------------------------------------- postman / swagger */
  'postman:generate'() {
    const postman = require('../generators/postman');
    const collection = postman.generate(process.cwd());
    const dir = path.join(process.cwd(), 'postman');
    writeFile(path.join(dir, 'rrf.postman_collection.json'), JSON.stringify(collection, null, 2), { force: true });
    console.log(c.bold(c.green('\n✔ Postman collection generated.')));
  },
  'swagger:generate'() {
    const swagger = require('../generators/swagger');
    const out = swagger.write(process.cwd());
    console.log(c.bold(c.green(`\n✔ Swagger spec written to ${rel(out)}.`)));
  },

  /* -------------------------------------------------------------- runtimes */
  serve(args) {
    require('../runtimes/express').start({ port: args.port });
  },
  'serve:ws'(args) {
    require('../runtimes/websocket').start({ port: args.port });
  },
  'cron:start'() {
    require('../runtimes/cron').start();
  },
  async 'cron:run'(args) {
    const name = args._[0];
    if (!name) return fail('Usage: rrf cron:run <task-name>');
    await require('../runtimes/cron').runOnce(name);
    process.exit(0);
  },

  /* ------------------------------------------------------------------ list */
  list() {
    require('../core/MethodLoader').bootstrap(process.cwd());
    const registry = require('../core/Registry');
    console.log(c.bold('\nRegistered Methods:'));
    for (const m of registry.listMethods()) {
      console.log(`  ${c.cyan(m.requestMethods.join(',').padEnd(10))} ${m.route.padEnd(28)} ${c.dim(m.name)}`);
    }
    console.log(c.bold('\nRegistered Tasks:'));
    for (const t of registry.listTasks()) {
      console.log(`  ${c.yellow(t.schedule.padEnd(16))} ${t.name}`);
    }
    console.log('');
  },

  help() {
    printHelp();
  },
};

function makeMethod(name, verb, opts = {}) {
  const dir = path.join(srcDir(), 'methods', name);
  let init = templates.methodInit(name, verb);
  if (opts.socketAction) {
    init = init.replace(
      "summary: '",
      `socketAction: '${opts.socketAction}',\n      summary: '`
    );
  }
  writeFile(path.join(dir, 'init.js'), init);
  writeFile(path.join(dir, 'action.js'), templates.methodAction(name));
  writeFile(path.join(dir, 'schema.js'), templates.methodSchema(name));
  writeFile(path.join(dir, 'examples.json'), templates.methodExamples());
  writeFile(path.join(dir, 'README.md'), templates.methodReadme(name, verb));
}

function srcDir() {
  return path.join(process.cwd(), 'src');
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (key.includes('=')) {
        const [k, v] = key.split('=');
        out[k] = v;
      } else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
        out[key] = argv[++i];
      } else {
        out[key] = true;
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}

function fail(msg) {
  console.error(c.red(`✖ ${msg}`));
  process.exitCode = 1;
}

function printHelp() {
  console.log(`
${c.bold(c.cyan('RyoForge Runtime Framework (RRF) CLI'))}

${c.bold('Usage:')} rrf <command> [args] [--flags]

${c.bold('Project')}
  create <name>              Scaffold a new RRF project
  list                       List all discovered methods & tasks

${c.bold('Generators')}
  make:method <a.b>          Create a method (folder a.b -> /a/b)   [--get]
  make:lib <name>            Create a library
  make:task <name>           Create a scheduled task
  make:socket <action>       Create a WebSocket-exposed method
  make:migration <name>      Create a SQL migration
  make:crud <entity>         Library + CRUD methods + migration

${c.bold('Database')}
  db:init [postgres]         Initialize the database layer & config
  db:generate                Generate models from existing schema
  migrate:up                 Apply pending migrations
  migrate:down [steps]       Roll back migrations
  migrate:status             Show migration status

${c.bold('Docs')}
  postman:generate           Write Postman collection to /postman
  swagger:generate           Write swagger.json (OpenAPI 3)

${c.bold('Runtimes')}
  serve [--port 3000]        Start the Express HTTP runtime
  serve:ws [--port 4000]     Start the WebSocket runtime
  cron:start                 Start the scheduler
  cron:run <task>            Run one task immediately
`);
}

async function run(argv) {
  const [, , cmd, ...rest] = argv;
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') return printHelp();
  const handler = commands[cmd];
  if (!handler) {
    fail(`Unknown command: ${cmd}`);
    return printHelp();
  }
  const args = parseArgs(rest);
  await handler(args);
}

module.exports = { run, commands, parseArgs };
