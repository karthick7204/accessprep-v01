import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2, Check, Edit2, AlertCircle } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext.tsx';

interface VoiceInputButtonProps {
  onTranscriptConfirmed: (transcript: string) => void;
  onMicError?: (message: string, errorName?: string) => void;
  label?: string;
  contextHint?: string;
}

export function VoiceInputButton({
  onTranscriptConfirmed,
  onMicError,
  label = 'Voice Input (Alt+M)',
  contextHint = 'Say your answer option (e.g. "Select Option A") or question text'
}: VoiceInputButtonProps) {
  const { announce } = useAccessibility();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingTranscript, setPendingTranscript] = useState<string | null>(null);
  const [editedTranscript, setEditedTranscript] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [whisperAvailable, setWhisperAvailable] = useState<boolean | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    fetch('/api/audio/status')
      .then(r => r.json())
      .then(data => setWhisperAvailable(data.whisperAvailable))
      .catch(() => setWhisperAvailable(false));
  }, []);

  const startRecording = async () => {
    setErrorMsg(null);
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone audio recording not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        await processAudio(audioChunksRef.current);
      };

      mediaRecorder.start(250); // slices of 250ms
      setIsRecording(true);
      announce('Microphone recording started. Speak your answer clearly.', 'assertive');
    } catch (err: any) {
      console.error('Microphone error:', err);
      const msg = err.name === 'NotAllowedError'
        ? 'Microphone permission denied. Please allow microphone access or use manual input.'
        : err.message || 'Could not initialize microphone recording.';
      setErrorMsg(msg);
      announce(msg, 'assertive');
      onMicError?.(msg, err.name);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      announce('Recording stopped. Processing speech with Whisper...', 'polite');
    }
  };

  const processAudio = async (chunks: Blob[]) => {
    if (chunks.length === 0) {
      setErrorMsg('No audio data captured. Please try speaking again.');
      return;
    }

    setIsProcessing(true);
    const audioBlob = new Blob(chunks, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    try {
      const response = await fetch('/api/audio/transcribe', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      // Handle honest Whisper unavailability
      if (data.success === false && data.whisperAvailable === false && data.requiresManualInput === true) {
        const msg = 'Speech recognition (Whisper) is not available on this server. Please select your answer using the keyboard or click the option buttons below.';
        setErrorMsg(msg);
        announce(msg, 'assertive');
        setIsProcessing(false);
        return;
      }

      if (data.success && data.transcript !== undefined) {
        if (data.transcript === '') {
          setErrorMsg('No speech detected in recording. Please try again and speak clearly into the microphone.');
        } else {
          setPendingTranscript(data.transcript);
          setEditedTranscript(data.transcript);
          announce(`Transcript received: "${data.transcript}". Please confirm or edit.`, 'polite');
        }
      } else {
        const msg = data.error || 'Failed to transcribe audio.';
        setErrorMsg(msg);
        announce(msg, 'assertive');
      }
    } catch (err: any) {
      console.warn('Transcription service error:', err.message);
      const msg = 'Unable to connect to speech recognition service. Please check the server is running, or use manual input.';
      setErrorMsg(msg);
      announce(msg, 'assertive');
      onMicError?.(msg, err.name);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    const finalVal = isEditing ? editedTranscript : pendingTranscript;
    if (finalVal) {
      onTranscriptConfirmed(finalVal.trim());
      announce(`Confirmed: "${finalVal.trim()}"`, 'polite');
    }
    setPendingTranscript(null);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setPendingTranscript(null);
    setIsEditing(false);
    announce('Voice transcript discarded.', 'polite');
  };

  return (
    <div className="relative inline-block">
      {/* Whisper unavailable banner */}
      {whisperAvailable === false && (
        <div role="status" className="text-xs text-amber-700 bg-amber-50 border border-amber-300 px-3 py-1.5 rounded mb-2 flex items-center gap-2">
          <span aria-hidden="true">⚠️</span>
          <span>Voice recognition offline — please use keyboard or click to select answers</span>
        </div>
      )}

      {!isRecording ? (
        <button
          type="button"
          onClick={startRecording}
          disabled={isProcessing}
          aria-label={label}
          title={label}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-slate-800 bg-white hover:bg-slate-50 border-2 border-slate-300 rounded-lg shadow-xs transition-all active:scale-95 disabled:opacity-50"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 text-blue-700 animate-spin" />
          ) : (
            <Mic className="w-4 h-4 text-blue-700" />
          )}
          <span>{isProcessing ? 'Transcribing...' : 'Push to Talk'}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={stopRecording}
          aria-label="Stop recording and transcribe speech"
          title="Stop recording"
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md animate-pulse ring-4 ring-red-200 transition-all"
        >
          <MicOff className="w-4 h-4" />
          <span>Stop Recording</span>
        </button>
      )}

      {/* Manual input fallback notice */}
      <p className="text-xs text-slate-500 mt-1 text-center">
        Voice input optional — keyboard/click selection always available
      </p>

      {/* Error Notice */}
      {errorMsg && (
        <div
          role="alert"
          className="mt-2 p-2.5 bg-red-50 border-l-4 border-red-600 text-red-800 text-xs rounded-r-md flex items-start gap-2 max-w-sm"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Microphone Error</p>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Candidate Transcript Review Modal / Card */}
      {pendingTranscript && (
        <div
          role="dialog"
          aria-labelledby="transcript-review-title"
          className="absolute z-50 left-0 mt-2 w-80 sm:w-96 p-4 bg-white border-2 border-blue-600 rounded-lg shadow-xl text-slate-900"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
            <h4 id="transcript-review-title" className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-blue-700" />
              Review Speech Transcript
            </h4>
            <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">
              Whisper STT
            </span>
          </div>

          <p className="text-xs text-slate-600 mb-2">{contextHint}</p>

          {!isEditing ? (
            <div className="p-3 bg-slate-50 border border-slate-300 rounded-md text-sm font-medium text-slate-800 mb-3">
              "{pendingTranscript}"
            </div>
          ) : (
            <textarea
              value={editedTranscript}
              onChange={(e) => setEditedTranscript(e.target.value)}
              aria-label="Edit speech transcript"
              rows={2}
              className="w-full p-2 text-sm border-2 border-blue-600 rounded-md mb-3 focus:outline-hidden"
              autoFocus
            />
          )}

          <div className="flex items-center justify-between gap-2">
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-300"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Text
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md"
              >
                Cancel Edit
              </button>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-md shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                Confirm &amp; Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
