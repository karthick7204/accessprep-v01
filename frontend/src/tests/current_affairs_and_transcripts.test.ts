import test from 'node:test';
import assert from 'node:assert/strict';
import { currentAffairsService } from '../utils/currentAffairsService.ts';
import { JsonRepository } from '../db/repository.ts';

test('Current Affairs: Contains 20 curated questions covering all 10 domain categories', () => {
  const allQs = currentAffairsService.getAll();
  assert.equal(allQs.length, 20, 'Must have exactly 20 current affairs questions');

  const requiredCategories = [
    'National Affairs',
    'International Affairs',
    'Science and Technology',
    'Government Schemes',
    'Economy',
    'Sports',
    'Awards and Honours',
    'Important Appointments',
    'Environment',
    'Important Days'
  ];

  const categoriesPresent = new Set(allQs.map((q) => q.category));
  for (const cat of requiredCategories) {
    assert.ok(categoriesPresent.has(cat as any), `Missing required category: ${cat}`);
  }
});

test('Current Affairs: Every question has verified source attribution, published date, and academic explanation', () => {
  const allQs = currentAffairsService.getAll();
  for (const q of allQs) {
    assert.ok(q.id.startsWith('CA-2026-'), `Invalid id: ${q.id}`);
    assert.ok(q.question_text.length > 20, `Question text too short for ${q.id}`);
    assert.ok(q.option_a.length > 0);
    assert.ok(q.option_b.length > 0);
    assert.ok(q.option_c.length > 0);
    assert.ok(q.option_d.length > 0);
    assert.ok(['A', 'B', 'C', 'D'].includes(q.correct_answer), `Invalid answer ${q.correct_answer}`);
    assert.ok(q.explanation.length > 20, `Explanation too short for ${q.id}`);
    assert.ok(q.source_name.length > 5, `Source attribution missing for ${q.id}`);
    assert.ok(!Number.isNaN(new Date(q.publication_date).getTime()), `Invalid published date for ${q.id}`);
    assert.equal(q.verification_status, 'Verified');
  }
});

test('Current Affairs: Category filter returns matching subset or full set for "all"', () => {
  const spaceQs = currentAffairsService.getQuestions('Science and Technology');
  assert.ok(spaceQs.length > 0);
  assert.ok(spaceQs.every((q) => q.category === 'Science and Technology'));

  const allFiltered = currentAffairsService.getQuestions('all');
  assert.equal(allFiltered.length, 20);
});

test('Transcripts: Repository stores, retrieves, and isolates candidate speech transcripts', async () => {
  const repo = new JsonRepository();
  const testUserId = `usr_test_transcript_${Date.now()}`;

  // Initially empty
  const initial = await repo.getTranscripts(testUserId);
  assert.equal(initial.length, 0);

  // Record a real browser speech transcript
  const record = await repo.recordTranscript({
    userId: testUserId,
    screenId: 'voice_practice',
    transcript: 'Option B is my answer',
    confidence: 0.94,
    status: 'recognized',
    intent: 'option_b'
  });

  assert.ok(record.id);
  assert.equal(record.transcript, 'Option B is my answer');
  assert.equal(record.confidence, 0.94);

  // Retrieve
  const fetched = await repo.getTranscripts(testUserId);
  assert.equal(fetched.length, 1);
  assert.equal(fetched[0].transcript, 'Option B is my answer');

  // Verify candidate isolation
  const otherUserFetched = await repo.getTranscripts('usr_other_candidate_isolated');
  assert.equal(otherUserFetched.length, 0);

  // Clear transcripts
  await repo.clearTranscripts(testUserId);
  const afterClear = await repo.getTranscripts(testUserId);
  assert.equal(afterClear.length, 0);
});

test('Transcripts: Privacy settings persistence', async () => {
  const repo = new JsonRepository();
  const testUserId = `usr_test_privacy_${Date.now()}`;

  const defaultSettings = await repo.getTranscriptPrivacySettings(testUserId);
  assert.equal(defaultSettings.userId, testUserId);
  assert.equal(defaultSettings.storageEnabled, true);

  await repo.saveTranscriptPrivacySettings({
    userId: testUserId,
    storageEnabled: false,
    retentionDays: 7
  });

  const updatedSettings = await repo.getTranscriptPrivacySettings(testUserId);
  assert.equal(updatedSettings.storageEnabled, false);
  assert.equal(updatedSettings.retentionDays, 7);
});
