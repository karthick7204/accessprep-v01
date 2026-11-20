/**
 * ACCESSPREP-X — Audio Upload Multer Middleware
 */

import fs from 'fs';
import multer from 'multer';
import { envConfig } from '../config/env.config.ts';

if (!fs.existsSync(envConfig.audioUploadDir)) {
  fs.mkdirSync(envConfig.audioUploadDir, { recursive: true });
}

export const audioUploadMiddleware = multer({
  dest: envConfig.audioUploadDir,
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB max
});
