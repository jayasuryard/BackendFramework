'use strict';

const registry = require('../core/Registry');
const loaders = require('../core/MethodLoader');
const logger = require('../core/logger');

let cron = null;
try {
  // eslint-disable-next-line global-require
  cron = require('node-cron');
} catch (_) {
  cron = null;
}

/**
 * Scheduler runtime - discovers tasks (src/tasks/*.task.js) and schedules them
 * using their cron expression. Supports retries, timezone and monitoring logs.
 */
const scheduled = [];

async function runTask(task) {
  const startedAt = Date.now();
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      logger.info(`Task start: ${task.name}`, { attempt });
      const result = await task.handler({ logger, attempt, name: task.name });
      logger.info(`Task done: ${task.name}`, { durationMs: Date.now() - startedAt });
      return result;
    } catch (err) {
      attempt += 1;
      logger.error(`Task failed: ${task.name} (attempt ${attempt})`, { error: err.message });
      if (attempt > task.retries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

function start(opts = {}) {
  const appRoot = opts.appRoot || process.cwd();
  loaders.bootstrap(appRoot);

  if (!cron) {
    throw new Error("Scheduler driver 'node-cron' is not installed. Run: npm install node-cron");
  }

  const tasks = registry.listTasks();
  if (!tasks.length) {
    logger.warn('No tasks found in src/tasks');
  }

  for (const task of tasks) {
    if (!cron.validate(task.schedule)) {
      logger.error(`Invalid cron expression for task ${task.name}: ${task.schedule}`);
      continue;
    }
    const job = cron.schedule(
      task.schedule,
      () => runTask(task).catch(() => {}),
      { timezone: task.timezone || process.env.TZ || 'UTC' }
    );
    scheduled.push({ task, job });
    logger.info(`Task scheduled: ${task.name} (${task.schedule})`);
  }

  logger.info(`RRF Scheduler runtime started with ${scheduled.length} task(s)`);
  return { scheduled, runTask };
}

/** Run a single task immediately by name (used by `rrf cron:run <name>`). */
async function runOnce(name, appRoot = process.cwd()) {
  loaders.bootstrap(appRoot);
  const task = registry.tasks.get(name);
  if (!task) throw new Error(`Task not found: ${name}`);
  return runTask(task);
}

module.exports = { start, runOnce, runTask };
