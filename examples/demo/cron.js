'use strict';

require('dotenv').config();
const { cron } = require('@ryoforge17/cli');

// Scheduler runtime. Discovers and schedules every src/tasks/*.task.js
cron.start();
