/**
 * ACCESSPREP-X — Mock Exam Confirmation Modal Component
 */

import React from 'react';

export interface MockExamConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  isProcessing?: boolean;
  variant?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export function MockExamConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  isProcessing = false,
  variant = 'primary',
  onConfirm,
  onCancel
}: MockExamConfirmModalProps) {
  if (!isOpen) return null;

  const confirmClasses =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
      : 'bg-[#1749E8] hover:bg-[#123BB8] text-white focus:ring-blue-500';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mock-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <h2 id="mock-modal-title" className="text-lg font-bold text-slate-900">
          {title}
        </h2>
        <p className="text-sm text-slate-600">{description}</p>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold rounded-lg focus:outline-none focus:ring-2 ${confirmClasses}`}
          >
            {isProcessing ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
