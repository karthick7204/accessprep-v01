/**
 * ACCESSPREP-X — Modular Server Bootstrapper
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { createExpressApp } from './app.ts';
import { envConfig } from './config/env.config.ts';
import { setLatestMigrationReport } from './config/database.config.ts';
import { runDatabaseMigration } from './repositories/index.ts';

export const app = createExpressApp();

process.on('uncaughtException', (err) => {
  console.warn('[Server Handled Uncaught Exception]:', err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.warn('[Server Handled Unhandled Rejection]:', reason);
});

export async function startServer() {
  try {
    const report = await runDatabaseMigration();
    setLatestMigrationReport(report);
    console.log(
      `[Database Initialization]: ${report.message} (Engine: ${report.databaseEngine})`
    );
  } catch (migErr: any) {
    console.warn('[Database Migration Notice]:', migErr.message);
  }

  if (!envConfig.isProd) {
    const { createServer: createViteServer } = await import('vite');
    const frontendRoot = [
      path.resolve(import.meta.dirname, '../../frontend'),
      path.resolve(process.cwd(), 'frontend'),
      process.cwd()
    ].find((p) => fs.existsSync(path.resolve(p, 'index.html'))) || path.resolve(import.meta.dirname, '../../frontend');

    const vite = await createViteServer({
      root: frontendRoot,
      configFile: fs.existsSync(path.resolve(frontendRoot, 'vite.config.ts'))
        ? path.resolve(frontendRoot, 'vite.config.ts')
        : undefined,
      server: {
        middlewareMode: true,
        watch: {
          ignored: [
            '**/data/**/*.json',
            '**/src/data/**/*.json',
            '**/*.json',
            '**/*.db',
            '**/*.log',
            '**/.venv/**',
            '**/dist/**'
          ]
        }
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = [
      path.resolve(import.meta.dirname, '../../frontend/dist'),
      path.resolve(process.cwd(), 'frontend/dist'),
      path.resolve(process.cwd(), 'dist')
    ].find((p) => fs.existsSync(p)) || path.resolve(import.meta.dirname, '../../frontend/dist');

    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  return app.listen(envConfig.port, '0.0.0.0', () => {
    console.log(`ACCESSPREP-X Portal running on http://0.0.0.0:${envConfig.port}`);
  });
}
