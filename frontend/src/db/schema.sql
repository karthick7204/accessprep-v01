-- ====================================================================
-- ACCESSPREP-X: Accessible SSC MTS Examination Platform Schema
-- Database: PostgreSQL 14+
-- Adheres to: RPwD Act 2016 Accommodations & Official SSC MTS Guidelines
-- ====================================================================

-- 1. Users Entity
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    roll_number VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'candidate' CHECK (role IN ('candidate', 'admin')),
    pwd_category VARCHAR(64) NOT NULL DEFAULT 'None' CHECK (pwd_category IN ('None', 'Visually Impaired', 'Low Vision', 'Locomotor')),
    need_scribe BOOLEAN NOT NULL DEFAULT FALSE,
    exam_region VARCHAR(128) NOT NULL DEFAULT 'Northern Region (NR)',
    exam_language VARCHAR(64) NOT NULL DEFAULT 'English',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Accessibility Settings Entity
CREATE TABLE IF NOT EXISTS accessibility_settings (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(32) NOT NULL DEFAULT 'sapphire' CHECK (theme IN ('sapphire', 'high_contrast_yellow', 'monochrome_dark', 'soft_dark')),
    font_scale INTEGER NOT NULL DEFAULT 125 CHECK (font_scale IN (100, 125, 150, 175, 200)),
    dyslexia_font BOOLEAN NOT NULL DEFAULT FALSE,
    speech_rate NUMERIC(3,2) NOT NULL DEFAULT 1.00 CHECK (speech_rate BETWEEN 0.50 AND 2.00),
    speech_pitch NUMERIC(3,2) NOT NULL DEFAULT 1.00 CHECK (speech_pitch BETWEEN 0.50 AND 2.00),
    voice_uri VARCHAR(128) NOT NULL DEFAULT 'default',
    auto_read_aloud BOOLEAN NOT NULL DEFAULT TRUE,
    high_contrast_borders BOOLEAN NOT NULL DEFAULT TRUE,
    reduce_motion BOOLEAN NOT NULL DEFAULT FALSE,
    compensatory_time_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    whisper_model_size VARCHAR(16) NOT NULL DEFAULT 'base' CHECK (whisper_model_size IN ('tiny', 'base', 'small'))
);

-- 3. Verified Questions Entity (400 Manually Curated SSC MTS Items)
CREATE TABLE IF NOT EXISTS questions (
    question_id VARCHAR(64) PRIMARY KEY,
    subject VARCHAR(128) NOT NULL CHECK (subject IN (
        'Numerical and Mathematical Ability',
        'Reasoning Ability and Problem Solving',
        'General Awareness',
        'English Language and Comprehension'
    )),
    topic VARCHAR(128) NOT NULL,
    subtopic VARCHAR(128) DEFAULT '',
    question_text TEXT NOT NULL,
    question_type VARCHAR(32) NOT NULL DEFAULT 'multiple_choice' CHECK (question_type = 'multiple_choice'),
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
    explanation TEXT NOT NULL,
    difficulty_label VARCHAR(16) NOT NULL CHECK (difficulty_label IN ('Easy', 'Medium', 'Hard')),
    source_name VARCHAR(255) NOT NULL,
    source_reference VARCHAR(255) NOT NULL,
    source_type VARCHAR(64) NOT NULL DEFAULT 'Official Exam Paper',
    verification_status VARCHAR(32) NOT NULL DEFAULT 'Verified' CHECK (verification_status IN ('Verified', 'Pending', 'Rejected')),
    language VARCHAR(32) NOT NULL DEFAULT 'English',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dataset_version VARCHAR(32) NOT NULL DEFAULT 'v1.0-mts-verified'
);

CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty_label);

-- 4. Practice Session Submissions
CREATE TABLE IF NOT EXISTS practice_attempts (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id VARCHAR(64) NOT NULL REFERENCES questions(question_id) ON DELETE RESTRICT,
    selected_option CHAR(1) NOT NULL CHECK (selected_option IN ('A', 'B', 'C', 'D')),
    is_correct BOOLEAN NOT NULL,
    time_spent_seconds INTEGER NOT NULL DEFAULT 30,
    mode VARCHAR(16) NOT NULL DEFAULT 'standard' CHECK (mode IN ('standard', 'voice')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_user_time ON practice_attempts(user_id, timestamp DESC);

-- 5. Mock Examination Attempts
CREATE TABLE IF NOT EXISTS mock_attempts (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_title VARCHAR(255) NOT NULL,
    session1_score INTEGER NOT NULL DEFAULT 0,
    session2_score INTEGER NOT NULL DEFAULT 0,
    total_score INTEGER NOT NULL DEFAULT 0,
    total_max INTEGER NOT NULL DEFAULT 270,
    percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    qualified BOOLEAN NOT NULL DEFAULT FALSE,
    total_time_seconds INTEGER NOT NULL DEFAULT 0,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cycle_number INTEGER NOT NULL DEFAULT 1,
    attempt_sequence INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'completed',
    total_questions INTEGER NOT NULL DEFAULT 90,
    answered_questions INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    remaining_time INTEGER DEFAULT 5400,
    current_question_index INTEGER DEFAULT 0,
    question_ids JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_mock_user_time ON mock_attempts(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_mock_user_status ON mock_attempts(user_id, status);

-- 6. SuperMemo SM-2 Spaced Repetition Items
CREATE TABLE IF NOT EXISTS revision_items (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id VARCHAR(64) NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
    repetitions INTEGER NOT NULL DEFAULT 0,
    interval_days INTEGER NOT NULL DEFAULT 1,
    easiness_factor NUMERIC(4,2) NOT NULL DEFAULT 2.50 CHECK (easiness_factor >= 1.30),
    last_reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    next_review_due TIMESTAMPTZ NOT NULL,
    mastery_level VARCHAR(32) NOT NULL DEFAULT 'Novice' CHECK (mastery_level IN ('Novice', 'Learning', 'Reviewing', 'Mastered')),
    CONSTRAINT uq_user_question_revision UNIQUE (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_revision_due ON revision_items(user_id, next_review_due ASC);

-- 7. Bayesian Knowledge Tracing (BKT) Topic Mastery
CREATE TABLE IF NOT EXISTS topic_mastery (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(128) NOT NULL,
    topic VARCHAR(128) NOT NULL,
    p_known NUMERIC(4,3) NOT NULL DEFAULT 0.250 CHECK (p_known BETWEEN 0.000 AND 1.000),
    mastery_percentage INTEGER NOT NULL DEFAULT 25 CHECK (mastery_percentage BETWEEN 0 AND 100),
    tier VARCHAR(32) NOT NULL DEFAULT 'Novice' CHECK (tier IN ('Novice', 'Developing', 'Proficient', 'Mastered')),
    attempts_count INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_topic_mastery UNIQUE (user_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_mastery_user ON topic_mastery(user_id);

-- 8. Unified Learning History Log
CREATE TABLE IF NOT EXISTS learning_history (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL CHECK (type IN ('practice', 'mock_exam', 'diagnostic', 'ai_tutor', 'revision')),
    title VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    score INTEGER DEFAULT NULL,
    max_score INTEGER DEFAULT NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_user_time ON learning_history(user_id, timestamp DESC);

-- 9. Pilot Demo Diagnostic Attempts
CREATE TABLE IF NOT EXISTS diagnostic_attempts (
    id VARCHAR(64) PRIMARY KEY,
    client_submission_id VARCHAR(128) UNIQUE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_title VARCHAR(255) NOT NULL DEFAULT 'SSC MTS Pilot Demo Diagnostic',
    status VARCHAR(32) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'in_progress')),
    total_questions INTEGER NOT NULL DEFAULT 20,
    attempted_count INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    incorrect_count INTEGER NOT NULL DEFAULT 0,
    unanswered_count INTEGER NOT NULL DEFAULT 0,
    session1_score INTEGER NOT NULL DEFAULT 0,
    session2_score INTEGER NOT NULL DEFAULT 0,
    total_score INTEGER NOT NULL DEFAULT 0,
    total_max INTEGER NOT NULL DEFAULT 60,
    percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    accuracy_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    total_time_seconds INTEGER NOT NULL DEFAULT 0,
    responses JSONB NOT NULL DEFAULT '[]'::jsonb,
    subject_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
    topic_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
    acceptance_status VARCHAR(32) NOT NULL DEFAULT 'ACCEPTED',
    acceptance_method VARCHAR(32) NOT NULL DEFAULT 'CHECKBOX' CHECK (acceptance_method IN ('VOICE', 'CHECKBOX', 'KEYBOARD')),
    accepted_at TIMESTAMPTZ,
    exam_started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_user_time ON diagnostic_attempts(user_id, completed_at DESC);

-- 10. Mock Examination Question Assignments
CREATE TABLE IF NOT EXISTS mock_exam_question_assignments (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attempt_id VARCHAR(64) NOT NULL,
    question_id VARCHAR(64) NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
    cycle_number INTEGER NOT NULL DEFAULT 1,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_submitted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_attempt_question UNIQUE (attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_mock_assignments_user_cycle ON mock_exam_question_assignments(user_id, cycle_number, is_submitted);

-- 11. Mock Examination Rotation State
CREATE TABLE IF NOT EXISTS mock_exam_rotation_state (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_cycle INTEGER NOT NULL DEFAULT 1,
    completed_question_count INTEGER NOT NULL DEFAULT 0,
    last_attempt_sequence INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

