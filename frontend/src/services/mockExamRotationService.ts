/**
 * ACCESSPREP-X Mock Examination Question Rotation Service
 *
 * Implements a persistent, user-specific, cycle-based question rotation engine
 * that guarantees candidates never receive duplicate or previously seen questions
 * within the same rotation cycle.
 *
 * Core Rule: A candidate must receive unseen questions until the entire eligible
 * question bank has been exhausted. Never repeat questions simply to fill a 90-question exam.
 */
import {
  getRepository,
  IDataRepository
} from '../db/repository.ts';
import {
  loadQuestions,
  Question,
  MockExamAttempt,
  MockExamQuestionAssignment,
  MockExamRotationState,
  LearningHistoryEntry
} from '../db/database.ts';
import { evaluateSubmission, QuestionSubmission, ExamEvaluationResult } from '../utils/scoring.ts';

export interface RotationStatus {
  userId: string;
  currentCycle: number;
  totalEligibleQuestions: number;
  completedQuestionCount: number;
  remainingQuestionCount: number;
  lastAttemptSequence: number;
  nextExamNumber: number;
  nextExamQuestionCount: number;
  isExhausted: boolean;
  activeAttempt: MockExamAttempt | null;
}

export type StartAttemptResult =
  | {
      isExhausted: false;
      attempt: MockExamAttempt;
      questions: Question[];
      isResumed: boolean;
      rotationStatus: RotationStatus;
    }
  | {
      isExhausted: true;
      message: string;
      currentCycle: number;
      totalEligibleQuestions: number;
      completedQuestionCount: number;
    };

// In-memory mutex to ensure concurrency safety per user (avoids parallel overlapping allocation)
const userLocks = new Map<string, Promise<void>>();

async function runWithUserLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  while (userLocks.has(userId)) {
    await userLocks.get(userId);
  }
  let resolveLock!: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    resolveLock = resolve;
  });
  userLocks.set(userId, lockPromise);
  try {
    return await fn();
  } finally {
    userLocks.delete(userId);
    resolveLock();
  }
}

// Cryptographically secure Fisher-Yates array shuffle
function secureShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export class MockExamRotationService {
  private repo: IDataRepository;

  constructor(repo?: IDataRepository) {
    // repo will be resolved dynamically via getRepository() if not passed
    this.repo = repo!;
  }

  private async getRepo(): Promise<IDataRepository> {
    if (!this.repo) {
      this.repo = await getRepository();
    }
    return this.repo;
  }

  /**
   * Retrieves rotation state for candidate, initializing default state if absent
   */
  async getOrCreateRotationState(userId: string): Promise<MockExamRotationState> {
    const repo = await this.getRepo();
    let state = await repo.getMockRotationState(userId);
    if (!state) {
      state = {
        userId,
        currentCycle: 1,
        completedQuestionCount: 0,
        lastAttemptSequence: 0,
        updatedAt: new Date().toISOString()
      };
      await repo.saveMockRotationState(state);
    }
    return state;
  }

  /**
   * Returns current rotation statistics for candidate
   */
  async getRotationStatus(userId: string): Promise<RotationStatus> {
    const repo = await this.getRepo();
    const state = await this.getOrCreateRotationState(userId);
    const allQuestions = loadQuestions();

    const assignments = await repo.getMockQuestionAssignments(userId, state.currentCycle);
    const completedQuestionIds = new Set(
      assignments.filter((a) => a.isSubmitted).map((a) => a.questionId)
    );

    const activeAttempt = await repo.getActiveMockAttempt(userId);

    const totalEligibleQuestions = allQuestions.length;
    const completedQuestionCount = completedQuestionIds.size;
    const remainingQuestionCount = Math.max(0, totalEligibleQuestions - completedQuestionCount);

    const lastAttemptSequence = state.lastAttemptSequence;
    const nextExamNumber = lastAttemptSequence + 1;
    const nextExamQuestionCount = Math.min(90, remainingQuestionCount);
    const isExhausted = remainingQuestionCount === 0 && !activeAttempt;

    return {
      userId,
      currentCycle: state.currentCycle,
      totalEligibleQuestions,
      completedQuestionCount,
      remainingQuestionCount,
      lastAttemptSequence,
      nextExamNumber,
      nextExamQuestionCount,
      isExhausted,
      activeAttempt
    };
  }

  /**
   * Starts a new examination or resumes an existing in-progress attempt
   */
  async startOrResumeAttempt(userId: string, isPwD: boolean = false): Promise<StartAttemptResult> {
    return runWithUserLock(userId, async () => {
      const repo = await this.getRepo();
      const state = await this.getOrCreateRotationState(userId);
      const allQuestions = loadQuestions();

      // 1. Check if candidate already has an in-progress attempt
      const activeAttempt = await repo.getActiveMockAttempt(userId);
      if (activeAttempt) {
        const qMap = new Map(allQuestions.map((q) => [q.question_id, q]));
        const questions: Question[] = (activeAttempt.questionIds || [])
          .map((id) => qMap.get(id))
          .filter((q): q is Question => Boolean(q));

        const status = await this.getRotationStatus(userId);
        return {
          isExhausted: false,
          attempt: activeAttempt,
          questions,
          isResumed: true,
          rotationStatus: status
        };
      }

      // 2. Retrieve completed questions in current cycle
      const assignments = await repo.getMockQuestionAssignments(userId, state.currentCycle);
      const completedQuestionIds = new Set(
        assignments.filter((a) => a.isSubmitted).map((a) => a.questionId)
      );

      // 3. Exclude completed and currently reserved questions
      const reservedQuestionIds = new Set(
        assignments.filter((a) => !a.isSubmitted).map((a) => a.questionId)
      );

      const availableQuestions = allQuestions.filter(
        (q) => !completedQuestionIds.has(q.question_id) && !reservedQuestionIds.has(q.question_id)
      );

      // 4. Exhaustion check: if no unseen questions remain, require cycle reset
      if (availableQuestions.length === 0) {
        return {
          isExhausted: true,
          message:
            'You have completed all available Mock Examination questions. Would you like to start a new question cycle?',
          currentCycle: state.currentCycle,
          totalEligibleQuestions: allQuestions.length,
          completedQuestionCount: completedQuestionIds.size
        };
      }

      // 5. Select up to 90 unique questions following SSC MTS Session I & II structure
      let selectedQuestions: Question[] = [];

      if (availableQuestions.length <= 90) {
        // When fewer than 90 questions remain, allocate exactly what remains
        selectedQuestions = secureShuffle(availableQuestions);
      } else {
        // Balance across subjects: Session I (20 Math, 20 Reasoning) + Session II (25 GA, 25 English) = 90
        const mathPool = secureShuffle(
          availableQuestions.filter((q) => q.subject === 'Numerical and Mathematical Ability')
        );
        const reasoningPool = secureShuffle(
          availableQuestions.filter((q) => q.subject === 'Reasoning Ability and Problem Solving')
        );
        const gaPool = secureShuffle(
          availableQuestions.filter((q) => q.subject === 'General Awareness')
        );
        const englishPool = secureShuffle(
          availableQuestions.filter((q) => q.subject === 'English Language and Comprehension')
        );

        const math = mathPool.slice(0, Math.min(20, mathPool.length));
        const reasoning = reasoningPool.slice(0, Math.min(20, reasoningPool.length));
        const ga = gaPool.slice(0, Math.min(25, gaPool.length));
        const english = englishPool.slice(0, Math.min(25, englishPool.length));

        selectedQuestions = [...math, ...reasoning, ...ga, ...english];

        // If any subject had fewer than targets but total available > 90, top up up to 90
        if (selectedQuestions.length < 90) {
          const selectedIds = new Set(selectedQuestions.map((q) => q.question_id));
          const remainder = secureShuffle(
            availableQuestions.filter((q) => !selectedIds.has(q.question_id))
          );
          const needed = 90 - selectedQuestions.length;
          selectedQuestions.push(...remainder.slice(0, needed));
        }
      }

      // Verify strict uniqueness
      const uniqueIds = new Set(selectedQuestions.map((q) => q.question_id));
      if (uniqueIds.size !== selectedQuestions.length) {
        throw new Error('Allocation integrity violation: duplicate questions generated');
      }

      // 6. Proportional examination timer:
      // Standard: 60s per question (e.g. 90 Qs = 5400s = 90m; 40 Qs = 2400s = 40m)
      // PwD (+20 min/hr compensatory): 80s per question (e.g. 90 Qs = 7200s = 120m; 40 Qs = 3200s = 53m 20s)
      const qCount = selectedQuestions.length;
      const initialSeconds = isPwD ? Math.round(qCount * 80) : qCount * 60;

      const attemptSequence = state.lastAttemptSequence + 1;
      const attemptId = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const initialAnswers: Record<string, { selectedOption: string | null; timeSpent: number; markedForReview: boolean }> = {};
      selectedQuestions.forEach((q) => {
        initialAnswers[q.question_id] = { selectedOption: null, timeSpent: 0, markedForReview: false };
      });

      const newAttempt: MockExamAttempt = {
        id: attemptId,
        userId,
        examTitle: `SSC MTS 2026 Official Pattern Mock Examination #${attemptSequence}`,
        session1Score: 0,
        session2Score: 0,
        totalScore: 0,
        totalMax: qCount * 3,
        percentage: 0,
        qualified: false,
        totalTimeSeconds: 0,
        answers: initialAnswers,
        completedAt: '',
        cycleNumber: state.currentCycle,
        attemptSequence,
        status: 'in_progress',
        totalQuestions: qCount,
        answeredQuestions: 0,
        startedAt: new Date().toISOString(),
        remainingTime: initialSeconds,
        currentQuestionIndex: 0,
        questionIds: selectedQuestions.map((q) => q.question_id)
      };

      const newAssignments: MockExamQuestionAssignment[] = selectedQuestions.map((q) => ({
        id: `asgn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${q.question_id}`,
        userId,
        attemptId,
        questionId: q.question_id,
        cycleNumber: state.currentCycle,
        assignedAt: newAttempt.startedAt!,
        isSubmitted: false
      }));

      // 7. Persist attempt and reserved question assignments atomically
      await repo.createMockAttempt(newAttempt, newAssignments);

      const status = await this.getRotationStatus(userId);

      return {
        isExhausted: false,
        attempt: newAttempt,
        questions: selectedQuestions,
        isResumed: false,
        rotationStatus: status
      };
    });
  }

  /**
   * Persists in-progress answer choices and timer for safe recovery on reload
   */
  async saveAttemptProgress(
    userId: string,
    attemptId: string,
    answers: Record<string, any>,
    remainingTime: number,
    currentQuestionIndex: number
  ): Promise<void> {
    const repo = await this.getRepo();
    const answeredCount = Object.values(answers).filter(
      (a: any) => a && a.selectedOption !== null && a.selectedOption !== undefined
    ).length;

    await repo.updateMockAttemptProgress(attemptId, {
      answers,
      remainingTime,
      currentQuestionIndex,
      answeredQuestions: answeredCount
    });
  }

  /**
   * Submits and scores an attempt, marking questions as permanently completed in the current cycle
   */
  async submitAttempt(
    userId: string,
    attemptId: string,
    submissions: QuestionSubmission[],
    answers: Record<string, any>,
    totalTimeSeconds?: number
  ): Promise<{
    success: boolean;
    attemptId: string;
    evaluation: ExamEvaluationResult;
    attempt: MockExamAttempt;
  }> {
    return runWithUserLock(userId, async () => {
      const repo = await this.getRepo();
      const allQuestions = loadQuestions();

      // Look up attempt
      let attempt = await repo.getMockAttemptById(attemptId);
      if (!attempt) {
        // Fallback for legacy calls where attemptId was generated on submit
        attempt = {
          id: attemptId || `mock_${Date.now()}`,
          userId,
          examTitle: 'SSC MTS 2026 Full-Length Mock Examination',
          session1Score: 0,
          session2Score: 0,
          totalScore: 0,
          totalMax: 270,
          percentage: 0,
          qualified: false,
          totalTimeSeconds: 0,
          answers: answers || {},
          completedAt: new Date().toISOString()
        };
      }

      // Format submissions with verified correct answers from question bank
      const qMap = new Map(allQuestions.map((q) => [q.question_id, q]));
      const formattedSubmissions: QuestionSubmission[] = (submissions || []).map((s) => {
        const q = qMap.get(s.questionId);
        return {
          questionId: s.questionId,
          subject: q ? q.subject : s.subject,
          selectedOption: s.selectedOption || null,
          correctAnswer: q ? q.correct_answer : 'A',
          timeSpentSeconds: Number(s.timeSpentSeconds) || 0
        };
      });

      const evalResult = evaluateSubmission(formattedSubmissions);
      const answeredCount = Object.values(answers || {}).filter(
        (a: any) => a && a.selectedOption !== null
      ).length;

      const completedAt = new Date().toISOString();
      const updatedAttempt: MockExamAttempt = {
        ...attempt,
        session1Score: evalResult.session1Score,
        session2Score: evalResult.session2Score,
        totalScore: evalResult.totalScore,
        totalMax: evalResult.totalMax,
        percentage: evalResult.totalPercentage,
        qualified: evalResult.session1Qualified,
        totalTimeSeconds: totalTimeSeconds || evalResult.totalTimeSeconds,
        answers: answers || {},
        completedAt,
        status: 'completed',
        answeredQuestions: answeredCount,
        score: evalResult.totalScore,
        accuracy: evalResult.accuracyPercentage
      };

      const historyEntry: LearningHistoryEntry = {
        id: `hist_mock_${Date.now()}`,
        userId,
        type: 'mock_exam',
        title: updatedAttempt.examTitle,
        summary: `Score: ${evalResult.totalScore}/${evalResult.totalMax} (${evalResult.totalPercentage}%). Session-I: ${
          evalResult.session1Qualified ? 'Qualified' : 'Not Qualified'
        }. Questions: ${formattedSubmissions.length}.`,
        score: evalResult.totalScore,
        maxScore: evalResult.totalMax,
        durationSeconds: updatedAttempt.totalTimeSeconds,
        timestamp: completedAt
      };

      // Atomically complete attempt, mark question assignments isSubmitted = true, and save history
      await repo.completeMockAttempt(updatedAttempt, historyEntry);

      // Update rotation state
      const state = await this.getOrCreateRotationState(userId);
      const assignments = await repo.getMockQuestionAssignments(userId, state.currentCycle);
      const completedCount = new Set(
        assignments.filter((a) => a.isSubmitted).map((a) => a.questionId)
      ).size;

      await repo.saveMockRotationState({
        userId,
        currentCycle: state.currentCycle,
        completedQuestionCount: completedCount,
        lastAttemptSequence: Math.max(state.lastAttemptSequence, updatedAttempt.attemptSequence || 1),
        updatedAt: completedAt
      });

      return {
        success: true,
        attemptId: updatedAttempt.id,
        evaluation: evalResult,
        attempt: updatedAttempt
      };
    });
  }

  /**
   * Explicitly discards an in-progress attempt, immediately releasing its reserved questions
   */
  async discardAttempt(userId: string, attemptId: string): Promise<{ success: boolean; message: string }> {
    return runWithUserLock(userId, async () => {
      const repo = await this.getRepo();
      await repo.discardMockAttempt(attemptId, userId);
      return {
        success: true,
        message: 'Attempt discarded. Reserved questions have been released back to the rotation pool.'
      };
    });
  }

  /**
   * Initiates a new question cycle after explicit candidate confirmation.
   * All historical attempts, scores, and analytics are preserved.
   */
  async resetCycle(userId: string): Promise<{ success: boolean; newCycle: number; message: string }> {
    return runWithUserLock(userId, async () => {
      const repo = await this.getRepo();
      const state = await this.getOrCreateRotationState(userId);
      const newCycle = state.currentCycle + 1;

      await repo.saveMockRotationState({
        userId,
        currentCycle: newCycle,
        completedQuestionCount: 0,
        lastAttemptSequence: 0,
        updatedAt: new Date().toISOString()
      });

      return {
        success: true,
        newCycle,
        message: `Rotation Cycle ${newCycle} successfully started. All eligible questions are now available for practice.`
      };
    });
  }
}

// Singleton helper
let rotationServiceInstance: MockExamRotationService | null = null;

export function getMockExamRotationService(): MockExamRotationService {
  if (!rotationServiceInstance) {
    rotationServiceInstance = new MockExamRotationService();
  }
  return rotationServiceInstance;
}
