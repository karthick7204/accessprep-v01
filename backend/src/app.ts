/**
 * ACCESSPREP-X — Express Application Factory
 */

import express from 'express';
import { apiRouter } from './routes/index.ts';
import { errorHandlerMiddleware } from './middleware/error.middleware.ts';

export function createExpressApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use('/api', apiRouter);
  app.use(errorHandlerMiddleware);
  return app;
}
