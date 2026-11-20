/**
 * ACCESSPREP-X — Backend Database Configuration & State
 */

import type { MigrationReport } from '../../db/migration.ts';

let latestMigrationReport: MigrationReport | null = null;

export function getLatestMigrationReport(): MigrationReport | null {
  return latestMigrationReport;
}

export function setLatestMigrationReport(report: MigrationReport | null): void {
  latestMigrationReport = report;
}
