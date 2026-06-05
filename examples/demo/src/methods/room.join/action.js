'use strict';

const { BaseAction } = require('@ryoforge17/cli');

class RoomJoinAction extends BaseAction {
  async executeMethod() {
    // When invoked over WebSocket, the runtime injects { socketId, hub }.
    const { hub, socketId } = this.context.raw || {};
    if (hub && socketId) {
      hub.join(socketId, this.room);
      hub.toRoom(this.room, { event: 'user_joined', room: this.room, socketId }, socketId);
    }
    this.setResponse('ROOM_JOINED', { room: this.room });
  }
}

module.exports = RoomJoinAction;
