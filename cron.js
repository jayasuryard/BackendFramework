'use strict';

require('dotenv').config();
const { cron } = require('ryoforge-runtime-framework');

// Scheduler runtime. Discovers and schedules every src/tasks/*.task.js
cron.start();
