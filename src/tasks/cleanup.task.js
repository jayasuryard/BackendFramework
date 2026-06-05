'use strict';

/**
 * Scheduled task: cleanup — runs every hour.
 */
module.exports = {
  name: 'cleanup',
  schedule: '0 * * * *', // top of every hour
  retries: 2,
  timezone: 'UTC',

  async handler({ logger }) {
    logger.info('cleanup: pruning expired sessions and temp files');
    // ... cleanup logic ...
    return { pruned: 0 };
  },
};
