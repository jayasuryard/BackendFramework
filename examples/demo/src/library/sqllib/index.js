'use strict';

const { SQLManager } = require('@ryoforge17/cli');

// Re-export SQLManager so libraries/methods can access raw SQL access through
// the library layer: this.lib('sql').find(...).
module.exports = SQLManager;
