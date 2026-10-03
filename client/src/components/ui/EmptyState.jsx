import React from 'react';
import { Button } from './Button';
import { Inbox } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No records found',
  description = 'There are no active records matching your criteria.',
  actionText = null,
  onAction = null,
  className = '',
}) => {
  return (
    <div className={`p-8 text-center bg-surface border border-app-border rounded-md ${className}`}>
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#FAF9F6] border border-app-border flex items-center justify-center text-muted-text">
        <Icon className="w-6 h-6 text-muted-text" />
      </div>
      <h3 className="text-sm font-bold font-mono text-navy-ink uppercase tracking-wide">
        {title}
      </h3>
      <p className="text-xs text-muted-text mt-1 max-w-sm mx-auto">
        {description}
      </p>
      {actionText && onAction && (
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={onAction}>
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
};
