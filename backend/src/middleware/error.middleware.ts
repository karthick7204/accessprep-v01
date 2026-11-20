/**
 * ACCESSPREP-X — Global Express Error Handling Middleware
 */

import type { Request, Response, NextFunction } from 'express';

export function errorHandlerMiddleware(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('[Server Error]:', err);
  const status = typeof err?.status === 'number' ? err.status : 500;
  res.status(status).json({
    error: err?.message || 'Internal Server Error'
  });
}
