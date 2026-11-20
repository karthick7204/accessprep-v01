/**
 * ACCESSPREP-X — Python Subprocess & FFmpeg Environment Utilities
 */

import fs from 'fs';
import path from 'path';

export function getPythonExecutable(): string {
  const userPy = path.join(
    process.env.LOCALAPPDATA || '',
    'Programs',
    'Python',
    'Python311',
    'python.exe'
  );
  if (fs.existsSync(userPy)) return userPy;
  return 'python3';
}

export function getFFmpegDir(): string {
  try {
    const wingetBase = path.join(
      process.env.LOCALAPPDATA || '',
      'Microsoft',
      'WinGet',
      'Packages'
    );
    if (fs.existsSync(wingetBase)) {
      const matches = fs
        .readdirSync(wingetBase)
        .filter((d) => d.startsWith('Gyan.FFmpeg.Essentials'));
      for (const match of matches) {
        const subdirs = fs.readdirSync(path.join(wingetBase, match));
        for (const sub of subdirs) {
          const bin = path.join(wingetBase, match, sub, 'bin');
          if (fs.existsSync(path.join(bin, 'ffmpeg.exe'))) {
            return bin;
          }
        }
      }
    }
  } catch (e) {
    console.error('Error finding ffmpeg dir:', e);
  }
  return '';
}

export function getExecutionEnv(): NodeJS.ProcessEnv {
  const ffmpegDir = getFFmpegDir();
  const pyDir = path.join(
    process.env.LOCALAPPDATA || '',
    'Programs',
    'Python',
    'Python311'
  );
  const pyScripts = path.join(pyDir, 'Scripts');
  const pathParts = [ffmpegDir, pyDir, pyScripts, process.env.PATH || ''].filter(
    Boolean
  );
  return {
    ...process.env,
    PATH: pathParts.join(path.delimiter)
  };
}
