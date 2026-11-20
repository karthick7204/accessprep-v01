/**
 * ACCESSPREP-X — Transcript Export Toolbar Component
 */

import React from 'react';
import type { TranscriptExportFormat } from '../types/transcript.types.ts';

export interface TranscriptExportBarProps {
  onExport: (format: TranscriptExportFormat) => void;
  disabled?: boolean;
}

export function TranscriptExportBar({ onExport, disabled = false }: TranscriptExportBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Export Transcript Options">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onExport('txt')}
        className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md"
      >
        Export TXT
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onExport('json')}
        className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md"
      >
        Export JSON
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onExport('csv')}
        className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md"
      >
        Export CSV
      </button>
    </div>
  );
}
