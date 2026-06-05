#!/usr/bin/env node
'use strict';

/**
 * RRF CLI entry point. Thin wrapper around lib/cli.
 */
require('../lib/cli').run(process.argv).catch((err) => {
  // eslint-disable-next-line no-console
  console.error('\u001b[31m✖ ' + err.message + '\u001b[0m');
  if (process.env.RRF_DEBUG) console.error(err.stack);
  process.exit(1);
});
