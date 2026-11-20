import React from 'react';

interface AccessibleProgressBarProps {
  value: number; // 0-100
  max?: number;
  label: string;
  colorClass?: string;
  showValue?: boolean;
  size?: 'sm' | 'md';
  srDescription?: string;
}

export function AccessibleProgressBar({
  value,
  max = 100,
  label,
  colorClass = 'bg-[#1749E8]',
  showValue = true,
  size = 'sm',
  srDescription,
}: AccessibleProgressBarProps) {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  const height = size === 'sm' ? 'h-1.5' : 'h-2';

  return (
    <div>
      {showValue && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-[#64748B]">{label}</span>
          <span className="text-xs font-bold text-[#172033]">{pct}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={srDescription || `${label}: ${pct}%`}
        className={`w-full bg-[#E8EBF0] rounded-full overflow-hidden ${height}`}
      >
        <div
          className={`${height} ${colorClass} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="sr-only">{srDescription || `${label} is ${pct}% complete`}</span>
    </div>
  );
}

