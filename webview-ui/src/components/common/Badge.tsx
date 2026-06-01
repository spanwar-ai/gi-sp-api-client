import React from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-vscode-badge-bg text-vscode-badge-fg',
    success: 'bg-green-700 text-green-100',
    warning: 'bg-yellow-700 text-yellow-100',
    error: 'bg-red-700 text-red-100',
    info: 'bg-blue-700 text-blue-100',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
