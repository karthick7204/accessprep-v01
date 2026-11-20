/**
 * ACCESSPREP-X — Universal Page Help & Shortcut Registry
 * ============================================================================
 * Comprehensive voice command and keyboard shortcut descriptions for
 * strictly every screen and workflow in the accessible SSC MTS portal.
 */

export interface VoiceCommandHelpItem {
  command: string;
  description: string;
}

export interface KeyboardShortcutHelpItem {
  key: string;
  label: string;
  actionDescription: string;
}

export interface PageHelpRecord {
  screenId: string;
  title: string;
  introPrompt: string;
  voiceCommands: VoiceCommandHelpItem[];
  keyboardShortcuts: KeyboardShortcutHelpItem[];
  spokenVoiceHelp: string;
  spokenKeyboardHelp: string;
}

export const PAGE_HELP_REGISTRY: Record<string, PageHelpRecord> = {
  welcome: {
    screenId: 'welcome',
    title: 'Welcome & Accessibility Onboarding',
    introPrompt: 'Welcome to Welcome and Accessibility Onboarding. Would you like help with Voice Commands or Keyboard Shortcuts? Press V for voice commands, press K for keyboard shortcuts, or press S to skip.',
    voiceCommands: [
      { command: 'Start Voice Mode / Activate Voice', description: 'Enables high-contrast voice-guided assistance across all pages.' },
      { command: 'Candidate Login / Go to Login', description: 'Navigates directly to candidate sign-in page.' },
      { command: 'Register Account / Sign Up', description: 'Opens new candidate account registration.' },
      { command: 'Stop / Quiet', description: 'Immediately silences active voice speech.' }
    ],
    keyboardShortcuts: [
      { key: 'Enter / L', label: 'Enter / L', actionDescription: 'Navigate to Candidate Login.' },
      { key: 'R', label: 'R', actionDescription: 'Navigate to Candidate Registration.' },
      { key: 'Alt + V', label: 'Alt + V', actionDescription: 'Switch to Voice Assistance Mode.' },
      { key: 'Alt + K', label: 'Alt + K', actionDescription: 'Switch to Keyboard Shortcut Mode.' },
      { key: 'Alt + M', label: 'Alt + M', actionDescription: 'Switch to Independent Manual Mode.' },
      { key: 'Escape', label: 'Escape', actionDescription: 'Halt ongoing speech immediately.' }
    ],
    spokenVoiceHelp: 'Welcome page voice commands: Say "Start Voice Mode" to enable voice guidance. Say "Candidate Login" or "Go to Login" to sign in. Say "Register Account" to create a new profile. Say "Stop" to silence speech.',
    spokenKeyboardHelp: 'Welcome page keyboard shortcuts: Press Enter or L to go to Login. Press R to Register. Press Alt and V for Voice Mode. Press Alt and K for Keyboard Mode. Press Alt and M for Manual Mode. Press Escape to stop speech.'
  },

  login: {
    screenId: 'login',
    title: 'Candidate Login',
    introPrompt: 'Welcome to Candidate Login. Would you like help with Voice Commands or Keyboard Shortcuts? Press V for voice commands, press K for keyboard shortcuts, or press S to skip.',
    voiceCommands: [
      { command: 'Start Voice Login / Voice Login', description: 'Starts 4-step voice-guided login asking for registered email address, password, and audio verification code.' },
      { command: 'Start Audio CAPTCHA / Audio CAPTCHA', description: 'Reads aloud the four-digit audio verification challenge and listens for your spoken digits.' },
      { command: 'Repeat CAPTCHA / Read Verification Code', description: 'Re-reads the current verification digits aloud with distinct pauses.' },
      { command: 'Refresh CAPTCHA / New Code', description: 'Generates a fresh four-digit challenge code.' },
      { command: 'Read Instructions / Read Guide', description: 'Reads the complete sign-in instructions and accessible security guidelines.' },
      { command: 'Read All Fields', description: 'Reads the status and values of identifier, password, and captcha fields.' },
      { command: 'Use Keyboard / Switch to Keyboard', description: 'Focuses email field for manual keyboard typing.' },
      { command: 'Go to Registration', description: 'Navigates to the Candidate Registration screen.' }
    ],
    keyboardShortcuts: [
      { key: 'L', label: 'L', actionDescription: 'Focus Email / Roll Number field.' },
      { key: 'P', label: 'P', actionDescription: 'Focus Password field.' },
      { key: 'C', label: 'C', actionDescription: 'Auto-fill audio verification code.' },
      { key: 'R', label: 'R', actionDescription: 'Play audio verification code aloud.' },
      { key: 'F2', label: 'F2', actionDescription: 'Re-read current field value.' },
      { key: 'Y', label: 'Y', actionDescription: 'Confirm field value or sign in.' },
      { key: 'N', label: 'N', actionDescription: 'Clear field or cancel.' },
      { key: 'S', label: 'S', actionDescription: 'Review details and sign in.' },
      { key: 'G', label: 'G', actionDescription: 'Go to Candidate Registration.' },
      { key: 'H', label: 'H', actionDescription: 'Login instructions and help.' },
      { key: 'K', label: 'K', actionDescription: 'Read all login shortcuts aloud.' },
      { key: 'Escape', label: 'Escape', actionDescription: 'Stop speaking immediately.' }
    ],
    spokenVoiceHelp: 'Login voice commands: Say "Start Voice Login" to be prompted for your registered email address and password. Say "Start Audio CAPTCHA" to hear and speak the verification digits. Say "Repeat CAPTCHA" to listen again. Say "Refresh CAPTCHA" for a new code. Say "Read Instructions" for guidance. Say "Go to Registration" to register.',
    spokenKeyboardHelp: 'Login keyboard shortcuts: Press L to type email address or roll number. Press P to enter confidential password. Press C to auto-fill audio verification code. Press R to play verification code aloud. Press F 2 to re-read current field. Press Y to confirm. Press N to clear. Press S to sign in. Press G to go to Registration. Press H for help. Press K to hear this description again. Press Escape to stop speech.'
  },

  register: {
    screenId: 'register',
    title: 'Candidate Registration',
    introPrompt: 'Welcome to Candidate Registration. Would you like help with Voice Commands or Keyboard Shortcuts? Press V for voice commands, press K for keyboard shortcuts, or press S to skip.',
    voiceCommands: [
      { command: 'Start Voice Registration / Voice Registration', description: 'Starts 6-step guided voice registration for full name, email, password, PwD category, scribe need, and captcha.' },
      { command: 'Start Audio CAPTCHA / Audio CAPTCHA', description: 'Reads verification digits and captures your spoken response.' },
      { command: 'Repeat CAPTCHA / Read Verification Code', description: 'Re-reads verification digits aloud.' },
      { command: 'Refresh CAPTCHA / New Code', description: 'Generates a new four-digit code.' },
      { command: 'Go to Login', description: 'Navigates back to candidate sign-in page.' },
      { command: 'Read Instructions / Read Guide', description: 'Reads registration instructions and PwD exam scribe options.' },
      { command: 'Use Keyboard', description: 'Focuses candidate name input for manual entry.' }
    ],
    keyboardShortcuts: [
      { key: 'L', label: 'L', actionDescription: 'Focus Email field.' },
      { key: 'P', label: 'P', actionDescription: 'Focus Password field.' },
      { key: 'C', label: 'C', actionDescription: 'Auto-fill audio verification code.' },
      { key: 'R', label: 'R', actionDescription: 'Play audio verification code aloud.' },
      { key: 'S', label: 'S', actionDescription: 'Submit registration form.' },
      { key: 'G', label: 'G', actionDescription: 'Go to Candidate Login.' },
      { key: 'H', label: 'H', actionDescription: 'Registration help and scribe details.' },
      { key: 'K', label: 'K', actionDescription: 'Read all registration shortcuts aloud.' },
      { key: 'Escape', label: 'Escape', actionDescription: 'Stop speech immediately.' }
    ],
    spokenVoiceHelp: 'Registration voice commands: Say "Start Voice Registration" for 6-step guided registration. Say "Start Audio CAPTCHA" to hear and speak verification digits. Say "Repeat CAPTCHA" to replay digits. Say "Go to Login" to sign in. Say "Read Instructions" for PwD scribe details.',
    spokenKeyboardHelp: 'Registration keyboard shortcuts: Press L to type email address. Press P to enter password. Press C to auto-fill audio verification code. Press R to play verification code aloud. Press S to submit registration. Press G to go to Login. Press H for help. Press K to hear shortcuts. Press Escape to stop speech.'
  },

  dashboard: {
    screenId: 'dashboard',
    title: 'Student Dashboard',
    introPrompt: 'Welcome to Student Dashboard. Would you like help with Voice Commands or Keyboard Shortcuts? Press V for voice commands, press K for keyboard shortcuts, or press S to skip.',
    voiceCommands: [
      { command: 'Start Practice / Voice Practice', description: 'Opens hands-free Voice Practice Session.' },
      { command: 'Mock Exam / Start Exam', description: 'Opens official SSC MTS Mock Examination.' },
      { command: 'AI Tutor / Ask Tutor', description: 'Opens AI Syllabus Tutor for concepts and doubts.' },
      { command: 'Revision Planner / Flashcards', description: 'Opens Adaptive Spaced-Repetition Revision Drill.' },
      { command: 'Explore Subjects / Subjects', description: 'Opens Subject and Topic Explorer.' },
      { command: 'Progress Analytics / Analytics', description: 'Opens Performance and Readiness Dashboard.' },
      { command: 'Pilot Demo / Diagnostic', description: 'Launches Diagnostic Pilot Demo.' },
      { command: 'Read Overview / Read Aloud', description: 'Reads your Readiness Index, accuracy, and practice statistics.' }
    ],
    keyboardShortcuts: [
      { key: 'Alt + P', label: 'Alt + P', actionDescription: 'Voice Practice — Opens Voice-First Practice screen (Screen 6).' },
      { key: 'Alt + E', label: 'Alt + E', actionDescription: 'Mock Examination — Opens full timed SSC MTS test (Screen 7).' },
      { key: 'Alt + S', label: 'Alt + S', actionDescription: 'Subject & Topic Explorer — Opens Subject & Topic Explorer (Screen 5).' },
      { key: 'Alt + O', label: 'Alt + O', actionDescription: 'Pilot Demo Diagnostic — Opens 20-question Diagnostic (Screen 17).' },
      { key: 'Alt + T', label: 'Alt + T', actionDescription: 'AI Syllabus Tutor — Opens AI Tutor Scribe (Screen 9).' },
      { key: 'Alt + R', label: 'Alt + R', actionDescription: 'Revision Planner — Opens Spaced Repetition Planner (Screen 10).' },
      { key: 'Alt + A', label: 'Alt + A', actionDescription: 'Progress Analytics — Opens Performance Analytics (Screen 11).' },
      { key: 'Alt + U', label: 'Alt + U', actionDescription: 'Results & Explanations — Opens Examination Results (Screen 8).' },
      { key: 'Alt + D', label: 'Alt + D', actionDescription: 'Candidate Dashboard — Navigates to Assessment Dashboard (Screen 4).' },
      { key: 'Alt + Space', label: 'Alt + Space', actionDescription: 'Vision Voice Assistant — Toggles microphone listening state.' },
      { key: 'Escape', label: 'Escape', actionDescription: 'Stop Audio Speech — Halts ongoing speech immediately.' }
    ],
    spokenVoiceHelp: 'Dashboard voice commands: Say "Start Practice" for Voice Practice. Say "Mock Exam" for full test. Say "AI Tutor" for syllabus doubts. Say "Revision Planner" for flashcard drill. Say "Explore Subjects" to browse syllabus. Say "Progress Analytics" for scores. Say "Read Overview" for summary statistics.',
    spokenKeyboardHelp: 'Dashboard keyboard shortcuts: Press Alt and P to open Voice Practice. Press Alt and E to open Mock Examination. Press Alt and S to open Subject and Topic Explorer. Press Alt and O to open Pilot Demo Diagnostic. Press Alt and T to open AI Syllabus Tutor. Press Alt and R to open Revision Planner. Press Alt and A to open Progress Analytics. Press Alt and U to open Results and Explanations. Press Alt and D to refresh Dashboard. Press Alt and Space to toggle Voice Assistant. Press Escape to stop speech.'
  },

  topics: {
    screenId: 'topics',
    title: 'Subject & Topic Explorer',
    introPrompt: 'Welcome to Subject and Topic Explorer. Would you like help with Voice Commands or Keyboard Shortcuts? Press V for voice commands, press K for keyboard shortcuts, or press S to skip.',
    voiceCommands: [
      { command: 'Select Numerical Ability / Math', description: 'Switches syllabus view to Numerical and Mathematical Ability (100 questions).' },
      { command: 'Select Reasoning Ability / Reasoning', description: 'Switches view to Reasoning Ability and Problem Solving (100 questions).' },
      { command: 'Select General Awareness / GK', description: 'Switches view to General Awareness and Current Affairs (100 questions).' },
      { command: 'Select English / English Language', description: 'Switches view to English Language and Comprehension (100 questions).' },
      { command: 'Start Practice / Practice Selected', description: 'Opens Voice Practice filtered directly to the selected subject and topic.' },
      { command: 'Search [query]', description: 'Filters topics and subtopics matching the search phrase.' },
      { command: 'Read Overview', description: 'Announces total questions, topics count, and syllabus breakdown.' }
    ],
    keyboardShortcuts: [
      { key: '1', label: '1', actionDescription: 'Select Numerical and Mathematical Ability.' },
      { key: '2', label: '2', actionDescription: 'Select Reasoning Ability and Problem Solving.' },
      { key: '3', label: '3', actionDescription: 'Select General Awareness.' },
      { key: '4', label: '4', actionDescription: 'Select English Language and Comprehension.' },
      { key: 'P / Enter', label: 'P / Enter', actionDescription: 'Start Practice for the current topic.' },
      { key: 'S / /', label: 'S or /', actionDescription: 'Focus topic search box.' },
      { key: 'C', label: 'C', actionDescription: 'Clear active search query.' },
      { key: 'Alt + P', label: 'Alt + P', actionDescription: 'Go directly to Voice Practice screen.' },
      { key: 'Alt + D', label: 'Alt + D', actionDescription: 'Return to Dashboard.' },
      { key: 'Escape', label: 'Escape', actionDescription: 'Stop speech.' }
    ],
    spokenVoiceHelp: 'Explore Subjects voice commands: Say "Select Numerical Ability" for Math. Say "Select Reasoning Ability" for Reasoning. Say "Select General Awareness" for GK. Say "Select English" for English. Say "Practice Selected" or "Start Practice" to begin practice. Say "Read Overview" to hear topic counts.',
    spokenKeyboardHelp: 'Explore Subjects keyboard shortcuts: Press 1 for Math, 2 for Reasoning, 3 for General Awareness, 4 for English. Press P or Enter to start practice on the chosen topic. Press S or Slash to focus search box. Press C to clear search. Press Escape to stop speech.'
  },

  voice_practice: {
    screenId: 'voice_practice',
    title: 'Voice-First Practice Session',
    introPrompt: 'Welcome to Voice-First Practice Session. Would you like help with Voice Commands or Keyboard Shortcuts? Press V for voice commands, press K for keyboard shortcuts, or press S to skip.',
    voiceCommands: [
      { command: 'Option A / B / C / D', description: 'Submits your answer option hands-free and evaluates correctness.' },
      { command: 'Repeat Question', description: 'Re-reads the question prompt aloud without advancing.' },
      { command: 'Repeat Options', description: 'Re-reads all 4 answer choices clearly.' },
      { command: 'Next Question / Continue', description: 'Advances to the next practice question.' },
      { command: 'Select Subject [Name]', description: 'Switches question pool between Math, Reasoning, GA, and English.' },
      { command: 'Read Explanation', description: 'Reads step-by-step mathematical or reasoning solution.' },
      { command: 'Pause / Resume', description: 'Pauses or resumes audio narration.' },
      { command: 'Stop / Quiet', description: 'Stops speech and reactivates listening beacon.' }
    ],
    keyboardShortcuts: [
      { key: '1 / A', label: '1 or A', actionDescription: 'Select Option A and announce "You selected option A."' },
      { key: '2 / B', label: '2 or B', actionDescription: 'Select Option B and announce "You selected option B."' },
      { key: '3 / C', label: '3 or C', actionDescription: 'Select Option C and announce "You selected option C."' },
      { key: '4 / D', label: '4 or D', actionDescription: 'Select Option D and announce "You selected option D."' },
      { key: 'R', label: 'R', actionDescription: 'Repeat ONLY the current question text — no prefix, no question number, no options.' },
      { key: 'O', label: 'O', actionDescription: 'Repeat ONLY all four answer options — no intro phrase.' },
      { key: 'Space', label: 'Space', actionDescription: 'Read the full question with prefix and all options (auto-read mode).' },
      { key: 'N / Enter', label: 'N / Enter', actionDescription: 'Proceed to next question after answering.' },
      { key: 'P / LeftArrow', label: 'P or Left Arrow', actionDescription: 'Navigate to previous question.' },
      { key: 'E', label: 'E', actionDescription: 'Read step-by-step explanation for the last answer.' },
      { key: 'J', label: 'J', actionDescription: 'Return to subject selection screen (Jump to subjects).' },
      { key: 'Escape', label: 'Escape', actionDescription: 'Stop speech immediately.' }
    ],
    spokenVoiceHelp: 'Voice Practice voice commands: Say "Option A", "Option B", "Option C", or "Option D" to answer. Say "Repeat Question" to hear only the question text. Say "Repeat Options" to hear only the answer choices. Say "Next Question" to proceed. Say "Read Explanation" for detailed solution. Say "Stop" to silence audio.',
    spokenKeyboardHelp: 'Voice Practice keyboard shortcuts: Press 1 or A for Option A, 2 or B for Option B, 3 or C for Option C, 4 or D for Option D. Press R to repeat only the question text. Press O to repeat only the options. Press Space to read the full question. Press N or Enter for next question. Press P or Left Arrow for previous question. Press J to change subject. Press Escape to stop audio.'
  },

  mock_exam: {
    screenId: 'mock_exam',
    title: 'Accessible Mock Examination',
    introPrompt: 'Welcome to Accessible Mock Examination. Would you like help with Voice Commands or Keyboard Shortcuts? Press V for voice commands, press K for keyboard shortcuts, or press S to skip.',
    voiceCommands: [
      { command: 'Start Exam / Begin Test', description: 'Starts the official timed CBT test and loads Question 1.' },
      { command: 'Option A / B / C / D', description: 'Records your response for the active question.' },
      { command: 'Next / Previous', description: 'Navigates forward or backward through test questions.' },
      { command: 'Mark for Review', description: 'Flags active question in palette to recheck before submission.' },
      { command: 'Clear Response', description: 'Clears your recorded answer for current question.' },
      { command: 'Repeat Question & Options', description: 'Re-reads current question and all four options aloud.' },
      { command: 'Time Remaining', description: 'Announces remaining minutes and compensatory time.' },
      { command: 'Submit Examination', description: 'Finalizes test submission and generates scorecard.' }
    ],
    keyboardShortcuts: [
      { key: '1 / A', label: '1 or A', actionDescription: 'Select Option A and announce "You selected option A."' },
      { key: '2 / B', label: '2 or B', actionDescription: 'Select Option B and announce "You selected option B."' },
      { key: '3 / C', label: '3 or C', actionDescription: 'Select Option C and announce "You selected option C."' },
      { key: '4 / D', label: '4 or D', actionDescription: 'Select Option D and announce "You selected option D."' },
      { key: 'R', label: 'R', actionDescription: 'Repeat ONLY the current question text — no prefix, no question number, no options.' },
      { key: 'O', label: 'O', actionDescription: 'Repeat ONLY all four answer options — no intro phrase.' },
      { key: 'Space', label: 'Space', actionDescription: 'Read the full question with prefix and options (auto-read mode).' },
      { key: 'N / Enter', label: 'N or Enter', actionDescription: 'Save response and proceed to Next question.' },
      { key: 'P / LeftArrow', label: 'P or Left Arrow', actionDescription: 'Navigate to Previous question.' },
      { key: 'M', label: 'M', actionDescription: 'Mark or unmark question for Review.' },
      { key: 'Alt + Shift + X', label: 'Alt + Shift + X', actionDescription: 'Request accessible exit confirmation to submit answers and leave the examination.' },
      { key: 'Y', label: 'Y', actionDescription: 'Confirm submit & exit when exit confirmation is displayed.' },
      { key: 'N', label: 'N', actionDescription: 'Cancel exit and continue taking the examination.' },
      { key: 'T', label: 'T', actionDescription: 'Check remaining examination time.' },
      { key: 'S', label: 'S', actionDescription: 'Submit examination.' },
      { key: 'Escape', label: 'Escape', actionDescription: 'Halt ongoing speech immediately.' }
    ],
    spokenVoiceHelp: 'Mock Exam voice commands: Say "Start Exam" to begin. Say "Option A", "Option B", "Option C", or "Option D" to answer. Say "Repeat Question" to hear only the question text. Say "Repeat Options" to hear only the options. Say "Next" or "Previous" to navigate. Say "Time Remaining" for timer status. Say "Submit Examination" to finish.',
    spokenKeyboardHelp: 'Mock Exam keyboard shortcuts: Press 1 to 4 or A to D to choose answer. Press R to repeat only the question text. Press O to repeat only the options. Press Space to read the full question. Press Enter or N for next question. Press P or Left Arrow for previous question. Press M to mark review. Press T for time remaining. Press S to submit exam. Press Escape to stop speech.'
  },

  results: {
    screenId: 'results',
    title: 'Results & Answer Explanations',
    introPrompt: 'Welcome to Examination Results. Would you like help with Voice Commands or Keyboard Shortcuts? Press V for voice commands, press K for keyboard shortcuts, or press S to skip.',
    voiceCommands: [
      { command: 'Read Score / Summary', description: 'Announces overall score, accuracy percentage, and Session I & II pass status.' },
      { command: 'Review Answers / Explanations', description: 'Opens question-by-question review with official answer keys.' },
      { command: 'Practice Again / Retake', description: 'Launches a new practice session focusing on incorrect answers.' },
      { command: 'Dashboard / Return Overview', description: 'Returns to student dashboard.' }
    ],
    keyboardShortcuts: [
      { key: 'R', label: 'R', actionDescription: 'Review questions and detailed academic explanations.' },
      { key: 'Alt + P', label: 'Alt + P', actionDescription: 'Voice Practice — Retake practice on missed topics (Screen 6).' },
      { key: 'Alt + D', label: 'Alt + D', actionDescription: 'Candidate Dashboard — Return to Dashboard (Screen 4).' },
      { key: 'E', label: 'E', actionDescription: 'Download Scorecard PDF / Report.' },
      { key: 'Escape', label: 'Escape', actionDescription: 'Stop speech immediately.' }
    ],
    spokenVoiceHelp: 'Results voice commands: Say "Read Score" for total marks and percentile. Say "Review Answers" to hear explanations for missed questions. Say "Practice Again" to retake missed topics. Say "Dashboard" to return home.',
    spokenKeyboardHelp: 'Results keyboard shortcuts: Press R to review answer explanations. Press Alt and P to practice missed topics in Voice Practice. Press Alt and D to return to Dashboard. Press E to export score report. Press Escape to stop speech.'
  },

  ai_tutor: {
    screenId: 'ai_tutor',
    title: 'AI Tutor Scribe',
    introPrompt: 'Welcome to AI Tutor Scribe. Would you like help with Voice Commands or Keyboard Shortcuts? Press V for voice commands, press K for keyboard shortcuts, or press S to skip.',
    voiceCommands: [
      { command: 'Speak query directly into mic', description: 'Asks any question about SSC MTS concepts, shortcuts, or formulas.' },
      { command: 'Repeat / Read Again', description: 'Re-reads the latest tutor explanation aloud.' },
      { command: 'Read Slower', description: 'Slows down tutor speech pace for clear comprehension.' },
      { command: 'Pause Reading / Resume Reading', description: 'Pauses or resumes tutor speech output.' },
      { command: 'Stop / Quiet', description: 'Halts speech and reactivates listening for candidate questions.' },
      { command: 'Select Subject Math / Reasoning / GK / English', description: 'Switches the tutor subject context.' }
    ],
    keyboardShortcuts: [
      { key: 'Enter', label: 'Enter', actionDescription: 'Submit query to AI Tutor.' },
      { key: 'C', label: 'C', actionDescription: 'Clear chat input box.' },
      { key: 'R', label: 'R', actionDescription: 'Repeat last AI tutor explanation.' },
      { key: 'Alt + D', label: 'Alt + D', actionDescription: 'Candidate Dashboard — Return to Dashboard (Screen 4).' },
      { key: 'Alt + P', label: 'Alt + P', actionDescription: 'Voice Practice — Open Voice Practice (Screen 6).' },
      { key: 'Escape', label: 'Escape', actionDescription: 'Halt tutor speech immediately.' }
    ],
    spokenVoiceHelp: 'AI Tutor voice commands: Speak any doubt directly into your microphone. Say "Repeat" or "Read Again" to replay the last explanation. Say "Read Slower" to reduce speech rate. Say "Pause Reading" or "Resume Reading" to control audio. Say "Stop" to silence tutor.',
    spokenKeyboardHelp: 'AI Tutor keyboard shortcuts: Press Enter to send query. Press C to clear input. Press R to repeat explanation. Press Alt and D to return to Dashboard. Press Alt and P to open Voice Practice. Press Escape to stop audio.'
  },

  revision_planner: {
    screenId: 'revision_planner',
    title: 'Adaptive Revision Planner',
    introPrompt: 'Welcome to Adaptive Revision Planner. Would you like help with Voice Commands or Keyboard Shortcuts? Press V for voice commands, press K for keyboard shortcuts, or press S to skip.',
    voiceCommands: [
      { command: 'Reveal Answer / Flip Card', description: 'Shows the verified formula, rule, and correct answer.' },
      { command: 'Rate: Again / Hard / Good / Easy', description: 'Records your retention rating using SuperMemo SM-2 algorithm.' },
      { command: 'Read Question / Repeat Question', description: 'Re-reads active flashcard question aloud.' },
      { command: 'Read Answer', description: 'Reads answer explanation aloud.' },
      { command: 'Next Card', description: 'Advances to next due flashcard.' },
      { command: 'Pause Revision / Resume', description: 'Pauses or resumes flashcard drill session.' }
    ],
    keyboardShortcuts: [
      { key: 'Space', label: 'Space', actionDescription: 'Flip card and reveal verified answer.' },
      { key: '1', label: '1', actionDescription: 'Rate: Again (1 day interval).' },
      { key: '2', label: '2', actionDescription: 'Rate: Hard (2 days interval).' },
      { key: '3', label: '3', actionDescription: 'Rate: Good (4 days interval).' },
      { key: '4', label: '4', actionDescription: 'Rate: Easy (7 days interval).' },
      { key: 'Q', label: 'Q', actionDescription: 'Read flashcard question aloud.' },
      { key: 'A', label: 'A', actionDescription: 'Read flashcard answer aloud.' },
      { key: 'Alt + D', label: 'Alt + D', actionDescription: 'Candidate Dashboard — Return to Dashboard (Screen 4).' },
      { key: 'Escape', label: 'Escape', actionDescription: 'Stop speech immediately.' }
    ],
    spokenVoiceHelp: 'Revision Planner voice commands: Say "Reveal Answer" to flip the card. Rate your retention by saying "Again", "Hard", "Good", or "Easy". Say "Read Question" to hear question. Say "Read Answer" to hear answer. Say "Next Card" to advance.',
    spokenKeyboardHelp: 'Revision Planner keyboard shortcuts: Press Space to flip card and reveal answer. Press 1 for Again, 2 for Hard, 3 for Good, 4 for Easy. Press Q to read question. Press A to read answer. Press Alt and D to return to Dashboard. Press Escape to stop speech.'
  },

  progress: {
    screenId: 'progress',
    title: 'Progress Analytics',
    introPrompt: 'Welcome to Progress Analytics. Would you like help with Voice Commands or Keyboard Shortcuts? Press V for voice commands, press K for keyboard shortcuts, or press S to skip.',
    voiceCommands: [
      { command: 'Refresh Analytics / Reload', description: 'Recomputes Readiness Index, BKT mastery, and accuracy metrics.' },
      { command: 'Filter 7 Days / 30 Days / All Time', description: 'Filters performance trend timeline.' },
      { command: 'Filter Subject [Name]', description: 'Inspects subject-specific speed and accuracy.' },
      { command: 'Export Report / Download', description: 'Exports accessible performance audit report.' },
      { command: 'Start Practice Weak Area', description: 'Opens Voice Practice targeting lowest-mastery topic.' }
    ],
    keyboardShortcuts: [
      { key: 'R', label: 'R', actionDescription: 'Refresh analytics and mastery data.' },
      { key: '1', label: '1', actionDescription: 'Filter All Time.' },
      { key: '2', label: '2', actionDescription: 'Filter Last 30 Days.' },
      { key: '3', label: '3', actionDescription: 'Filter Last 7 Days.' },
      { key: 'E / P', label: 'E or P', actionDescription: 'Export or print performance report.' },
      { key: 'Alt + P', label: 'Alt + P', actionDescription: 'Start practice on weak topics.' },
      { key: 'Alt + D', label: 'Alt + D', actionDescription: 'Return to Dashboard.' },
      { key: 'Escape', label: 'Escape', actionDescription: 'Stop speech.' }
    ],
    spokenVoiceHelp: 'Progress Analytics voice commands: Say "Refresh Analytics" to update metrics. Say "Filter 7 Days", "Filter 30 Days", or "All Time" to change timeline. Say "Export Report" to download performance summary. Say "Start Practice Weak Area" for targeted drill.',
    spokenKeyboardHelp: 'Progress Analytics keyboard shortcuts: Press R to refresh analytics data. Press 1 for All Time, 2 for 30 Days, 3 for 7 Days. Press E or P to export or print report. Press Alt + P to practice weak topics. Press Escape to stop speech.'
  },

  learning_history: {
    screenId: 'learning_history',
    title: 'Candidate Transcript Workspace',
    introPrompt: 'Welcome to Candidate Transcript Workspace. Would you like help with Voice Commands or Keyboard Shortcuts? Press V for voice commands, press K for keyboard shortcuts, or press S to skip.',
    voiceCommands: [
      { command: 'Start Recording / Begin Recording', description: 'Activates microphone and transcribes spoken speech in real time.' },
      { command: 'Stop Recording / Finish', description: 'Halts microphone capture and saves transcribed text.' },
      { command: 'Copy / Copy Transcript / Copy Text', description: 'Copies active transcript text to system clipboard.' },
      { command: 'Read Transcript / Read Aloud', description: 'Reads your transcribed text aloud.' },
      { command: 'Save Transcript', description: 'Saves the current note to your candidate account.' },
      { command: 'Clear Workspace / Clear Text', description: 'Empties editor for a new dictation.' },
      { command: 'Pause Recording / Resume Recording', description: 'Pauses or resumes real-time dictation.' }
    ],
    keyboardShortcuts: [
      { key: 'R', label: 'R', actionDescription: 'Start live dictation recording.' },
      { key: 'S', label: 'S', actionDescription: 'Stop dictation recording.' },
      { key: 'Ctrl + C', label: 'Ctrl + C', actionDescription: 'Copy full transcript text to clipboard.' },
      { key: 'D', label: 'D', actionDescription: 'Download transcript as text file.' },
      { key: 'L', label: 'L', actionDescription: 'Read transcript text aloud.' },
      { key: 'X', label: 'X', actionDescription: 'Clear transcript workspace.' },
      { key: 'P', label: 'P', actionDescription: 'Pause or resume dictation.' },
      { key: 'Escape', label: 'Escape', actionDescription: 'Halt ongoing speech.' }
    ],
    spokenVoiceHelp: 'Transcript Workspace voice commands: Say "Start Recording" to begin dictation. Say "Stop Recording" when finished. Say "Copy" or "Copy Transcript" to copy text to clipboard. Say "Read Transcript" to hear your notes. Say "Clear Workspace" to erase text.',
    spokenKeyboardHelp: 'Transcript Workspace keyboard shortcuts: Press R to start recording. Press S to stop recording. Press Control C to copy transcript to clipboard. Press D to download text file. Press L to read transcript aloud. Press X to clear text. Press Escape to stop speech.'
  },

  topic_mastery: {
    screenId: 'topic_mastery',
    title: 'Knowledge & Topic Mastery',
    introPrompt: 'Welcome to Knowledge and Topic Mastery. Would you like help with Voice Commands or Keyboard Shortcuts? Press V for voice commands, press K for keyboard shortcuts, or press S to skip.',
    voiceCommands: [
      { command: 'Review Weakest Topic', description: 'Identifies topics with lowest mastery probability and opens targeted drill.' },
      { command: 'Start Targeted Practice', description: 'Opens Voice Practice for selected topic.' },
      { command: 'Read Mastery Status', description: 'Reads latent knowledge probabilities across all 18 syllabus topics.' }
    ],
    keyboardShortcuts: [
      { key: '1-4', label: '1 to 4', actionDescription: 'Switch between syllabus subject tabs.' },
      { key: 'P / Enter', label: 'P / Enter', actionDescription: 'Practice lowest mastery topic.' },
      { key: 'R', label: 'R', actionDescription: 'Refresh mastery statistics.' },
      { key: 'Alt + D', label: 'Alt + D', actionDescription: 'Return to Dashboard.' },
      { key: 'Escape', label: 'Escape', actionDescription: 'Stop speech.' }
    ],
    spokenVoiceHelp: 'Topic Mastery voice commands: Say "Review Weakest Topic" for weak areas. Say "Start Targeted Practice" to practice low mastery topics. Say "Read Mastery Status" to hear probabilities.',
    spokenKeyboardHelp: 'Topic Mastery keyboard shortcuts: Press 1 to 4 to filter subjects. Press P or Enter to practice lowest mastery topic. Press R to refresh. Press Escape to stop speech.'
  },

  accessibility_settings: {
    screenId: 'accessibility_settings',
    title: 'Accessibility Settings',
    introPrompt: 'Welcome to Accessibility Settings. Would you like help with Voice Commands or Keyboard Shortcuts? Press V for voice commands, press K for keyboard shortcuts, or press S to skip.',
    voiceCommands: [
      { command: 'High Contrast Mode / Yellow on Black', description: 'Applies WCAG AAA compliant high-contrast theme preset.' },
      { command: 'Increase Font / Decrease Font', description: 'Adjusts global font scale up to 200%.' },
      { command: 'Enable Dyslexia Font / Disable Dyslexia Font', description: 'Toggles OpenDyslexic readable typography.' },
      { command: 'Reduce Motion / High Contrast Borders', description: 'Toggles animation suppression and bold structural borders.' },
      { command: 'Save Settings', description: 'Persists accessibility preferences to profile.' }
    ],
    keyboardShortcuts: [
      { key: '1-5', label: '1 to 5', actionDescription: 'Select theme presets: Sapphire, High Contrast, Amber Dark, Emerald, Soft Cream.' },
      { key: '+ / =', label: '+ or =', actionDescription: 'Increase text font scale.' },
      { key: '-', label: '-', actionDescription: 'Decrease text font scale.' },
      { key: 'D', label: 'D', actionDescription: 'Toggle Dyslexia font.' },
      { key: 'M', label: 'M', actionDescription: 'Toggle Reduce Motion.' },
      { key: 'S', label: 'S', actionDescription: 'Save accessibility settings.' },
      { key: 'Escape', label: 'Escape', actionDescription: 'Stop speech.' }
    ],
    spokenVoiceHelp: 'Accessibility Settings voice commands: Say "High Contrast Mode" for black and yellow theme. Say "Increase Font" or "Decrease Font" to resize text. Say "Enable Dyslexia Font" for accessible font. Say "Reduce Motion" to disable animations. Say "Save Settings" to save.',
    spokenKeyboardHelp: 'Accessibility Settings keyboard shortcuts: Press 1 to 5 to switch themes. Press Plus or Equals to enlarge font. Press Minus to reduce font. Press D for dyslexia font. Press M for reduce motion. Press S to save. Press Escape to stop speech.'
  },

  screen_reader_settings: {
    screenId: 'screen_reader_settings',
    title: 'Screen Reader Settings',
    introPrompt: 'Welcome to Screen Reader Settings. Would you like help with Voice Commands or Keyboard Shortcuts? Press V for voice commands, press K for keyboard shortcuts, or press S to skip.',
    voiceCommands: [
      { command: 'Faster Speech / Slower Speech', description: 'Adjusts text-to-speech reading rate.' },
      { command: 'Higher Pitch / Lower Pitch', description: 'Adjusts speech voice frequency.' },
      { command: 'Test Voice / Preview Speech', description: 'Plays candidate speech sample.' },
      { command: 'Enable Auto Read Aloud / Disable Auto Read Aloud', description: 'Toggles automatic question narration.' },
      { command: 'Save Preferences', description: 'Saves speech synthesizer configuration.' }
    ],
    keyboardShortcuts: [
      { key: '+ / =', label: '+ or =', actionDescription: 'Increase speech rate.' },
      { key: '-', label: '-', actionDescription: 'Decrease speech rate.' },
      { key: 'P', label: 'P', actionDescription: 'Toggle voice pitch.' },
      { key: 'T', label: 'T', actionDescription: 'Test speech output.' },
      { key: 'A', label: 'A', actionDescription: 'Toggle Auto Read Aloud.' },
      { key: 'S', label: 'S', actionDescription: 'Save screen reader settings.' },
      { key: 'Escape', label: 'Escape', actionDescription: 'Stop speech.' }
    ],
    spokenVoiceHelp: 'Screen Reader Settings voice commands: Say "Faster Speech" or "Slower Speech" to adjust reading speed. Say "Higher Pitch" or "Lower Pitch" for voice tone. Say "Test Voice" to hear sample. Say "Save Preferences" to store.',
    spokenKeyboardHelp: 'Screen Reader Settings keyboard shortcuts: Press Plus to increase speed, Minus to decrease. Press P to adjust pitch. Press T to test voice. Press A to toggle auto-reading. Press S to save settings. Press Escape to stop speech.'
  },

  pilot_demo: {
    screenId: 'pilot_demo',
    title: 'Pilot Demo Diagnostic',
    introPrompt: 'Welcome to Pilot Demo Diagnostic. Would you like help with Voice Commands or Keyboard Shortcuts? Press V for voice commands, press K for keyboard shortcuts, or press S to skip.',
    voiceCommands: [
      { command: 'Start Pilot Demo / Begin Diagnostic', description: 'Starts the multi-sensory accessible diagnostic session.' },
      { command: 'Option A / B / C / D', description: 'Records your response for diagnostic questions.' },
      { command: 'Next Question / Repeat Question', description: 'Navigates or replays diagnostic item.' },
      { command: 'Read Instructions', description: 'Announces complete diagnostic objectives.' }
    ],
    keyboardShortcuts: [
      { key: 'Enter', label: 'Enter', actionDescription: 'On Instructions screen: Request to start the Pilot Demo Diagnostic examination.' },
      { key: 'Y', label: 'Y', actionDescription: 'Confirm start when prompted (Yes in start confirmation dialog).' },
      { key: 'N / Escape', label: 'N or Escape', actionDescription: 'Cancel start confirmation or stop speech.' },
      { key: '1 / A', label: '1 or A', actionDescription: 'Select Option A during diagnostic.' },
      { key: '2 / B', label: '2 or B', actionDescription: 'Select Option B during diagnostic.' },
      { key: '3 / C', label: '3 or C', actionDescription: 'Select Option C during diagnostic.' },
      { key: '4 / D', label: '4 or D', actionDescription: 'Select Option D during diagnostic.' },
      { key: 'R', label: 'R', actionDescription: 'Repeat ONLY the current question text — no prefix, no question number, no options.' },
      { key: 'O', label: 'O', actionDescription: 'Repeat ONLY all four answer options — no intro phrase.' },
      { key: 'Space', label: 'Space', actionDescription: 'Read the full question with prefix and all options.' },
      { key: 'M', label: 'M', actionDescription: 'Mark or unmark question for Review.' },
      { key: 'Alt + Shift + X', label: 'Alt + Shift + X', actionDescription: 'Request accessible exit confirmation to submit answers and leave the diagnostic examination.' },
      { key: 'ArrowRight / Enter', label: 'Right Arrow or Enter', actionDescription: 'Go to next question.' },
      { key: 'ArrowLeft', label: 'Left Arrow', actionDescription: 'Go to previous question.' }
    ],
    spokenVoiceHelp: 'Pilot Demo voice commands: Say "Start Pilot Demo" to begin. Say "Option A", "Option B", "Option C", or "Option D" to answer. Say "Repeat Question" to hear only the question text. Say "Repeat Options" to hear only the answer options. Say "Next Question" to proceed. Say "Submit Examination" to finish.',
    spokenKeyboardHelp: 'Pilot Demo keyboard shortcuts: On the Instructions screen, press Enter to begin the diagnostic. Press Y to confirm start, N or Escape to cancel. During the exam, press 1 to 4 or A to D to answer. Press R to repeat only the question text. Press O to repeat only the options. Press Space to read the full question. Press M to mark review. Press Right Arrow or Enter for next question. Press Left Arrow for previous question. Press Escape to stop speech.'
  },

  model_evaluation: {
    screenId: 'model_evaluation',
    title: 'Dataset & Model Evaluation Dashboard',
    introPrompt: 'Welcome to Model Evaluation Dashboard. Would you like help with Voice Commands or Keyboard Shortcuts? Press V for voice commands, press K for keyboard shortcuts, or press S to skip.',
    voiceCommands: [
      { command: 'Run Evaluation / Benchmark', description: 'Executes benchmark validation against test datasets.' },
      { command: 'Read Accuracy / WER', description: 'Announces Word Error Rate and inference latency.' },
      { command: 'Dashboard', description: 'Returns to dashboard.' }
    ],
    keyboardShortcuts: [
      { key: 'E', label: 'E', actionDescription: 'Run evaluation benchmark.' },
      { key: 'R', label: 'R', actionDescription: 'Refresh evaluation metrics.' },
      { key: 'Alt + D', label: 'Alt + D', actionDescription: 'Return to Dashboard.' },
      { key: 'Escape', label: 'Escape', actionDescription: 'Stop speech.' }
    ],
    spokenVoiceHelp: 'Model Evaluation voice commands: Say "Run Evaluation" to benchmark models. Say "Read Accuracy" to check WER and latency. Say "Dashboard" to return.',
    spokenKeyboardHelp: 'Model Evaluation keyboard shortcuts: Press E to run evaluation benchmark. Press R to refresh metrics. Press Alt + D to return to Dashboard. Press Escape to stop speech.'
  },

  model_training: {
    screenId: 'model_training',
    title: 'Dataset Management & Model Training',
    introPrompt: 'Welcome to Dataset Management and Model Training. Would you like help with Voice Commands or Keyboard Shortcuts? Press V for voice commands, press K for keyboard shortcuts, or press S to skip.',
    voiceCommands: [
      { command: 'Start Training / Fine Tune', description: 'Triggers model fine-tuning job.' },
      { command: 'Refresh Datasets / Status', description: 'Checks corpus records and training checkpoint.' },
      { command: 'Dashboard', description: 'Returns to dashboard.' }
    ],
    keyboardShortcuts: [
      { key: 'T', label: 'T', actionDescription: 'Start training pipeline.' },
      { key: 'R', label: 'R', actionDescription: 'Refresh training status.' },
      { key: 'Alt + D', label: 'Alt + D', actionDescription: 'Return to Dashboard.' },
      { key: 'Escape', label: 'Escape', actionDescription: 'Stop speech.' }
    ],
    spokenVoiceHelp: 'Model Training voice commands: Say "Start Training" to start pipeline. Say "Refresh Datasets" to inspect status. Say "Dashboard" to return home.',
    spokenKeyboardHelp: 'Model Training keyboard shortcuts: Press T to start training pipeline. Press R to refresh status. Press Alt + D to return to Dashboard. Press Escape to stop speech.'
  }
};

/**
 * Helper to fetch page help record by screen id with fallback
 */
export function getPageHelp(screenId: string): PageHelpRecord {
  const norm = screenId.replace(/-/g, '_').toLowerCase();
  if (PAGE_HELP_REGISTRY[norm]) {
    return PAGE_HELP_REGISTRY[norm];
  }
  return {
    screenId,
    title: screenId.replace(/_/g, ' '),
    introPrompt: `Welcome to ${screenId.replace(/_/g, ' ')}. Would you like help with Voice Commands or Keyboard Shortcuts? Press V for voice commands, press K for keyboard shortcuts, or press S to skip.`,
    voiceCommands: [
      { command: 'Stop / Quiet', description: 'Silences speech synthesis.' },
      { command: 'Dashboard', description: 'Navigates to main overview dashboard.' }
    ],
    keyboardShortcuts: [
      { key: 'Alt + D', label: 'Alt + D', actionDescription: 'Return to Dashboard.' },
      { key: 'Alt + /', label: 'Alt + /', actionDescription: 'Show all keyboard shortcuts.' },
      { key: 'Escape', label: 'Escape', actionDescription: 'Halt speech.' }
    ],
    spokenVoiceHelp: `Voice commands for ${screenId.replace(/_/g, ' ')}: Say Stop to silence audio, or say Dashboard to return home.`,
    spokenKeyboardHelp: `Keyboard shortcuts for ${screenId.replace(/_/g, ' ')}: Press Alt D for Dashboard, Alt Slash for shortcuts reference, or Escape to stop audio.`
  };
}
