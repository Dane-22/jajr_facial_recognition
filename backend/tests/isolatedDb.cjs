// Preload for unit tests: importing a controller must not run migrations or open
// a connection to the database configured in .env. Tests provide their own data.
const filename = require.resolve('../config/db');
const unexpected = async () => { throw new Error('Unit test attempted an unstubbed database operation.'); };
require.cache[filename] = { id: filename, filename, loaded: true, exports: {
  ready: Promise.resolve(), query: unexpected, getConnection: unexpected, end: async () => {}
} };
