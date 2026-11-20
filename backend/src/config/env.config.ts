/**
 * ACCESSPREP-X — Backend Environment Configuration
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env first, and fall back to .env.example if .env is not present or missing keys
dotenv.config({ path: ['.env', '.env.example'] });

export const envConfig = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  bypassChallenge:
    process.env.NODE_ENV === 'test' || process.env.BYPASS_CHALLENGE === 'true',
  audioUploadDir: path.join(
    process.env.TEMP || process.env.TMP || '/tmp',
    'accessprep_audio'
  ),
  pgHost:
    process.env.PGHOST ||
    (process.env.DATABASE_URL ? 'via DATABASE_URL' : 'localhost')
};
