import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export interface DatabaseConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export function getDatabaseConfig(): DatabaseConfig {
  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    return {
      connectionString,
      ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.PG_MAX_POOL_SIZE) || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    };
  }

  return {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'accessprep',
    ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
    max: Number(process.env.PG_MAX_POOL_SIZE) || 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  };
}

let poolInstance: pg.Pool | null = null;
let connectionTested = false;
let isConnected = false;
let lastConnectionError: string | null = null;

export function getPostgresPool(): pg.Pool {
  if (!poolInstance) {
    const config = getDatabaseConfig();
    poolInstance = new Pool(config);

    poolInstance.on('error', (err) => {
      console.warn('[PostgreSQL Pool Warning]:', err.message);
    });
  }
  return poolInstance;
}

export async function checkPostgresConnection(): Promise<{ isConnected: boolean; error?: string }> {
  try {
    const pool = getPostgresPool();
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT NOW() as current_time, current_database() as db_name');
      connectionTested = true;
      isConnected = true;
      lastConnectionError = null;
      return { isConnected: true };
    } finally {
      client.release();
    }
  } catch (err: any) {
    connectionTested = true;
    isConnected = false;
    lastConnectionError = err?.message || 'Connection failed';
    return { isConnected: false, error: lastConnectionError || undefined };
  }
}

export function isPostgresConnected(): boolean {
  return isConnected;
}

export function getLastConnectionError(): string | null {
  return lastConnectionError;
}

export async function query<T extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  const pool = getPostgresPool();
  return pool.query<T>(text, params);
}

export async function withTransaction<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rbErr) {
      console.error('Error during transaction rollback:', rbErr);
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function closePostgresPool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
    connectionTested = false;
    isConnected = false;
  }
}
