/**
 * ACCESSPREP-X — Current Affairs & Transcript Workspace Controllers
 */

import type { Request, Response } from 'express';
import { getRepository } from '../repositories/index.ts';
import type { TranscriptLogEntry } from '../models/domain.models.ts';
import { CURATED_CURRENT_AFFAIRS } from '../services/index.ts';

export async function getCurrentAffairsQuestions(req: Request, res: Response) {
  try {
    const repo = await getRepository();
    const category = req.query.category as string | undefined;
    let questions = await repo.getCurrentAffairsQuestions(category);
    if (!questions || questions.length === 0) {
      await repo.saveCurrentAffairsQuestions(CURATED_CURRENT_AFFAIRS);
      questions = await repo.getCurrentAffairsQuestions(category);
    }
    res.json({
      success: true,
      total: questions.length,
      category: category || 'all',
      questions
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve current affairs questions.', details: err.message });
  }
}

export async function getCurrentAffairsStatus(_req: Request, res: Response) {
  try {
    const repo = await getRepository();
    let meta = await repo.getCurrentAffairsMetadata();
    if (meta.total === 0) {
      await repo.saveCurrentAffairsQuestions(CURATED_CURRENT_AFFAIRS);
      meta = await repo.getCurrentAffairsMetadata();
    }
    res.json({
      success: true,
      ...meta,
      sources: [
        'Press Information Bureau (PIB) India',
        'Indian Space Research Organisation (ISRO)',
        'Ministry of Finance & Reserve Bank of India',
        'Ministry of Law and Justice',
        'Ministry of Environment, Forest and Climate Change',
        'Sports Authority of India & Ministry of Youth Affairs and Sports'
      ]
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve current affairs status.', details: err.message });
  }
}

export async function postCurrentAffairsRefresh(_req: Request, res: Response) {
  try {
    const repo = await getRepository();
    const result = await repo.saveCurrentAffairsQuestions(CURATED_CURRENT_AFFAIRS);
    const meta = await repo.getCurrentAffairsMetadata();
    res.json({
      success: true,
      message: 'Current affairs questions refreshed and verified from attributable sources.',
      added: result.added,
      updated: result.updated,
      ...meta
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to refresh current affairs questions.', details: err.message });
  }
}

export async function getTranscripts(req: Request, res: Response) {
  try {
    const userId = String(req.query.userId || 'usr_candidate_01');
    const repo = await getRepository();
    const transcripts = await repo.getTranscripts(userId);
    res.json({
      success: true,
      total: transcripts.length,
      transcripts
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve transcripts.', details: err.message });
  }
}

export async function postTranscript(req: Request, res: Response) {
  try {
    const { userId, screenId, transcript, confidence, status, intent } = req.body;
    if (!userId || !transcript) {
      return res.status(400).json({ error: 'userId and transcript are required.' });
    }
    const repo = await getRepository();
    const entry: TranscriptLogEntry = {
      id: `tr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId: String(userId),
      timestamp: new Date().toISOString(),
      screenId: String(screenId || 'unknown'),
      transcript: String(transcript),
      confidence: typeof confidence === 'number' ? confidence : undefined,
      status: status || 'recognized',
      intent: intent ? String(intent) : undefined
    };
    await repo.recordTranscript(entry);
    res.json({ success: true, entry });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save transcript entry.', details: err.message });
  }
}

export async function deleteTranscripts(req: Request, res: Response) {
  try {
    const userId = String(req.query.userId || req.body?.userId || '');
    if (!userId) {
      return res.status(400).json({
        error: 'Authenticated candidate userId is required to delete transcripts.'
      });
    }
    const repo = await getRepository();
    await repo.clearTranscripts(userId);
    res.json({ success: true, message: 'Candidate transcripts cleared successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to clear candidate transcripts.', details: err.message });
  }
}

export async function getTranscriptSettings(req: Request, res: Response) {
  try {
    const userId = String(req.query.userId || 'usr_candidate_01');
    const repo = await getRepository();
    const settings = await repo.getTranscriptPrivacySettings(userId);
    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve transcript settings.', details: err.message });
  }
}

export async function postTranscriptSettings(req: Request, res: Response) {
  try {
    const { userId, storageEnabled, retentionDays } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'Authenticated candidate userId is required.' });
    }
    const repo = await getRepository();
    const updated = await repo.saveTranscriptPrivacySettings({
      userId: String(userId),
      storageEnabled: storageEnabled !== false,
      retentionDays: Number(retentionDays) || 30
    });
    res.json({ success: true, settings: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save transcript settings.', details: err.message });
  }
}
