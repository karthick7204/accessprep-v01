/**
 * ACCESSPREP-X — Backend Main Server Entry Point
 * Delegates to backend/src/server.ts
 */

import { app, startServer } from './src/server.ts';

export { app, startServer };

startServer();
