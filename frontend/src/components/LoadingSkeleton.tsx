import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-[#E8EBF0] animate-pulse rounded ${className}`}
      aria-hidden="true"
    />
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="bg-white border border-[#E8EBF0] rounded-xl p-5 space-y-3" aria-hidden="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function SubjectCardSkeleton() {
  return (
    <div className="bg-white border border-[#E8EBF0] rounded-xl p-5 space-y-3" aria-hidden="true">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-8 rounded-lg" />
        <Skeleton className="h-8 rounded-lg" />
      </div>
    </div>
  );
}

export function ActivityRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#E8EBF0] last:border-0" aria-hidden="true">
      <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-5 w-14 rounded-full" />
    </div>
  );
}

interface LoadingSkeletonProps {
  label?: string;
}

export function LoadingSkeleton({ label = 'Loading...' }: LoadingSkeletonProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <MetricCardSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => <SubjectCardSkeleton key={i} />)}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

