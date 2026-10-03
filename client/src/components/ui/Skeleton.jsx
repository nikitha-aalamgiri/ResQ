import React from 'react';

export const Skeleton = ({ className = '', variant = 'rect' }) => {
  const base = 'animate-pulse bg-[#E2DED6]/70';
  const rounded = variant === 'circle' ? 'rounded-full' : 'rounded-md';
  return <div className={`${base} ${rounded} ${className}`} />;
};

export const CardSkeleton = () => {
  return (
    <div className="p-4 bg-surface border border-app-border rounded-md space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-3 w-48" />
      <div className="space-y-1.5 pt-2">
        <Skeleton className="h-2.5 w-full" />
        <Skeleton className="h-2.5 w-5/6" />
      </div>
    </div>
  );
};
