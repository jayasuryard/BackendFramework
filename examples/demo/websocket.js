'use strict';

require('dotenv').config();
const { websocket } = require('@ryoforge17/cli');

// WebSocket runtime. Every method is reachable as a real-time action.
websocket.start({ port: process.env.WS_PORT || 4000 });
