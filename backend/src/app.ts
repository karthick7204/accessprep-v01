/**
 * ACCESSPREP-X — Express Application Factory
 */

import express from 'express';
import { apiRouter } from './routes/index.ts';
import { errorHandlerMiddleware } from './middleware/error.middleware.ts';

export function createExpressApp() {
  const app = express();
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-test-bypass-challenge'
    );
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use('/api', apiRouter);
  app.use(errorHandlerMiddleware);
  return app;
}
