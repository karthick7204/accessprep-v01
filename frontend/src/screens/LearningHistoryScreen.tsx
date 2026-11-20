import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAccessibility } from '../context/AccessibilityContext';
import { AudioToolbar } from '../components/AudioToolbar';
import {
  History,
  Search,
  CheckCircle2,
  XCircle,
  Mic,
  Download,
  ShieldCheck,
  Trash2,
  ToggleLeft,
  ToggleRight,
  List,
  AlertTriangle,
  Play,
  Pause,
  Square,
  Copy,
  Save,
  Volume2,
  VolumeX,
  FileText,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { TranscriptLogEntry, TranscriptPrivacySettings } from '../db/database';

export const TRANSCRIPT_WORKSPACE_VOICE_GUIDE =
  'Welcome to Candidate Transcript Workspace. Everything you say will be transcribed into text in real time. ' +
  'Say "Start Recording" to begin — everything you speak is captured as text until you say "Stop Recording". ' +
  'Say "Copy" or press Control C to copy your transcript to clipboard. ' +
  'Say "Read transcript" to hear your text. ' +
  'Say "Save transcript" to save to your account. ' +
  'Say "Export transcript" to download as a text file. ' +
  'Say "Clear transcript" to erase and start fresh. ' +
  'Say "Help" for voice instructions.';

interface HistoryRecord {
  id: string;
  timestamp: string;
  type: 'Voice Practice' | 'Mock Exam' | 'Pilot Demo' | 'SM-2 Revision' | 'AI Tutor';
  subject: string;
  questionId: string;
  questionText: string;
  candidateAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpentSec: number;
  inputMode: 'Voice' | 'Keyboard / Click';
}

interface LearningHistoryEntry {
  id: string;
  timestamp: string;
  type: string;
  title?: string;
  summary: string;
  score?: number;
  maxScore?: number;
  durationSeconds: number;
  questionId?: string;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso || 'Recent';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 0) return `Today, ${timeStr}`;
  if (diffDays === 1) return `Yesterday, ${timeStr}`;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
}

function mapActivityType(type: string): HistoryRecord['type'] {
  switch (type) {
    case 'mock_exam':
    case 'Mock Exam':
      return 'Mock Exam';
    case 'diagnostic':
    case 'Pilot Demo':
      return 'Pilot Demo';
    case 'revision':
    case 'SM-2 Revision':
      return 'SM-2 Revision';
    case 'ai_tutor':
    case 'AI Tutor':
      return 'AI Tutor';
    case 'practice':
    case 'Voice Practice':
    default:
      return 'Voice Practice';
  }
}

function parseSubjectFromEntry(entry: LearningHistoryEntry): string {
  const text = `${entry.title || ''} ${entry.summary || ''}`.toLowerCase();
  if (text.includes('numerical') || text.includes('math')) return 'Numerical and Mathematical Ability';
  if (text.includes('reasoning')) return 'Reasoning Ability and Problem Solving';
  if (text.includes('general awareness') || text.includes('history') || text.includes('polity')) return 'General Awareness';
  if (text.includes('english') || text.includes('grammar') || text.includes('idiom')) return 'English Language and Comprehension';
  return 'All 4 SSC MTS Sections';
}

function mapEntryToRecord(raw: any): HistoryRecord {
  // Already normalized DetailedRecord
  if (raw && typeof raw.questionId === 'string' && typeof raw.candidateAnswer === 'string') {
    return {
      ...raw,
      timestamp: formatTimestamp(raw.timestamp),
      type: mapActivityType(raw.type)
    };
  }

  const entry = raw as LearningHistoryEntry;
  const summary = String(entry.summary || '');
  const title = String(entry.title || 'Learning Activity');
  const correctMatch = summary.match(/Result:\s*(Correct|Incorrect)/i);
  const selectedMatch = summary.match(/Selected:\s*([A-D])/i);
  const qidMatch = summary.match(/(SSC-MTS-[A-Z0-9-]+)/i) || title.match(/(SSC-MTS-[A-Z0-9-]+)/i);

  const hasScore = typeof entry.score === 'number' && typeof entry.maxScore === 'number' && entry.maxScore > 0;
  const isCorrect = correctMatch
    ? correctMatch[1].toLowerCase() === 'correct'
    : hasScore
    ? (entry.score! / entry.maxScore!) >= 0.5
    : true;

  const candidateAnswer = selectedMatch
    ? `Option ${selectedMatch[1]}`
    : hasScore
    ? `Score: ${entry.score} / ${entry.maxScore}`
    : summary.slice(0, 60) || 'Completed';

  const correctAnswer = correctMatch
    ? isCorrect
      ? selectedMatch
        ? `Option ${selectedMatch[1]}`
        : 'Matched Key'
      : 'Review Explanation'
    : hasScore
    ? `Max: ${entry.maxScore}`
    : 'Completed';

  return {
    id: entry.id,
    timestamp: formatTimestamp(entry.timestamp),
    type: mapActivityType(entry.type),
    subject: parseSubjectFromEntry(entry),
    questionId: entry.questionId || (qidMatch ? qidMatch[1] : title.slice(0, 26)),
    questionText: summary || title,
    candidateAnswer,
    correctAnswer,
    isCorrect,
    timeSpentSec: Number(entry.durationSeconds) || 0,
    inputMode: /voice/i.test(`${entry.type} ${summary} ${title}`) ? 'Voice' : 'Keyboard / Click'
  };
}

export const LearningHistoryScreen: React.FC = () => {
  const {
    user,
    announce,
    speak,
    speakText,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    startVoiceListening,
    registerVoiceHandler,
    playBeacon
  } = useAccessibility();
  const [activeTab, setActiveTab] = useState<'workspace' | 'overview' | 'transcripts' | 'privacy'>('workspace');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Live Dictation / Transcript Workspace state
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused'>('idle');
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [isReadingTranscript, setIsReadingTranscript] = useState<boolean>(false);
  const [isSavingTranscript, setIsSavingTranscript] = useState<boolean>(false);
  const liveTranscriptRef = useRef(liveTranscript);
  liveTranscriptRef.current = liveTranscript;

  const recordingStateRef = useRef(recordingState);
  recordingStateRef.current = recordingState;

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const hasAnnouncedIntroRef = useRef<boolean>(false);

  // Initialize intro state without auto-blasting speech
  useEffect(() => {
    if (!hasAnnouncedIntroRef.current) {
      hasAnnouncedIntroRef.current = true;
    }
  }, []);

  // Transcript state
  const [transcripts, setTranscripts] = useState<TranscriptLogEntry[]>([]);
  const [loadingTranscripts, setLoadingTranscripts] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<TranscriptPrivacySettings>({
    userId: user?.id || 'usr_candidate_01',
    storeTranscripts: true,
    autoDeleteDays: 30,
    allowAnonymousAnalysis: false
  });
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const uid = user?.id || 'usr_candidate_01';

  // Workspace Actions
  const handleStartRecording = useCallback(() => {
    setActiveTab('workspace');
    setRecordingState('recording');
    startVoiceListening();
    playBeacon('listening');
    const msg = 'Live dictation started. Speak into your microphone now. Say "Stop Recording" when done.';
    announce(msg, 'polite');
    speakText(msg);
  }, [startVoiceListening, playBeacon, announce, speakText]);

  const handleStopRecording = useCallback(() => {
    setRecordingState('idle');
    playBeacon('success');
    const text = liveTranscriptRef.current.trim();
    const wordCount = text ? text.split(/\s+/).length : 0;
    const stopMsg = `Recording stopped. ${wordCount} ${wordCount === 1 ? 'word' : 'words'} transcribed. Say "Copy" to copy your text, or "Read transcript" to hear it.`;
    announce(stopMsg, 'polite');
    speakText(stopMsg);
  }, [playBeacon, announce, speakText]);




  const handlePauseRecording = useCallback(() => {
    setRecordingState('paused');
    announce('Live dictation paused.', 'polite');
    speakText('Live dictation paused. Say "Resume Recording" to continue.');
  }, [announce, speakText]);

  const handleResumeRecording = useCallback(() => {
    setRecordingState('recording');
    startVoiceListening();
    playBeacon('listening');
    announce('Live dictation resumed. Continue speaking.', 'polite');
    speakText('Live dictation resumed. Continue speaking.');
  }, [startVoiceListening, playBeacon, announce, speakText]);

  const handleSaveTranscript = useCallback(async () => {
    const text = liveTranscriptRef.current.trim();
    if (!text) {
      announce('Cannot save an empty transcript. Please speak or enter text first.', 'assertive');
      return;
    }
    setIsSavingTranscript(true);
    try {
      const res = await fetch('/api/transcripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: uid,
          screenId: 'learning_history',
          transcript: text,
          confidence: 0.95,
          status: 'recognized',
          intent: 'dictation_workspace'
        })
      });
      if (res.ok) {
        playBeacon('success');
        announce('Transcript saved successfully to candidate history.', 'polite');
        fetch(`/api/transcripts?userId=${uid}`)
          .then((r) => r.json())
          .then((data) => {
            if (data?.transcripts) setTranscripts(data.transcripts);
          })
          .catch(() => {});
      } else {
        throw new Error('Save failed');
      }
    } catch {
      announce('Failed to save transcript. Please try again.', 'assertive');
    } finally {
      setIsSavingTranscript(false);
    }
  }, [uid, announce, playBeacon]);

  const handleCopyTranscript = useCallback(async () => {
    const text = liveTranscriptRef.current.trim();
    if (!text) {
      announce('No transcript text to copy.', 'assertive');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      announce('Transcript copied to clipboard.', 'polite');
      playBeacon('success');
    } catch {
      announce('Failed to copy transcript to clipboard.', 'assertive');
    }
  }, [announce, playBeacon]);

  const handleExportTXT = useCallback(() => {
    const text = liveTranscriptRef.current.trim();
    if (!text) {
      announce('Cannot export an empty transcript.', 'assertive');
      return;
    }
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SSC_MTS_Transcript_${user?.rollNumber || uid}_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    announce('Transcript downloaded as text file.', 'polite');
  }, [announce, user?.rollNumber, uid]);

  const handleReadAloud = useCallback(() => {
    const text = liveTranscriptRef.current.trim();
    if (!text) {
      announce('No transcript text to read.', 'assertive');
      return;
    }
    setIsReadingTranscript(true);
    speakText(text, () => {
      setIsReadingTranscript(false);
    });
  }, [announce, speakText]);

  const handlePauseReading = useCallback(() => {
    pauseSpeaking();
    announce('Audio reading paused.', 'polite');
  }, [pauseSpeaking, announce]);

  const handleResumeReading = useCallback(() => {
    resumeSpeaking();
    announce('Audio reading resumed.', 'polite');
  }, [resumeSpeaking, announce]);

  const handleStopReading = useCallback(() => {
    stopSpeaking();
    setIsReadingTranscript(false);
    announce('Audio reading stopped.', 'polite');
  }, [stopSpeaking, announce]);

  const handleClearLiveTranscript = useCallback(() => {
    setLiveTranscript('');
    announce('Live transcript cleared.', 'polite');
  }, [announce]);

  // Ctrl+C keyboard shortcut to copy transcript
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
        const activeEl = document.activeElement;
        const isInTextField = activeEl?.tagName === 'TEXTAREA' || activeEl?.tagName === 'INPUT';
        if (isInTextField) {
          const input = activeEl as HTMLInputElement | HTMLTextAreaElement;
          // If candidate selected specific text, let native browser copy handle that selection
          if (input.selectionStart !== input.selectionEnd) {
            return;
          }
        }
        e.preventDefault();
        handleCopyTranscript();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCopyTranscript]);

  // Contextual Screen Voice Handler
  useEffect(() => {
    const unregister = registerVoiceHandler((rawTranscript: string) => {
      const clean = rawTranscript.toLowerCase().trim();

      // CRITICAL: When recording mode is active, transcribe ALL spoken words until "Stop Recording"
      if (recordingStateRef.current === 'recording') {
        const isStop =
          clean === 'stop recording' ||
          clean === 'stop' ||
          clean === 'stop dictation' ||
          clean === 'finish recording' ||
          clean === 'finish dictation' ||
          clean === 'end recording' ||
          clean === 'done recording' ||
          clean === 'halt recording' ||
          clean === 'vision stop recording' ||
          clean === 'hey vision stop recording';

        if (isStop) {
          handleStopRecording();
          return true;
        }

        if (clean === 'pause recording' || clean === 'pause dictation') {
          handlePauseRecording();
          return true;
        }

        // Transcribe everything spoken into the live editor
        setLiveTranscript((prev) => (prev ? `${prev} ${rawTranscript}` : rawTranscript));
        return true;
      }

      // Voice commands when not actively recording
      if (clean === 'start recording' || clean === 'start dictation' || clean === 'start recording transcript' || clean === 'begin recording') {
        handleStartRecording();
        return true;
      }
      if (clean === 'stop recording' || clean === 'stop dictation' || clean === 'finish dictation') {
        handleStopRecording();
        return true;
      }
      if (clean === 'pause recording' || clean === 'pause dictation') {
        handlePauseRecording();
        return true;
      }
      if (clean === 'resume recording' || clean === 'resume dictation') {
        handleResumeRecording();
        return true;
      }
      if (clean === 'save transcript' || clean === 'save text' || clean === 'save note') {
        handleSaveTranscript();
        return true;
      }
      if (clean === 'copy' || clean === 'copy transcript' || clean === 'copy text' || clean === 'copy that' || clean === 'copy notes' || clean === 'copy all' || clean === 'copy to clipboard' || clean === 'copy transcript to clipboard') {
        handleCopyTranscript();
        return true;
      }
      if (clean === 'export transcript' || clean === 'download transcript' || clean === 'download text') {
        handleExportTXT();
        return true;
      }
      if (clean === 'read transcript' || clean === 'read text' || clean === 'read aloud' || clean === 'repeat transcript') {
        handleReadAloud();
        return true;
      }
      if (clean === 'pause reading' || clean === 'pause audio') {
        handlePauseReading();
        return true;
      }
      if (clean === 'resume reading' || clean === 'resume audio') {
        handleResumeReading();
        return true;
      }
      if (clean === 'stop reading' || clean === 'stop speaking' || clean === 'stop audio') {
        handleStopReading();
        return true;
      }
      if (clean === 'clear transcript' || clean === 'clear text') {
        handleClearLiveTranscript();
        return true;
      }
      if (
        clean === 'read voice commands' ||
        clean === 'explain page' ||
        clean === 'voice guide' ||
        clean === 'help' ||
        clean === 'voice commands'
      ) {
        announce(TRANSCRIPT_WORKSPACE_VOICE_GUIDE, 'polite');
        speakText(TRANSCRIPT_WORKSPACE_VOICE_GUIDE);
        return true;
      }

      // Tab navigation commands
      if (clean === 'open workspace' || clean === 'dictation workspace' || clean === 'live recording') {
        setActiveTab('workspace');
        speakText('Switched to Live Recording and Transcript Workspace.');
        return true;
      }
      if (clean === 'open audit log' || clean === 'open overview' || clean === 'show history') {
        setActiveTab('overview');
        speakText('Switched to Overview and Audit Log.');
        return true;
      }
      if (clean === 'open transcripts log' || clean === 'show transcripts' || clean === 'voice recognition log') {
        setActiveTab('transcripts');
        speakText('Switched to Voice Recognition Log.');
        return true;
      }
      if (clean === 'open privacy settings' || clean === 'show privacy') {
        setActiveTab('privacy');
        speakText('Switched to Privacy and Deletion Settings.');
        return true;
      }

      return false;
    });

    return () => unregister();
  }, [
    handleStartRecording,
    handleStopRecording,
    handlePauseRecording,
    handleResumeRecording,
    handleSaveTranscript,
    handleCopyTranscript,
    handleExportTXT,
    handleReadAloud,
    handlePauseReading,
    handleResumeReading,
    handleStopReading,
    handleClearLiveTranscript,
    registerVoiceHandler,
    announce,
    speakText
  ]);

  // Fetch learning history records
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/history/detailed?userId=${uid}`);
        if (res.ok) {
          const data = await res.json();
          const mapped = (Array.isArray(data) ? data : []).map(mapEntryToRecord);
          setHistoryRecords(mapped);
        } else {
          throw new Error('detailed not available');
        }
      } catch {
        try {
          const res = await fetch(`/api/history?userId=${uid}`);
          if (res.ok) {
            const data: LearningHistoryEntry[] = await res.json();
            const mapped = (Array.isArray(data) ? data : []).map(mapEntryToRecord);
            setHistoryRecords(mapped);
          } else {
            setHistoryRecords([]);
          }
        } catch {
          setHistoryRecords([]);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [uid]);

  // Fetch real transcripts & privacy settings
  useEffect(() => {
    if (activeTab === 'transcripts' || activeTab === 'privacy') {
      setLoadingTranscripts(true);
      Promise.all([
        fetch(`/api/transcripts?userId=${uid}`).then((r) => r.json()).catch(() => ({ transcripts: [] })),
        fetch(`/api/transcripts/settings?userId=${uid}`).then((r) => r.json()).catch(() => ({ settings: null }))
      ]).then(([tData, sData]) => {
        if (tData?.transcripts) {
          setTranscripts(tData.transcripts);
        }
        if (sData?.settings) {
          setPrivacySettings(sData.settings);
        }
      }).finally(() => {
        setLoadingTranscripts(false);
      });
    }
  }, [activeTab, uid]);

  const handleUpdatePrivacy = async (updated: Partial<TranscriptPrivacySettings>) => {
    const merged = { ...privacySettings, ...updated, userId: uid };
    setPrivacySettings(merged);
    try {
      await fetch('/api/transcripts/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged)
      });
      announce('Transcript privacy settings saved.', 'polite');
      speak('Transcript privacy settings saved.');
    } catch (e) {
      console.warn('Privacy settings error:', e);
    }
  };

  const handleClearTranscripts = async () => {
    setIsClearing(true);
    try {
      const res = await fetch(`/api/transcripts?userId=${uid}`, { method: 'DELETE' });
      if (res.ok) {
        setTranscripts([]);
        setShowClearConfirm(false);
        announce('All audio transcripts deleted successfully.', 'assertive');
        speak('All candidate voice transcripts have been deleted.');
      }
    } catch (e) {
      console.warn('Clear transcripts error:', e);
    } finally {
      setIsClearing(false);
    }
  };

  const filtered = historyRecords.filter((r) => {
    if (filterType !== 'all' && r.type !== filterType) return false;
    if (filterSubject !== 'all' && r.subject !== filterSubject) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.questionText.toLowerCase().includes(q) ||
        r.questionId.toLowerCase().includes(q) ||
        r.subject.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleExportCSV = () => {
    const headers = [
      'Record ID',
      'Timestamp',
      'Type',
      'Subject',
      'Question ID',
      'Candidate Answer',
      'Correct Answer',
      'Is Correct',
      'Time Spent (s)',
      'Input Mode'
    ];
    const rows = filtered.map((r) => [
      r.id,
      `"${r.timestamp}"`,
      r.type,
      `"${r.subject}"`,
      `"${r.questionId}"`,
      `"${r.candidateAnswer.replace(/"/g, '""')}"`,
      `"${r.correctAnswer.replace(/"/g, '""')}"`,
      r.isCorrect ? 'YES' : 'NO',
      r.timeSpentSec,
      r.inputMode
    ]);
    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SSC_MTS_Audit_Log_${user?.rollNumber || 'Candidate'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-[#1749E8] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#53627A]">Loading learning history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Title Header */}
      <div className="bg-white border border-[#E8EBF0] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#1749E8] bg-[#EEF4FF] px-3 py-1 rounded-full border border-[#D0DEFF]">
            <History className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Screen 14 of 17 · Candidate Transcript Workspace</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#172033]">
            Candidate Learning History &amp; Transcript Workspace
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B]">
            Longitudinal records of all examination attempts, real-time voice input transcripts, and privacy configuration for candidate {user?.name || 'Candidate'} ({uid}).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <AudioToolbar
            textToRead={`Candidate Transcript Workspace. Displaying activity records and voice recognition transcripts for roll number ${user?.rollNumber || uid}.`}
            label="Workspace Audio"
          />
          {activeTab === 'overview' && (
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 text-xs font-bold rounded-lg border border-[#D9E1EF] bg-white hover:bg-[#F8F9FB] text-[#172033] flex items-center gap-1.5 focus:ring-2 focus:ring-[#1749E8] shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#1749E8]" aria-hidden="true" />
              <span>Download CSV Audit</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Layout with Static Sub-Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Static Sub-Sidebar Navigation */}
        <aside
          aria-label="Transcript Workspace Sections"
          className="lg:col-span-3 bg-white border border-[#E8EBF0] rounded-xl p-3 shadow-2xs space-y-2 sticky top-4"
        >
          <div className="px-3 py-2 border-b border-[#E8EBF0] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Workspace Navigation
            </span>
          </div>

          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => setActiveTab('workspace')}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold flex items-center justify-between transition-colors ${
                activeTab === 'workspace'
                  ? 'bg-[#EEF4FF] text-[#1749E8] border border-[#D0DEFF]'
                  : 'text-[#64748B] hover:text-[#172033] hover:bg-[#F8F9FB]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 shrink-0" />
                <span>Live Dictation Workspace</span>
              </div>
              {recordingState === 'recording' && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2.5 transition-colors ${
                activeTab === 'overview'
                  ? 'bg-[#EEF4FF] text-[#1749E8] border border-[#D0DEFF]'
                  : 'text-[#64748B] hover:text-[#172033] hover:bg-[#F8F9FB]'
              }`}
            >
              <History className="w-4 h-4 shrink-0" />
              <span>Overview &amp; Audit Log</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('transcripts')}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold flex items-center justify-between transition-colors ${
                activeTab === 'transcripts'
                  ? 'bg-[#EEF4FF] text-[#1749E8] border border-[#D0DEFF]'
                  : 'text-[#64748B] hover:text-[#172033] hover:bg-[#F8F9FB]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Mic className="w-4 h-4 shrink-0" />
                <span>Voice Recognition Log</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700">
                {transcripts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2.5 transition-colors ${
                activeTab === 'privacy'
                  ? 'bg-[#EEF4FF] text-[#1749E8] border border-[#D0DEFF]'
                  : 'text-[#64748B] hover:text-[#172033] hover:bg-[#F8F9FB]'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Privacy &amp; Deletion</span>
            </button>
          </nav>
        </aside>

        {/* Content Area */}
        <div className="lg:col-span-9 space-y-6">
          {/* TAB 0: LIVE DICTATION & TRANSCRIPT WORKSPACE (Primary) */}
          {activeTab === 'workspace' && (
            <div className="space-y-6">
              {/* Header card with Live Status */}
              <div className="bg-white border border-[#E8EBF0] p-5 rounded-xl shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-extrabold text-[#172033] flex items-center gap-2">
                      <Mic className="w-5 h-5 text-[#1749E8]" />
                      Candidate Spoken Transcript Workspace
                    </h2>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Dictate notes, transcribe answers in real time, edit with keyboard, read aloud, and export or save to your candidate account.
                    </p>
                  </div>

                  {/* Status Pill */}
                  <div className="flex items-center gap-2">
                    {recordingState === 'recording' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-red-600" />
                        Listening &amp; Transcribing...
                      </span>
                    )}
                    {recordingState === 'paused' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Pause className="w-3.5 h-3.5" />
                        Dictation Paused
                      </span>
                    )}
                    {recordingState === 'idle' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Ready to Dictate
                      </span>
                    )}
                  </div>
                </div>

                {/* Primary Recording Control Bar */}
                <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-[#E8EBF0]">
                  {recordingState === 'idle' && (
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      className="px-4 py-2 text-xs font-bold rounded-lg bg-[#1749E8] hover:bg-[#123BB8] text-white flex items-center gap-2 shadow-xs transition-colors focus:ring-2 focus:ring-[#1749E8]"
                    >
                      <Mic className="w-4 h-4" />
                      <span>Start Recording</span>
                    </button>
                  )}

                  {recordingState === 'recording' && (
                    <>
                      <button
                        type="button"
                        onClick={handleStopRecording}
                        className="px-4 py-2 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 shadow-xs transition-colors focus:ring-2 focus:ring-red-600"
                      >
                        <Square className="w-4 h-4" />
                        <span>Stop Recording</span>
                      </button>
                      <button
                        type="button"
                        onClick={handlePauseRecording}
                        className="px-3.5 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 shadow-xs transition-colors focus:ring-2 focus:ring-amber-500"
                      >
                        <Pause className="w-4 h-4" />
                        <span>Pause</span>
                      </button>
                    </>
                  )}

                  {recordingState === 'paused' && (
                    <>
                      <button
                        type="button"
                        onClick={handleResumeRecording}
                        className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-xs transition-colors focus:ring-2 focus:ring-emerald-600"
                      >
                        <Play className="w-4 h-4" />
                        <span>Resume Recording</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleStopRecording}
                        className="px-4 py-2 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 shadow-xs transition-colors focus:ring-2 focus:ring-red-600"
                      >
                        <Square className="w-4 h-4" />
                        <span>Stop</span>
                      </button>
                    </>
                  )}

                  <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

                  {/* Playback Controls */}
                  {!isReadingTranscript ? (
                    <button
                      type="button"
                      onClick={handleReadAloud}
                      disabled={!liveTranscript.trim()}
                      className="px-3.5 py-2 text-xs font-bold rounded-lg border border-[#D9E1EF] bg-white hover:bg-[#F8F9FB] text-[#172033] flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors"
                    >
                      <Volume2 className="w-4 h-4 text-[#1749E8]" />
                      <span>Read Aloud</span>
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handlePauseReading}
                        className="px-3 py-2 text-xs font-bold rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 flex items-center gap-1"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause Audio</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleResumeReading}
                        className="px-3 py-2 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 flex items-center gap-1"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Resume Audio</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleStopReading}
                        className="px-3 py-2 text-xs font-bold rounded-lg bg-red-100 text-red-700 hover:bg-red-200 flex items-center gap-1"
                      >
                        <Square className="w-3.5 h-3.5" />
                        <span>Stop Audio</span>
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleClearLiveTranscript}
                    disabled={!liveTranscript}
                    className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              {/* Textarea Workspace Card */}
              <div className="bg-white border border-[#E8EBF0] p-5 rounded-xl shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="transcript-live-editor" className="text-xs font-bold uppercase tracking-wider text-[#172033] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#1749E8]" />
                    <span>Live Spoken Transcript &amp; Notes</span>
                  </label>
                  <span className="text-[11px] font-mono text-[#64748B] bg-slate-100 px-2 py-0.5 rounded">
                    {liveTranscript.trim() ? liveTranscript.trim().split(/\s+/).length : 0} words · {liveTranscript.length} chars
                  </span>
                </div>

                <textarea
                  id="transcript-live-editor"
                  value={liveTranscript}
                  onChange={(e) => setLiveTranscript(e.target.value)}
                  rows={8}
                  placeholder="Click 'Start Recording' or say 'Hey Vision, start recording'. Spoken words will appear here in real time. You can also edit and format this text directly with your keyboard."
                  aria-label="Editable Spoken Transcript Textarea"
                  className="w-full p-4 rounded-xl border border-[#D9E1EF] bg-[#F8F9FB] text-[#172033] text-sm leading-relaxed focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1749E8] font-sans resize-y"
                />

                {/* Action buttons row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveTranscript}
                      disabled={isSavingTranscript || !liveTranscript.trim()}
                      className="px-4 py-2 text-xs font-bold rounded-lg bg-[#1749E8] hover:bg-[#123BB8] text-white flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSavingTranscript ? 'Saving...' : 'Save Transcript'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyTranscript}
                      disabled={!liveTranscript.trim()}
                      className="px-3.5 py-2 text-xs font-bold rounded-lg border border-[#D9E1EF] bg-white hover:bg-[#F8F9FB] text-[#172033] flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors"
                    >
                      <Copy className="w-4 h-4 text-[#1749E8]" />
                      <span>Copy to Clipboard</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportTXT}
                      disabled={!liveTranscript.trim()}
                      className="px-3.5 py-2 text-xs font-bold rounded-lg border border-[#D9E1EF] bg-white hover:bg-[#F8F9FB] text-[#172033] flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors"
                    >
                      <Download className="w-4 h-4 text-[#1749E8]" />
                      <span>Download TXT</span>
                    </button>
                  </div>

                  <span className="text-[11px] text-[#64748B]">
                    Persisted under Roll No: <strong className="text-[#172033]">{user?.rollNumber || uid}</strong>
                  </span>
                </div>
              </div>

              {/* Spoken Voice Commands Cheat-Sheet */}
              <div className="bg-[#EEF4FF] border border-[#D0DEFF] p-4 rounded-xl text-xs space-y-2">
                <span className="font-bold text-[#1749E8] uppercase tracking-wider block">
                  Transcript Workspace Voice Commands
                </span>
                <p className="text-[#334155] leading-relaxed">
                  Say <strong>"Hey Vision"</strong> followed by any of these commands, or press <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#D0DEFF] font-sans">Ctrl+C</kbd> to copy:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1 font-mono text-[11px] text-[#1E3A8A]">
                  <div className="bg-white/80 p-2 rounded border border-[#D0DEFF]">
                    "Start recording" / "Start dictation"
                  </div>
                  <div className="bg-white/80 p-2 rounded border border-[#D0DEFF]">
                    "Stop recording" (ends transcription)
                  </div>
                  <div className="bg-white/80 p-2 rounded border border-[#D0DEFF]">
                    "Pause recording" / "Resume recording"
                  </div>
                  <div className="bg-white/80 p-2 rounded border border-[#D0DEFF]">
                    "Copy" / "Copy transcript" (also Ctrl+C)
                  </div>
                  <div className="bg-white/80 p-2 rounded border border-[#D0DEFF]">
                    "Save transcript" / "Export transcript"
                  </div>
                  <div className="bg-white/80 p-2 rounded border border-[#D0DEFF]">
                    "Read transcript aloud" / "Stop reading"
                  </div>
                  <div className="bg-white/80 p-2 rounded border border-[#D0DEFF]">
                    "Clear transcript"
                  </div>
                  <div className="bg-white/80 p-2 rounded border border-[#D0DEFF]">
                    "Help" / "Voice commands"
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: OVERVIEW & AUDIT LOG */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Filter Toolbar */}
              <div className="bg-white border border-[#E8EBF0] p-4 rounded-xl shadow-2xs flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#64748B]" aria-hidden="true" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by question text or ID..."
                    aria-label="Search learning history"
                    className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-lg border border-[#D9E1EF] bg-[#F8F9FB] text-[#172033] placeholder:text-[#64748B] focus:outline-hidden focus:ring-2 focus:ring-[#1749E8]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="text-xs font-semibold px-3 py-2 rounded-lg bg-[#F8F9FB] border border-[#D9E1EF] text-[#172033] focus:outline-hidden focus:ring-2 focus:ring-[#1749E8]"
                    aria-label="Filter by activity type"
                  >
                    <option value="all">All Activity Types</option>
                    <option value="Voice Practice">Voice Practice</option>
                    <option value="Pilot Demo">Pilot Demo</option>
                    <option value="Mock Exam">Mock Exam</option>
                    <option value="SM-2 Revision">SM-2 Revision</option>
                    <option value="AI Tutor">AI Tutor</option>
                  </select>

                  <select
                    value={filterSubject}
                    onChange={(e) => setFilterSubject(e.target.value)}
                    className="text-xs font-semibold px-3 py-2 rounded-lg bg-[#F8F9FB] border border-[#D9E1EF] text-[#172033] focus:outline-hidden focus:ring-2 focus:ring-[#1749E8]"
                    aria-label="Filter by subject"
                  >
                    <option value="all">All 4 Subjects</option>
                    <option value="Numerical and Mathematical Ability">Numerical Ability</option>
                    <option value="Reasoning Ability and Problem Solving">Reasoning Ability</option>
                    <option value="General Awareness">General Awareness</option>
                    <option value="English Language and Comprehension">English Language</option>
                  </select>
                </div>
              </div>

              {/* Audit Log Table */}
              <div className="bg-white border border-[#E8EBF0] rounded-xl shadow-2xs overflow-hidden">
                {historyRecords.length === 0 ? (
                  <div className="p-10 text-center text-[#64748B]">
                    <History className="w-10 h-10 mx-auto mb-3 opacity-40" aria-hidden="true" />
                    <p className="text-sm font-semibold text-[#172033]">No learning history yet.</p>
                    <p className="text-xs mt-1">Complete practice sessions or mock exams to see your history.</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="p-10 text-center text-[#64748B]">
                    <Search className="w-10 h-10 mx-auto mb-3 opacity-40" aria-hidden="true" />
                    <p className="text-sm font-semibold text-[#172033]">No records match your filters.</p>
                    <p className="text-xs mt-1">Try adjusting the search or filter options.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <caption className="sr-only">Candidate Learning History Audit Log</caption>
                      <thead className="bg-[#F8F9FB] text-[#53627A] uppercase text-[11px] font-bold border-b border-[#E8EBF0]">
                        <tr>
                          <th scope="col" className="p-3.5">Timestamp / Mode</th>
                          <th scope="col" className="p-3.5">Activity Type</th>
                          <th scope="col" className="p-3.5">Question ID &amp; Subject</th>
                          <th scope="col" className="p-3.5">Candidate Response</th>
                          <th scope="col" className="p-3.5">Reference / Score</th>
                          <th scope="col" className="p-3.5">Result</th>
                          <th scope="col" className="p-3.5">Pace</th>
                          <th scope="col" className="p-3.5 text-right">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8EBF0] font-medium">
                        {filtered.map((r) => (
                          <tr key={r.id} className="hover:bg-[#F8F9FB] transition-colors">
                            <td className="p-3.5 whitespace-nowrap">
                              <div className="font-semibold text-[#172033]">{r.timestamp}</div>
                              <div className="text-[11px] text-[#64748B] flex items-center gap-1 mt-0.5">
                                {r.inputMode === 'Voice' && (
                                  <Mic className="w-3 h-3 text-[#1749E8]" aria-hidden="true" />
                                )}
                                <span>{r.inputMode}</span>
                              </div>
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EEF4FF] text-[#1749E8] border border-[#D0DEFF]">
                                {r.type}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <div className="font-mono font-bold text-[#1749E8]">{r.questionId}</div>
                              <div className="text-[11px] text-[#64748B]">{r.subject}</div>
                            </td>
                            <td className="p-3.5 max-w-[200px] truncate text-[#172033]">
                              {r.candidateAnswer}
                            </td>
                            <td className="p-3.5 max-w-[160px] truncate font-semibold text-[#53627A]">
                              {r.correctAnswer}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              {r.isCorrect ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#15803D]">
                                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Completed / Correct</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#DC2626]">
                                  <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Incorrect</span>
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 font-mono text-[#53627A]">{r.timeSpentSec}s</td>
                            <td className="p-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedRecord(r)}
                                className="px-3 py-1 text-xs font-bold text-[#1749E8] bg-[#EEF4FF] border border-[#D0DEFF] rounded-lg hover:bg-[#1749E8] hover:text-white focus:ring-2 focus:ring-[#1749E8] transition-colors"
                              >
                                Inspect
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: VOICE RECOGNITION TRANSCRIPTS (Section 12) */}
          {activeTab === 'transcripts' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#E8EBF0] p-5 rounded-xl shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-extrabold text-[#172033] flex items-center gap-2">
                    <Mic className="w-5 h-5 text-[#1749E8]" />
                    Real-Time Speech-Recognition Transcripts Log
                  </h2>
                  <span className="text-xs font-bold text-[#53627A] bg-[#F8F9FB] px-2.5 py-1 rounded-md border border-[#E8EBF0]">
                    {transcripts.length} Captured Transcripts
                  </span>
                </div>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Every voice query captured by the browser speech-recognition engine during your candidate sessions is recorded below. No sample or mock records are fabricated.
                </p>
              </div>

              <div className="bg-white border border-[#E8EBF0] rounded-xl shadow-2xs overflow-hidden">
                {loadingTranscripts ? (
                  <div className="p-8 text-center text-slate-500 text-xs">Loading speech transcripts...</div>
                ) : transcripts.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 space-y-2">
                    <Mic className="w-10 h-10 mx-auto text-slate-400 opacity-50" />
                    <p className="text-sm font-bold text-slate-800">No Speech Transcripts Recorded Yet</p>
                    <p className="text-xs max-w-md mx-auto text-slate-500">
                      When you speak commands, select subjects, or answer questions in Voice Practice and Mock Examinations with microphone enabled, transcripts will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <caption className="sr-only">Voice Recognition Log Table</caption>
                      <thead className="bg-[#F8F9FB] text-[#53627A] uppercase text-[11px] font-bold border-b border-[#E8EBF0]">
                        <tr>
                          <th scope="col" className="p-3.5">Timestamp</th>
                          <th scope="col" className="p-3.5">Session Type</th>
                          <th scope="col" className="p-3.5">Spoken Transcript</th>
                          <th scope="col" className="p-3.5">Confidence</th>
                          <th scope="col" className="p-3.5">Recognized Intent</th>
                          <th scope="col" className="p-3.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8EBF0] font-medium">
                        {transcripts.map((t) => (
                          <tr key={t.id} className="hover:bg-[#F8F9FB]">
                            <td className="p-3.5 whitespace-nowrap text-slate-600 font-mono">
                              {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold text-[11px] border border-blue-200">
                                {t.sessionType}
                              </span>
                            </td>
                            <td className="p-3.5 font-semibold text-slate-900 max-w-xs">
                              "{t.rawTranscript}"
                            </td>
                            <td className="p-3.5 whitespace-nowrap font-mono font-bold text-emerald-700">
                              {Math.round((t.confidence ?? 0.95) * 100)}%
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px]">
                                {t.recognizedIntent || 'voice_answer'}
                              </span>
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              {t.wasConsumed ? (
                                <span className="text-[11px] font-bold text-emerald-700">● Evaluated</span>
                              ) : (
                                <span className="text-[11px] font-semibold text-slate-400">● Unmatched</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PRIVACY & DELETION SETTINGS (Section 12) */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#E8EBF0] p-6 rounded-xl shadow-2xs space-y-6">
                <div className="border-b border-[#E8EBF0] pb-4">
                  <h2 className="text-base font-extrabold text-[#172033] flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    Transcript Privacy, Storage &amp; Deletion Settings
                  </h2>
                  <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                    You have total ownership and sovereign control over your voice data under the RPwD Act 2016 and India's Digital Personal Data Protection (DPDP) Act.
                  </p>
                </div>

                {/* Storage Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-[#E8EBF0]">
                  <div>
                    <span className="font-bold text-sm text-[#172033] block">
                      Record &amp; Store Voice Recognition Transcripts
                    </span>
                    <span className="text-xs text-[#64748B]">
                      When enabled, recognized speech transcripts are stored in your candidate account to generate diagnostic voice reports. When disabled, transcripts are processed in-memory and immediately discarded.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUpdatePrivacy({ storeTranscripts: !privacySettings.storeTranscripts })}
                    aria-pressed={privacySettings.storeTranscripts}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-2 shrink-0 ${
                      privacySettings.storeTranscripts
                        ? 'bg-[#1749E8] text-white shadow-2xs'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {privacySettings.storeTranscripts ? (
                      <>
                        <ToggleRight className="w-5 h-5" />
                        <span>Storage Enabled</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-5 h-5" />
                        <span>Storage Disabled</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Auto-Deletion Policy */}
                <div className="space-y-2 max-w-md">
                  <label htmlFor="transcript-retention" className="block text-xs font-bold uppercase tracking-wider text-[#172033]">
                    Automated Retention &amp; Deletion Period:
                  </label>
                  <select
                    id="transcript-retention"
                    value={privacySettings.autoDeleteDays}
                    onChange={(e) => handleUpdatePrivacy({ autoDeleteDays: Number(e.target.value) })}
                    className="w-full text-xs font-semibold p-2.5 rounded-lg border border-[#D9E1EF] bg-slate-50 text-[#172033] focus:ring-2 focus:ring-[#1749E8]"
                  >
                    <option value={7}>Automatically purge after 7 days</option>
                    <option value={30}>Automatically purge after 30 days (Recommended)</option>
                    <option value={90}>Automatically purge after 90 days</option>
                    <option value={0}>Retain until manually cleared (Never purge)</option>
                  </select>
                </div>

                {/* Permanent Deletion Action */}
                <div className="pt-4 border-t border-red-200 p-4 rounded-xl bg-red-50/60 border space-y-3">
                  <div className="flex items-center gap-2 text-red-900 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>Permanent Deletion of Transcript History</span>
                  </div>
                  <p className="text-xs text-red-800 leading-relaxed">
                    Permanently wipe all captured browser speech transcripts associated with candidate {user?.rollNumber || uid}. This action is irreversible.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-2xs inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All Transcript History</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="clear-dialog-title"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-300 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 id="clear-dialog-title" className="text-base font-extrabold text-slate-900 flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Confirm Transcript History Deletion
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently clear all {transcripts.length} recorded speech transcripts? This will remove all audio logs from your candidate database record.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearing}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearTranscripts}
                disabled={isClearing}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg inline-flex items-center gap-1.5"
              >
                {isClearing ? 'Deleting...' : 'Yes, Delete All Transcripts'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Modal */}
      {selectedRecord && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-inspect-title"
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white border border-[#E8EBF0] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8EBF0] pb-3">
              <h2 id="audit-inspect-title" className="text-base font-bold text-[#172033]">
                Attempt Audit: {selectedRecord.questionId}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="text-[#64748B] hover:text-[#172033] text-sm font-bold px-2 py-1 rounded-lg hover:bg-[#F8F9FB]"
                aria-label="Close audit dialog"
              >
                ✕ Close
              </button>
            </div>

            <div className="text-xs space-y-1.5 text-[#53627A]">
              <div>
                Subject: <strong className="text-[#172033]">{selectedRecord.subject}</strong>
              </div>
              <div>
                Input Modality: <strong className="text-[#172033]">{selectedRecord.inputMode}</strong>
              </div>
              <div>
                Pace: <strong className="text-[#172033]">{selectedRecord.timeSpentSec} seconds</strong>
              </div>
            </div>

            <div className="p-3.5 bg-[#F8F9FB] rounded-xl border border-[#E8EBF0] text-xs">
              <div className="font-bold text-[#172033] mb-1">Summary / Question Details:</div>
              <p className="text-[#53627A] leading-relaxed">{selectedRecord.questionText}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#F8F9FB] border border-[#E8EBF0] rounded-xl">
                <div className="font-bold text-[#64748B]">Candidate Response:</div>
                <div className="font-mono font-bold mt-1 text-[#172033]">
                  {selectedRecord.candidateAnswer}
                </div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="font-bold text-[#15803D]">Reference / Key:</div>
                <div className="font-mono font-bold mt-1 text-[#172033]">
                  {selectedRecord.correctAnswer}
                </div>
              </div>
            </div>

            <div className="text-right pt-2">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-[#1749E8] hover:bg-[#123BB8] text-white font-bold text-xs rounded-lg focus:ring-2 focus:ring-[#1749E8]"
              >
                Close Audit Dialog
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
