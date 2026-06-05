'use strict';

const framework = require('@ryoforge17/cli');

/**
 * Scheduled task: dailyReward — runs every day at midnight. Demonstrates
 * calling a Method internally through the Executor from a task.
 */
module.exports = {
  name: 'dailyReward',
  schedule: '0 0 * * *', // every day at 00:00
  retries: 3,
  timezone: 'UTC',

  async handler({ logger }) {
    logger.info('dailyReward: granting daily rewards to active users');
    // Example of an internal method call (no HTTP):
    // await framework.call('reward.grant', { type: 'daily' });
    void framework;
    return { granted: true };
  },
};
