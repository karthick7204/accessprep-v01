/**
 * ACCESSPREP-X — AI Tutor API Key Configuration Modal
 */

import React from 'react';

export interface TutorApiKeyModalProps {
  isOpen: boolean;
  apiKeyInput: string;
  onChangeApiKey: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function TutorApiKeyModal({
  isOpen,
  apiKeyInput,
  onChangeApiKey,
  onSave,
  onClose
}: TutorApiKeyModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutor-apikey-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <h2 id="tutor-apikey-title" className="text-lg font-bold text-slate-900">
          Configure Gemini API Key
        </h2>
        <input
          type="password"
          value={apiKeyInput}
          onChange={(e) => onChangeApiKey(e.target.value)}
          placeholder="Paste your Gemini API Key..."
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#1749E8] rounded-lg"
          >
            Save Key
          </button>
        </div>
      </div>
    </div>
  );
}
