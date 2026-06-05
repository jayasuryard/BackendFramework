'use strict';

const { BaseInitialize } = require('@ryoforge17/cli');

/**
 * WebSocket-exposed method "room.join".
 * Auto-generated route: POST /room/join (also reachable as a socket action).
 */
class RoomJoinInitialize extends BaseInitialize {
  constructor() {
    super();
    this.initializer = {
      ...this.initializer,
      isSecured: false,
      requestMethod: ['POST'],
      version: 'v1',
      tags: ['Room'],
      socketAction: 'room.join',
      summary: 'Join a real-time room',
    };
  }

  getParameter() {
    return {
      room: { type: 'string', required: true, example: 'lobby' },
    };
  }

  getResponses() {
    return { ROOM_JOINED: { room: 'lobby' } };
  }
}

module.exports = RoomJoinInitialize;
