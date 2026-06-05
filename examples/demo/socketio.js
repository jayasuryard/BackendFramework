'use strict';

// Socket.IO-style bootstrap. RRF ships a native 'ws' runtime (websocket.js);
// this entry simply boots the same WebSocket runtime for environments that
// expect a socketio.js file. The Executor pipeline is identical either way.
require('dotenv').config();
const { websocket } = require('@ryoforge17/cli');

websocket.start({ port: process.env.WS_PORT || 4000 });
