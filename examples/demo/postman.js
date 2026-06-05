'use strict';

const fs = require('fs');
const path = require('path');
const { postman } = require('@ryoforge17/cli');

// Generate the Postman collection from method metadata.
const collection = postman.generate();
const out = path.join(process.cwd(), 'postman', 'collection.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(collection, null, 2));
// eslint-disable-next-line no-console
console.log('Postman collection written to', out);
