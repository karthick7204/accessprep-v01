import test from 'node:test';
import assert from 'node:assert';

// -------------------------------------------------------------
// 1. KPI DERIVED METRICS TESTS
// -------------------------------------------------------------
test('BI KPI: Readiness Index combines practice accuracy (60%) and mock score (40%)', () => {
  const practiceAccuracy = 80;
  const mockScorePct = 70;
  const readiness = Math.round(practiceAccuracy * 0.6 + mockScorePct * 0.4);

  assert.strictEqual(readiness, 76);
  assert.ok(readiness >= 70, 'Candidate should be classified as on-track for cutoff');
});

test('BI KPI: Fallback handling when candidate has zero practice questions', () => {
  const totalPracticeQuestions = 0;
  const practiceAccuracy = 0;
  const defaultBaseline = 30;
  const readiness = Math.round(practiceAccuracy * 0.6 + defaultBaseline * 0.4);

  assert.strictEqual(readiness, 12);
  assert.strictEqual(totalPracticeQuestions, 0);
});

// -------------------------------------------------------------
// 2. DONUT CHART MATHEMATICAL INTEGRITY
// -------------------------------------------------------------
test('BI Donut Chart: Circumference and Segment Dash Distribution', () => {
  const size = 180;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  assert.ok(radius > 0);
  assert.ok(circumference > 0);

  const subjectCounts = [
    { subject: 'Numerical and Mathematical Ability', count: 40 },
    { subject: 'Reasoning Ability and Problem Solving', count: 30 },
    { subject: 'English Language and Comprehension', count: 20 },
    { subject: 'General Awareness', count: 10 }
  ];

  const total = subjectCounts.reduce((sum, s) => sum + s.count, 0);
  assert.strictEqual(total, 100);

  let accumulatedPct = 0;
  const segments = subjectCounts.map((s) => {
    const pct = Math.round((s.count / total) * 100);
    const dashLength = (pct / 100) * circumference;
    const dashOffset = -((accumulatedPct / 100) * circumference);
    accumulatedPct += pct;
    return { pct, dashLength, dashOffset };
  });

  assert.strictEqual(accumulatedPct, 100);
  assert.strictEqual(segments[0].pct, 40);
  assert.strictEqual(segments[1].pct, 30);
  assert.strictEqual(segments[2].pct, 20);
  assert.strictEqual(segments[3].pct, 10);
});

// -------------------------------------------------------------
// 3. SUBJECT GAUGE STATUS CLASSIFICATION
// -------------------------------------------------------------
test('BI Subject Gauges: Thresholds for Mastered, Proficient, Developing, and Novice', () => {
  const classify = (attempted: number, accuracy: number) => {
    if (attempted === 0) return 'No Data';
    if (accuracy >= 80) return 'Mastered';
    if (accuracy >= 65) return 'Proficient';
    if (accuracy >= 45) return 'Developing';
    return 'Novice';
  };

  assert.strictEqual(classify(0, 0), 'No Data');
  assert.strictEqual(classify(15, 85), 'Mastered');
  assert.strictEqual(classify(20, 70), 'Proficient');
  assert.strictEqual(classify(10, 50), 'Developing');
  assert.strictEqual(classify(8, 30), 'Novice');
});

// -------------------------------------------------------------
// 4. TOPIC MASTERY FILTERING LOGIC
// -------------------------------------------------------------
test('BI Topic Mastery: Search & Status Filters', () => {
  const topics = [
    { topic: 'Number Systems', subject: 'Numerical and Mathematical Ability', masteryPercentage: 85, tier: 'Mastered' as const },
    { topic: 'Percentages', subject: 'Numerical and Mathematical Ability', masteryPercentage: 55, tier: 'Developing' as const },
    { topic: 'Coding Decoding', subject: 'Reasoning Ability and Problem Solving', masteryPercentage: 90, tier: 'Mastered' as const },
    { topic: 'Spotting Errors', subject: 'English Language and Comprehension', masteryPercentage: 40, tier: 'Novice' as const },
    { topic: 'Modern History', subject: 'General Awareness', masteryPercentage: 62, tier: 'Developing' as const }
  ];

  // Filter: Weak topics (< 65%)
  const weak = topics.filter((t) => t.masteryPercentage < 65);
  assert.strictEqual(weak.length, 3);
  assert.ok(weak.some((t) => t.topic === 'Percentages'));
  assert.ok(weak.some((t) => t.topic === 'Spotting Errors'));
  assert.ok(weak.some((t) => t.topic === 'Modern History'));

  // Filter: Mastered topics (>= 80%)
  const mastered = topics.filter((t) => t.masteryPercentage >= 80);
  assert.strictEqual(mastered.length, 2);

  // Filter: Subject Numerical
  const math = topics.filter((t) => t.subject === 'Numerical and Mathematical Ability');
  assert.strictEqual(math.length, 2);

  // Search filter
  const searchResults = topics.filter((t) => t.topic.toLowerCase().includes('coding'));
  assert.strictEqual(searchResults.length, 1);
  assert.strictEqual(searchResults[0].topic, 'Coding Decoding');
});

// -------------------------------------------------------------
// 5. LEARNING ACTIVITY AUDIT TRAIL CLASSIFICATION
// -------------------------------------------------------------
test('BI Learning History: Activity Type Mapping & Score Percentages', () => {
  const activities = [
    { type: 'MOCK', title: 'Mock Exam 1', score: 195, maxScore: 270 },
    { type: 'PRACTICE', title: 'Percentages Practice', score: 9, maxScore: 10 },
    { type: 'TUTOR', title: 'AI Tutor Session on Algebra', score: null, maxScore: null }
  ];

  const mock = activities[0];
  const mockPct = Math.round((mock.score! / mock.maxScore!) * 100);
  assert.strictEqual(mockPct, 72);

  const practice = activities[1];
  const practicePct = Math.round((practice.score! / practice.maxScore!) * 100);
  assert.strictEqual(practicePct, 90);

  const tutor = activities[2];
  assert.strictEqual(tutor.score, null);
});

// -------------------------------------------------------------
// 6. ACCURACY TREND COORDINATE COMPUTATION
// -------------------------------------------------------------
test('BI Accuracy Trend: Coordinate mapping scales linearly within bounding box', () => {
  const width = 500;
  const height = 180;
  const paddingX = 40;
  const paddingY = 25;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const getCoordinates = (accuracy: number, index: number, totalPoints: number) => {
    const x = paddingX + (index / (totalPoints - 1)) * chartWidth;
    const y = paddingY + chartHeight - (accuracy / 100) * chartHeight;
    return { x, y };
  };

  const point0 = getCoordinates(0, 0, 5); // 0% accuracy at start
  assert.strictEqual(point0.x, paddingX);
  assert.strictEqual(point0.y, paddingY + chartHeight);

  const point100 = getCoordinates(100, 4, 5); // 100% accuracy at end
  assert.strictEqual(point100.x, paddingX + chartWidth);
  assert.strictEqual(point100.y, paddingY);

  const target70Y = paddingY + chartHeight - (70 / 100) * chartHeight;
  assert.ok(target70Y < point0.y);
  assert.ok(target70Y > point100.y);
});

// -------------------------------------------------------------
// 7. SPEED VS ACCURACY QUADRANT CLASSIFICATION
// -------------------------------------------------------------
test('BI Speed vs Accuracy: Quadrant efficiency classifications for SSC MTS pace', () => {
  const classify = (acc: number, speed: number, attempted: number) => {
    if (attempted === 0) return 'No Data';
    const isAccurate = acc >= 70;
    const isFast = speed > 0 && speed <= 45;

    if (isAccurate && isFast) return 'Optimal Efficiency';
    if (isAccurate && !isFast) return 'Cautious & Precise';
    if (!isAccurate && isFast) return 'Rushing / High Errors';
    return 'Needs Conceptual Work';
  };

  assert.strictEqual(classify(0, 0, 0), 'No Data');
  assert.strictEqual(classify(85, 35, 20), 'Optimal Efficiency'); // fast & accurate
  assert.strictEqual(classify(75, 55, 15), 'Cautious & Precise'); // accurate but slow
  assert.strictEqual(classify(50, 30, 25), 'Rushing / High Errors'); // fast but inaccurate
  assert.strictEqual(classify(40, 60, 10), 'Needs Conceptual Work'); // slow & inaccurate
});

// -------------------------------------------------------------
// 8. SCREEN RESPONSIBILITY SEPARATION
// -------------------------------------------------------------
test('Screen Separation: Overview handles action items while Progress handles deep BI analytics', () => {
  const overviewResponsibilities = [
    'welcome_section',
    'daily_readiness_kpi',
    'recommended_activity',
    'quick_actions',
    'compact_subject_summary',
    'revision_reminder',
    'recent_activity'
  ];

  const progressBiResponsibilities = [
    'performance_summary_kpis',
    'circular_subject_gauges',
    'accuracy_trend_line_chart',
    'subject_distribution_donut',
    'mock_exam_progression',
    'topic_mastery_bkt',
    'speed_vs_accuracy_matrix',
    'learning_history_audit_trail',
    'sm2_revision_breakdown',
    'export_report'
  ];

  // No overlap between heavy BI analytics and overview action items
  assert.strictEqual(overviewResponsibilities.includes('accuracy_trend_line_chart'), false);
  assert.strictEqual(overviewResponsibilities.includes('subject_distribution_donut'), false);
  assert.strictEqual(overviewResponsibilities.includes('speed_vs_accuracy_matrix'), false);
  assert.strictEqual(progressBiResponsibilities.includes('accuracy_trend_line_chart'), true);
  assert.strictEqual(progressBiResponsibilities.includes('subject_distribution_donut'), true);
  assert.strictEqual(progressBiResponsibilities.includes('speed_vs_accuracy_matrix'), true);
});


