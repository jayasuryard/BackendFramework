'use strict';

const Executor = require('../core/Executor');
const ExecutorContext = require('../core/ExecutorContext');
const registry = require('../core/Registry');
const loaders = require('../core/MethodLoader');
const logger = require('../core/logger');
const jwt = require('../security/jwt');

let WebSocketServer = null;
try {
  // eslint-disable-next-line global-require
  ({ WebSocketServer } = require('ws'));
} catch (_) {
  WebSocketServer = null;
}

/**
 * WebSocket runtime - exposes every method as a real-time action. A client
 * sends { action, request_id, headers, body, method } and the runtime builds
 * an ExecutorContext, runs the Executor and replies with { request_id, body }.
 *
 * Also provides rooms, broadcast, private messaging and socket authentication.
 */
class SocketHub {
  constructor() {
    this.clients = new Map(); // socketId -> { ws, auth, rooms:Set }
    this.rooms = new Map(); // room -> Set<socketId>
  }

  add(socketId, ws) {
    this.clients.set(socketId, { ws, auth: null, rooms: new Set() });
  }

  remove(socketId) {
    const client = this.clients.get(socketId);
    if (!client) return;
    for (const room of client.rooms) this.leave(socketId, room);
    this.clients.delete(socketId);
  }

  join(socketId, room) {
    if (!this.rooms.has(room)) this.rooms.set(room, new Set());
    this.rooms.get(room).add(socketId);
    this.clients.get(socketId)?.rooms.add(room);
  }

  leave(socketId, room) {
    this.rooms.get(room)?.delete(socketId);
    this.clients.get(socketId)?.rooms.delete(room);
    if (this.rooms.get(room)?.size === 0) this.rooms.delete(room);
  }

  send(socketId, payload) {
    const client = this.clients.get(socketId);
    if (client && client.ws.readyState === 1) client.ws.send(JSON.stringify(payload));
  }

  broadcast(payload, exceptSocketId) {
    for (const [id, client] of this.clients.entries()) {
      if (id !== exceptSocketId && client.ws.readyState === 1) {
        client.ws.send(JSON.stringify(payload));
      }
    }
  }

  toRoom(room, payload, exceptSocketId) {
    for (const id of this.rooms.get(room) || []) {
      if (id !== exceptSocketId) this.send(id, payload);
    }
  }
}

const hub = new SocketHub();

function start(opts = {}) {
  if (!WebSocketServer) {
    throw new Error("WebSocket driver 'ws' is not installed. Run: rrf install");
  }
  const appRoot = opts.appRoot || process.cwd();
  loaders.bootstrap(appRoot);

  const port = opts.port || process.env.WS_PORT || 4000;
  // Attach to a provided HTTP server, or stand up a standalone WS server on port.
  const wss = opts.server
    ? new WebSocketServer({ server: opts.server })
    : new WebSocketServer({ port: Number(port) });

  wss.on('connection', (ws, req) => {
    const socketId = ExecutorContext.generateId();
    hub.add(socketId, ws);
    logger.info(`WS connected: ${socketId}`);

    // Optional connect-time auth via ?token= or Sec-WebSocket-Protocol.
    const token = extractToken(req);
    if (token) {
      try {
        hub.clients.get(socketId).auth = jwt.verify(token);
      } catch (_) {
        /* unauthenticated socket still allowed; secured methods will reject */
      }
    }

    ws.send(JSON.stringify({ event: 'connected', socketId }));

    ws.on('message', (raw) => handleMessage(socketId, raw));
    ws.on('close', () => {
      hub.remove(socketId);
      logger.info(`WS disconnected: ${socketId}`);
    });
    ws.on('error', (err) => logger.warn(`WS error ${socketId}: ${err.message}`));
  });

  if (!opts.server) {
    logger.info(`RRF WebSocket runtime listening on ws://localhost:${port}`);
  }
  return { wss, hub, server: opts.server };
}

async function handleMessage(socketId, raw) {
  let msg;
  try {
    msg = JSON.parse(raw.toString());
  } catch (_) {
    return hub.send(socketId, { event: 'error', message: 'Invalid JSON' });
  }

  // Built-in control actions for rooms / messaging.
  if (handleControl(socketId, msg)) return;

  const action = msg.action;
  const descriptor = action && (registry.getMethod(action) ||
    registry.getMethod(registry.socketActions.get(action)));
  if (!descriptor) {
    return hub.send(socketId, {
      request_id: msg.request_id,
      body: { responseCode: 404, responseMessage: 'Unknown action' },
    });
  }

  const client = hub.clients.get(socketId);
  const headers = { ...(msg.headers || {}) };
  if (client?.auth && !headers.authorization) {
    headers.authorization = `Bearer ${jwt.sign(client.auth, { expiresIn: 60 })}`;
  }

  const ctx = new ExecutorContext({
    transport: 'ws',
    method: msg.method || (descriptor.requestMethods[0] || 'POST'),
    methodName: descriptor.name,
    headers,
    body: msg.body || {},
    requestId: msg.request_id,
    raw: { socketId, hub },
  });
  ctx.auth = client?.auth || null;

  const { envelope } = await Executor.execute(ctx);
  hub.send(socketId, { request_id: msg.request_id, body: envelope });
}

function handleControl(socketId, msg) {
  switch (msg.action) {
    case '$join':
      hub.join(socketId, msg.room);
      hub.send(socketId, { event: 'joined', room: msg.room });
      return true;
    case '$leave':
      hub.leave(socketId, msg.room);
      hub.send(socketId, { event: 'left', room: msg.room });
      return true;
    case '$room':
      hub.toRoom(msg.room, { event: 'room_message', room: msg.room, from: socketId, data: msg.body });
      return true;
    case '$broadcast':
      hub.broadcast({ event: 'broadcast', from: socketId, data: msg.body }, socketId);
      return true;
    case '$private':
      hub.send(msg.to, { event: 'private_message', from: socketId, data: msg.body });
      return true;
    default:
      return false;
  }
}

function extractToken(req) {
  try {
    const url = new URL(req.url, 'http://localhost');
    return url.searchParams.get('token') || req.headers['sec-websocket-protocol'] || null;
  } catch (_) {
    return null;
  }
}

module.exports = { start, hub };
