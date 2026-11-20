import React from 'react';
import { Volume2, VolumeX, Play, Pause, Square, FastForward } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext.tsx';

interface AudioToolbarProps {
  textToRead?: string;
  label?: string;
}

export function AudioToolbar({ textToRead, label = 'Audio Read Aloud' }: AudioToolbarProps) {
  const { speakText, stopSpeaking, isSpeaking, settings, updateSettings, announce } = useAccessibility();

  const handlePlayPause = () => {
    if (isSpeaking) {
      stopSpeaking();
      announce('Audio playback paused or stopped.', 'polite');
    } else if (textToRead) {
      speakText(textToRead);
      announce('Reading content aloud.', 'polite');
    }
  };

  const handleCycleSpeed = () => {
    const speeds = [0.75, 1.0, 1.25, 1.5];
    const currentIndex = speeds.indexOf(settings.speechRate || 1.0);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    updateSettings({ speechRate: nextSpeed });
    announce(`Speech rate set to ${nextSpeed}x`, 'polite');
  };

  return (
    <div
      role="toolbar"
      aria-label={label}
      className="inline-flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-lg border border-slate-300 shadow-xs"
    >
      <button
        type="button"
        onClick={handlePlayPause}
        aria-label={isSpeaking ? 'Pause reading aloud' : 'Read aloud'}
        title={isSpeaking ? 'Pause reading aloud' : 'Read aloud'}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
          isSpeaking
            ? 'bg-blue-700 text-white animate-pulse'
            : 'bg-white text-slate-800 hover:bg-slate-50 border border-slate-200'
        }`}
      >
        {isSpeaking ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-blue-700" />}
        <span>{isSpeaking ? 'Stop Reading' : 'Read Aloud'}</span>
      </button>

      {isSpeaking && (
        <button
          type="button"
          onClick={stopSpeaking}
          aria-label="Stop audio read-aloud"
          title="Stop reading aloud"
          className="p-1.5 text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md"
        >
          <Square className="w-3.5 h-3.5 text-red-600 fill-red-600" />
        </button>
      )}

      <button
        type="button"
        onClick={handleCycleSpeed}
        aria-label={`Current speech rate ${settings.speechRate || 1.0}x. Click to change.`}
        title="Cycle speech speed (0.75x, 1x, 1.25x, 1.5x)"
        className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md inline-flex items-center gap-1"
      >
        <FastForward className="w-3.5 h-3.5 text-slate-500" />
        <span>{settings.speechRate || 1.0}x</span>
      </button>
    </div>
  );
}
