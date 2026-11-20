/**
 * ACCESSPREP-X — ML Dataset, Model Evaluation & Whisper Audio Controllers
 */

import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import type { Request, Response } from 'express';
import { loadQuestions } from '../repositories/index.ts';
import {
  getPythonExecutable,
  getExecutionEnv
} from '../utils/pythonRunner.utils.ts';

function safeExecFile(
  file: string,
  args: string[],
  options: any,
  callback: (error: any, stdout: string, stderr: string) => void
) {
  try {
    const cp = execFile(file, args, options, (error, stdout, stderr) => {
      callback(error, String(stdout || ''), String(stderr || ''));
    });
    cp.on('error', (err) => {
      callback(err, '', String(err?.message || ''));
    });
    return cp;
  } catch (err: any) {
    callback(err, '', String(err?.message || ''));
    return null;
  }
}

export function getDatasetSummary(_req: Request, res: Response) {
  try {
    const reportPath = [
      path.resolve(import.meta.dirname, '../../data/dataset_validation_report.json'),
      path.resolve(process.cwd(), 'backend/data/dataset_validation_report.json'),
      path.resolve(process.cwd(), 'src/data/dataset_validation_report.json')
    ].find((p) => fs.existsSync(p)) || path.resolve(import.meta.dirname, '../../data/dataset_validation_report.json');

    const dictPath = [
      path.resolve(import.meta.dirname, '../../data/data_dictionary.json'),
      path.resolve(process.cwd(), 'backend/data/data_dictionary.json'),
      path.resolve(process.cwd(), 'src/data/data_dictionary.json')
    ].find((p) => fs.existsSync(p)) || path.resolve(import.meta.dirname, '../../data/data_dictionary.json');

    const report = fs.existsSync(reportPath)
      ? JSON.parse(fs.readFileSync(reportPath, 'utf-8'))
      : null;
    const dictionary = fs.existsSync(dictPath)
      ? JSON.parse(fs.readFileSync(dictPath, 'utf-8'))
      : null;
    const questions = loadQuestions();

    res.json({
      totalQuestions: questions.length,
      validationReport: report,
      dataDictionary: dictionary
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export function getModelEvaluation(_req: Request, res: Response) {
  try {
    const evalPath = [
      path.resolve(import.meta.dirname, '../../data/model_evaluation_report.json'),
      path.resolve(process.cwd(), 'backend/data/model_evaluation_report.json'),
      path.resolve(process.cwd(), 'src/data/model_evaluation_report.json')
    ].find((p) => fs.existsSync(p)) || path.resolve(import.meta.dirname, '../../data/model_evaluation_report.json');
    if (!fs.existsSync(evalPath)) {
      return res.status(404).json({ error: 'Evaluation report not generated yet.' });
    }
    const report = JSON.parse(fs.readFileSync(evalPath, 'utf-8'));
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export function postModelPredict(req: Request, res: Response) {
  const questionText = req.body.questionText || req.body.question_text;
  if (!questionText || typeof questionText !== 'string' || questionText.trim() === '') {
    return res.status(400).json({ error: 'Question text is required for inference.' });
  }

  safeExecFile(
    getPythonExecutable(),
    ['scripts/inference.py', questionText.trim()],
    { env: getExecutionEnv() },
    (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ error: 'Failed to run model inference', details: stderr || error.message });
      }
      try {
        const parsed = JSON.parse(stdout);
        res.json(parsed);
      } catch {
        res.status(500).json({ error: 'Invalid inference output format', raw: stdout });
      }
    }
  );
}

export function postModelTrain(_req: Request, res: Response) {
  safeExecFile(
    getPythonExecutable(),
    ['scripts/train_model.py'],
    { env: getExecutionEnv() },
    (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ error: 'Model training pipeline failed', details: stderr || error.message });
      }
      const evalPath = [
        path.resolve(import.meta.dirname, '../../data/model_evaluation_report.json'),
        path.resolve(process.cwd(), 'backend/data/model_evaluation_report.json'),
        path.resolve(process.cwd(), 'src/data/model_evaluation_report.json')
      ].find((p) => fs.existsSync(p)) || path.resolve(import.meta.dirname, '../../data/model_evaluation_report.json');
      const report = fs.existsSync(evalPath)
        ? JSON.parse(fs.readFileSync(evalPath, 'utf-8'))
        : null;
      res.json({
        success: true,
        logs: stdout,
        updatedReport: report
      });
    }
  );
}

export function getAudioStatus(_req: Request, res: Response) {
  safeExecFile(
    getPythonExecutable(),
    ['-c', 'import whisper; print("ok")'],
    { timeout: 8000, env: getExecutionEnv() },
    (err, stdout) => {
      if (!err && stdout.trim() === 'ok') {
        return res.json({ whisperAvailable: true, pythonAvailable: true });
      }
      res.json({ whisperAvailable: false, pythonAvailable: !err });
    }
  );
}

export function postAudioTranscribe(req: Request, res: Response) {
  const file = req.file;
  if (!file) {
    return res.status(400).json({
      success: false,
      error: 'No audio file received in upload payload.'
    });
  }

  const filePath = file.path;
  const scriptPath = [
    path.resolve(import.meta.dirname, '../../scripts/transcribe_audio.py'),
    path.resolve(process.cwd(), 'backend/scripts/transcribe_audio.py'),
    path.resolve(process.cwd(), 'scripts/transcribe_audio.py')
  ].find((p) => fs.existsSync(p)) || path.resolve(import.meta.dirname, '../../scripts/transcribe_audio.py');

  function cleanupTempFile() {
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('Error removing temp audio file:', e);
      }
    }
  }

  function handleWhisperUnavailable(lastError?: string) {
    cleanupTempFile();
    return res.json({
      success: false,
      whisperAvailable: false,
      error:
        'Whisper speech recognition engine is not available on this server. Please use manual input.',
      details: lastError,
      requiresManualInput: true
    });
  }

  safeExecFile(
    getPythonExecutable(),
    [scriptPath, filePath],
    { timeout: 45000, env: getExecutionEnv() },
    (error, stdout, stderr) => {
      if (error) {
        return handleWhisperUnavailable(error.message || stderr);
      }

      cleanupTempFile();
      try {
        const parsed = JSON.parse(stdout);
        res.json({ ...parsed, whisperAvailable: true });
      } catch {
        res.json({
          success: true,
          transcript: stdout.trim(),
          confidence: 0.85,
          whisperAvailable: true
        });
      }
    }
  );
}
