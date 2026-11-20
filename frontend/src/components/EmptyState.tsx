import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center" role="status">
      <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[#F8F9FB] border border-[#E8EBF0] text-[#64748B] mb-3">
        {icon}
      </div>
      <p className="text-sm font-semibold text-[#172033] mb-1">{title}</p>
      <p className="text-xs text-[#64748B] max-w-xs">{description}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-[#1749E8] text-white hover:bg-[#123BB8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1749E8] focus:ring-offset-2"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

