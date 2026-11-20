/**
 * ACCESSPREP-X — Health & Database Status Controller
 */

import fs from 'fs';
import type { Request, Response } from 'express';
import {
  getRepository,
  loadQuestions,
  isPostgresConnected,
  checkPostgresConnection,
  runDatabaseMigration
} from '../repositories/index.ts';
import {
  getLatestMigrationReport,
  setLatestMigrationReport
} from '../config/database.config.ts';
import { envConfig } from '../config/env.config.ts';

export async function getHealthStatus(_req: Request, res: Response) {
  const repo = await getRepository();
  const questions = loadQuestions();

  res.json({
    status: 'online',
    portal: 'ACCESSPREP-X Accessible SSC MTS Portal',
    databaseEngine: repo.engineName,
    postgresConnected: isPostgresConnected(),
    questionsCount: questions.length,
    mlModelArtifactAvailable:
      fs.existsSync(path.resolve(__dirname, '../../data/model_artifact.pkl')) ||
      fs.existsSync('backend/data/model_artifact.pkl') ||
      fs.existsSync('src/data/model_artifact.pkl'),
    validationReportAvailable:
      fs.existsSync(path.resolve(__dirname, '../../data/dataset_validation_report.json')) ||
      fs.existsSync('backend/data/dataset_validation_report.json') ||
      fs.existsSync('src/data/dataset_validation_report.json'),
    timestamp: new Date().toISOString()
  });
}

export async function getDatabaseStatus(_req: Request, res: Response) {
  const conn = await checkPostgresConnection();
  const repo = await getRepository();
  const questions = loadQuestions();

  res.json({
    activeEngine: repo.engineName,
    postgres: {
      configuredHost: envConfig.pgHost,
      isConnected: conn.isConnected,
      lastError: conn.error || null
    },
    migrationReport: getLatestMigrationReport(),
    totalVerifiedQuestions: questions.length,
    timestamp: new Date().toISOString()
  });
}

export async function triggerDatabaseMigration(_req: Request, res: Response) {
  try {
    const report = await runDatabaseMigration();
    setLatestMigrationReport(report);
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: 'Migration failed', details: err.message });
  }
}
