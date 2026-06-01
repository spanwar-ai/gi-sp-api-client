import React from 'react';
import { cn } from '../../utils/cn';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <h3 className="text-sm font-medium text-vscode-fg mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-vscode-fg opacity-60 mb-4 max-w-xs">{description}</p>
      )}
      {action}
    </div>
  );
}
