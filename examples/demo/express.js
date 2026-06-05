'use strict';

require('dotenv').config();
const { express } = require('@ryoforge17/cli');

// Express HTTP runtime. All method routes are auto-registered.
express.start({ port: process.env.PORT || 3000 });
