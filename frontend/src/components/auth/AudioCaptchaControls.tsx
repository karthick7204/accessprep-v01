import React from 'react';
import { Volume2, RotateCcw, Mic, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatCaptchaForSpeech } from '../../utils/authVoiceUtils.ts';

export interface CaptchaChallengeData {
  challengeId: string;
  phrase: string;
  expiresAt: number;
}

interface AudioCaptchaControlsProps {
  id: string;
  challenge: CaptchaChallengeData | null;
  loadingChallenge: boolean;
  captchaInput: string;
  onCaptchaInputChange: (val: string) => void;
  onPlayAudio: () => void;
  onRefreshChallenge: () => void;
  onStartVoiceCapture?: () => void;
  isCapturingVoice?: boolean;
  isVerified?: boolean;
  error?: string | null;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onInputFocus?: () => void;
  onInputBlur?: () => void;
}

export function AudioCaptchaControls({
  id,
  challenge,
  loadingChallenge,
  captchaInput,
  onCaptchaInputChange,
  onPlayAudio,
  onRefreshChallenge,
  onStartVoiceCapture,
  isCapturingVoice = false,
  isVerified = false,
  error,
  inputRef,
  onInputFocus,
  onInputBlur,
}: AudioCaptchaControlsProps) {
  const explanationId = `${id}-explanation`;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [explanationId, errorId].filter(Boolean).join(' ');

  const spokenPreview = challenge ? formatCaptchaForSpeech(challenge.phrase) : '';

  return (
    <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/80 border-2 border-[#D9E1EF] dark:border-slate-700 space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#1749E8] dark:text-blue-400 shrink-0" aria-hidden="true" />
          <label
            htmlFor={id}
            className="text-sm font-bold text-[#172033] dark:text-slate-100"
          >
            Audio Verification Code (CAPTCHA){' '}
            <span className="text-red-600 dark:text-red-400 font-extrabold" aria-hidden="true">
              *
            </span>
          </label>
        </div>

        <button
          type="button"
          onClick={onRefreshChallenge}
          disabled={loadingChallenge}
          aria-label="Refresh Audio CAPTCHA code"
          className="px-2.5 py-1 min-h-[34px] rounded-lg text-xs font-bold text-[#1749E8] dark:text-blue-300 bg-white dark:bg-slate-900 hover:bg-[#EEF4FF] border border-[#D9E1EF] dark:border-slate-600 inline-flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1749E8] disabled:opacity-50"
        >
          <RotateCcw
            className={`w-3.5 h-3.5 ${loadingChallenge ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span>Refresh CAPTCHA</span>
        </button>
      </div>

      {/* Accessible explanation of what the CAPTCHA does */}
      <p id={explanationId} className="text-xs text-[#53627A] dark:text-slate-300 leading-relaxed">
        Audio CAPTCHA verifies human access. Blind candidates can press <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-[#1749E8] rounded font-bold font-mono text-[11px] text-[#1749E8]">C</kbd> to auto-write the verification code, press <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-[#D9E1EF] rounded font-mono text-[11px]">R</kbd> to play digits aloud, or type the digits below. Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-[#D9E1EF] rounded font-mono text-[11px]">K</kbd> to hear all shortcuts.
      </p>

      {/* Visual + Audio Code Display & Playback Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <div
          className="sm:col-span-5 p-3 rounded-xl bg-white dark:bg-slate-900 border-2 border-[#D9E1EF] dark:border-slate-600 text-center"
          aria-label={
            challenge
              ? `Current four-digit verification code: ${spokenPreview}`
              : 'Loading verification code'
          }
        >
          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#53627A] dark:text-slate-400">
            Verification Digits
          </span>
          <span className="block text-2xl font-mono font-extrabold tracking-widest text-[#172033] dark:text-white mt-0.5 select-all">
            {challenge ? challenge.phrase : '• • • •'}
          </span>
        </div>

        <div className="sm:col-span-7 flex flex-wrap sm:flex-nowrap gap-2">
          <button
            type="button"
            onClick={onPlayAudio}
            disabled={!challenge}
            aria-label="Play Audio CAPTCHA digits aloud"
            className="flex-1 min-h-[46px] px-3 py-2 rounded-xl bg-[#EEF4FF] dark:bg-slate-700 hover:bg-blue-100 text-[#1749E8] dark:text-blue-200 border-2 border-[#D9E1EF] dark:border-slate-500 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1749E8] disabled:opacity-50"
          >
            <Volume2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Play Audio CAPTCHA</span>
          </button>

          {onStartVoiceCapture && (
            <button
              type="button"
              onClick={onStartVoiceCapture}
              disabled={!challenge}
              aria-pressed={isCapturingVoice}
              aria-label={isCapturingVoice ? 'Listening for spoken CAPTCHA digits' : 'Speak CAPTCHA digits using microphone'}
              className={`flex-1 min-h-[46px] px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#6241C8] disabled:opacity-50 ${
                isCapturingVoice
                  ? 'bg-red-600 text-white border-red-700 animate-pulse'
                  : 'bg-white dark:bg-slate-900 hover:bg-[#EEF4FF] text-[#172033] dark:text-slate-100 border-[#D9E1EF] dark:border-slate-600'
              }`}
            >
              <Mic className="w-4 h-4 shrink-0 text-[#1749E8] dark:text-blue-300" aria-hidden="true" />
              <span>{isCapturingVoice ? 'Listening...' : 'Speak Digits'}</span>
            </button>
          )}
        </div>
      </div>

      {/* CAPTCHA Response Input */}
      <div className="space-y-1.5">
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            id={id}
            name="captchaResponse"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            data-challenge-phrase={challenge ? challenge.phrase : ''}
            required
            value={captchaInput}
            onChange={(e) => onCaptchaInputChange(e.target.value)}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
            placeholder="Enter the 4 digits (e.g. 5832)"
            aria-invalid={error ? 'true' : undefined}
            aria-errormessage={errorId}
            aria-describedby={describedBy}
            className={`w-full min-h-[48px] px-3.5 py-2.5 text-base font-mono tracking-wider bg-white dark:bg-slate-900 border-2 rounded-xl text-[#172033] dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-[#6241C8] ${
              error
                ? 'border-red-600 bg-red-50/30 dark:border-red-500'
                : isVerified
                ? 'border-emerald-600 bg-emerald-50/20'
                : 'border-[#D9E1EF] dark:border-slate-600 focus:border-[#1749E8]'
            }`}
          />

          {isVerified && !error && (
            <span className="absolute right-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              <span>Verified</span>
            </span>
          )}
        </div>

        {error && (
          <p
            id={errorId}
            role="alert"
            className="text-xs font-semibold text-red-700 dark:text-red-300 flex items-center gap-1.5 pt-0.5"
          >
            <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}
      </div>
    </div>
  );
}
