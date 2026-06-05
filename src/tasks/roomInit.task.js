'use strict';

/**
 * Scheduled task: roomInit — runs every 5 minutes. Demonstrates a maintenance
 * task that could reconcile real-time room state.
 */
module.exports = {
  name: 'roomInit',
  schedule: '*/5 * * * *', // every 5 minutes
  retries: 1,
  timezone: 'UTC',

  async handler({ logger }) {
    logger.info('roomInit: reconciling room state');
    return { ok: true };
  },
};
